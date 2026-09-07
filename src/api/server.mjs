import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createSDLM } from '../sd_lm.mjs';
import { SessionStore } from '../sessions/session-store.mjs';
import { validateChat, completeChat, writeStream, MODEL_INFO } from './chat.mjs';
import { installUploadedPack } from './circuit-packs.mjs';
import { EXAMPLES } from '../cli/examples.mjs';

function readJSON(request) {
  return new Promise((resolve, reject) => {
    let size = 0, failed = false;
    const chunks = [];
    request.on('data', chunk => {
      size += chunk.length;
      if (size > 1024 * 1024) {
        if (!failed) reject(Object.assign(new Error('Request body exceeds 1 MiB'), { statusCode: 413 }));
        failed = true;
        chunks.length = 0;
      } else if (!failed) chunks.push(chunk);
    });
    request.on('end', () => {
      if (failed) return;
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a JSON object');
        resolve(body);
      }
      catch { reject(new Error('Invalid JSON request body')); }
    });
    request.on('error', reject);
  });
}

function authorized(header, key) {
  if (!key) return true;
  const digest = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(header ?? ''), digest(`Bearer ${key}`));
}

export function createApiServer({ sessions = 'sessions', runtimeOptions = {}, apiKey = '', maxPending = 16 } = {}) {
  const store = new SessionStore({ root: sessions, runtimeOptions });
  let pending = 0;
  const server = http.createServer(async (request, response) => {
    const json = (code, value) => {
      response.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(value));
    };
    if (!authorized(request.headers.authorization, apiKey)) {
      json(401, { error: { message: 'Invalid bearer token', type: 'authentication_error', code: 'invalid_api_key', param: null } });
      request.resume();
      return;
    }
    if (pending >= maxPending) {
      json(429, { error: { message: 'Server request capacity reached', type: 'rate_limit_error', code: 'capacity', param: null } });
      request.resume();
      return;
    }
    pending++;
    try {
      const route = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'GET' && route === '/health') return json(200, { status: 'ok', model: MODEL_INFO.id });
      if (request.method === 'GET' && route === '/v1/models') return json(200, { object: 'list', data: [MODEL_INFO] });
      if (request.method === 'GET' && route === `/v1/models/${MODEL_INFO.id}`) return json(200, MODEL_INFO);
      if (request.method === 'GET' && route === '/v1/capabilities') {
        return json(200, { model: MODEL_INFO.id, examples: EXAMPLES.map(({ id, name, limitation }) => ({ id, name, limitation })),
          compatibility: 'Text Chat Completions and SSE. No Responses API, tools, images, embeddings or sampling.',
          usage: 'Counts use the SOP tokenizer, not OpenAI tokenization.' });
      }
      if (route === '/v1/sessions' && request.method === 'GET') return json(200, { data: await store.list() });
      if (route === '/v1/sessions' && request.method === 'POST') {
        const body = await readJSON(request);
        return json(201, await store.create(body.id));
      }
      const sessionRoute = route.match(/^\/v1\/sessions\/([A-Za-z0-9_-]{1,64})(?:\/(packs|learn|forget|run|values|assumptions|reject))?$/);
      if (sessionRoute && request.method === 'GET' && !sessionRoute[2]) return json(200, await store.read(sessionRoute[1]));
      if (sessionRoute && request.method === 'GET' && sessionRoute[2] === 'values') {
        const runtime = await store.runtime(sessionRoute[1]);
        return json(200, { session_id: sessionRoute[1], values: runtime.values(),
          invalidated_values: runtime.assumptions().invalidatedValues });
      }
      if (sessionRoute && request.method === 'GET' && sessionRoute[2] === 'assumptions') {
        return json(200, { session_id: sessionRoute[1], ...(await store.runtime(sessionRoute[1])).assumptions() });
      }
      if (sessionRoute && request.method === 'POST' && sessionRoute[2]) {
        const body = await readJSON(request);
        const saved = await store.transact(sessionRoute[1], async (runtime, record) => {
          const execute = async () => {
          if (['values', 'assumptions'].includes(sessionRoute[2])) throw new Error('Use GET to read session data');
          if (sessionRoute[2] === 'reject') return runtime.rejectAssumption(body.id, body.reason);
          if (sessionRoute[2] === 'run') return runtime.runTask(body.circuit, body.inputs, body.save_as);
          if (sessionRoute[2] === 'packs') return installUploadedPack(runtime, body);
          if (sessionRoute[2] === 'forget') return runtime.forget(body.text);
          const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-api-learn-'));
          try {
            const learned = await runtime.learnParaphrase(body.examples, { learnedRoot: temporary });
            return { id: learned.id, productions: learned.productions, circuits: learned.semanticNames };
          } finally { await fs.rm(temporary, { recursive: true, force: true }); }
          };
          return { result: await execute(), record };
        });
        return json(200, { ...saved.result, sdlm: { session_id: sessionRoute[1], revision: saved.record.revision } });
      }
      if (request.method === 'POST' && route === '/v1/chat/completions') {
        const body = validateChat(await readJSON(request));
        const ids = [body.session?.id, body.session_id, body.metadata?.session_id, request.headers['x-sdlm-session-id']]
          .filter(value => value != null);
        if (ids.some(value => value !== ids[0])) throw new Error('Conflicting session references');
        const id = ids[0];
        if (body.bindings != null && id == null) throw new Error('bindings require a session reference');
        let completion;
        if (id == null) completion = await completeChat(await createSDLM({ ...runtimeOptions, learnedRoots: [] }), body);
        else {
          const saved = await store.transact(id, async (runtime, record) => ({
            completion: await completeChat(runtime, body, record), record
          }));
          completion = saved.completion;
          Object.assign(completion.sdlm, { revision: saved.record.revision, history_messages: saved.record.historyCount,
            state: 'sop', retained_variables_limit: 200 });
          response.setHeader('X-SDLM-Session-Id', id);
          response.setHeader('X-SDLM-Session-Revision', saved.record.revision);
        }
        if (body.stream) writeStream(response, completion, body.stream_options);
        else json(200, completion);
        return;
      }
      json(404, { error: { message: 'Unknown endpoint', type: 'invalid_request_error', code: 'not_found', param: null } });
      request.resume();
    } catch (error) {
      const code = error.statusCode ?? (error.code === 'ENOENT' ? 404 :
        ['EEXIST', 'ELOCKED'].includes(error.code) ? 409 : error.name === 'NoMatchError' ? 422 :
        error.name === 'BudgetExceededError' ? 429 : ['EACCES', 'ENOSPC', 'EIO'].includes(error.code) ? 500 : 400);
      json(code, { error: { message: code === 500 ? 'Session storage failed; no new revision was confirmed.' : error.message,
        type: code === 500 ? 'server_error' : 'invalid_request_error', code: error.name, param: null } });
    } finally { pending--; }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}
