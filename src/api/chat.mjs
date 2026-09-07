import { randomUUID } from 'node:crypto';
import { newMessages } from '../sessions/history.mjs';
import { tokenize } from '../primitives/tokenizer.mjs';

export const MODEL = 'sdlm';
export const MODEL_INFO = { id: MODEL, object: 'model', created: 1788739200, owned_by: 'local' };

export function validateChat(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Expected a request object');
  const allowed = new Set(['model', 'messages', 'stream', 'stream_options', 'session_id', 'metadata', 'temperature', 'top_p', 'n', 'session', 'bindings', 'interpretation', 'verbosity']);
  for (const key of Object.keys(body)) if (!allowed.has(key)) throw new Error(`Unsupported parameter: ${key}`);
  if (body.model !== MODEL) throw new Error(`Unknown model. Use ${MODEL}.`);
  if (body.temperature != null && body.temperature !== 0) throw new Error('Only deterministic temperature=0 is supported');
  if (body.top_p != null && body.top_p !== 1) throw new Error('Only top_p=1 is supported');
  if (body.n != null && body.n !== 1) throw new Error('Only n=1 is supported');
  if (body.interpretation != null && !['assist', 'strict'].includes(body.interpretation)) {
    throw new Error('interpretation must be assist or strict');
  }
  if (body.verbosity != null && !['answer', 'explain'].includes(body.verbosity)) throw new Error('verbosity must be answer or explain');
  if (body.verbosity != null && body.interpretation === 'strict') throw new Error('verbosity requires assist interpretation');
  if (body.stream != null && typeof body.stream !== 'boolean') throw new Error('stream must be a boolean');
  if (body.stream_options != null && (!body.stream || typeof body.stream_options !== 'object' ||
    Object.keys(body.stream_options).some(key => key !== 'include_usage') ||
    typeof body.stream_options.include_usage !== 'boolean')) throw new Error('Invalid stream_options');
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 4096) {
    throw new Error('messages must contain between 1 and 4096 text messages');
  }
  const pointer = body.messages[0];
  if (pointer?.role === 'system' && Array.isArray(pointer.content) && pointer.content.length === 1 &&
    pointer.content[0]?.type === 'sdlm_session') {
    const { type, ...session } = pointer.content[0];
    if (body.session && JSON.stringify(body.session) !== JSON.stringify(session)) throw new Error('Conflicting session references');
    body.session = session;
    body.messages = body.messages.slice(1);
  }
  if (body.session != null && (typeof body.session !== 'object' || Array.isArray(body.session) ||
    typeof body.session.id !== 'string' || (body.session.revision != null && typeof body.session.revision !== 'string') || Object.keys(body.session).some(key => !['id', 'revision'].includes(key)))) {
    throw new Error('session must contain id and optional revision');
  }
  if (body.bindings != null && (typeof body.bindings !== 'object' || Array.isArray(body.bindings) ||
    Object.entries(body.bindings).some(([key, ref]) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(key) || typeof ref !== 'string'))) {
    throw new Error('bindings must map placeholder names to saved value references');
  }
  for (const message of body.messages) {
    if (!message || !['user', 'assistant', 'system', 'developer'].includes(message.role) ||
      typeof message.content !== 'string' || Object.keys(message).some(key => !['role', 'content'].includes(key))) {
      throw new Error('Only role/content text messages are supported');
    }
  }
  if (body.messages.at(-1)?.role !== 'user') throw new Error('The last message must have role user');
  if (body.metadata != null && (typeof body.metadata !== 'object' || Array.isArray(body.metadata))) {
    throw new Error('metadata must be an object');
  }
  return body;
}

export async function completeChat(runtime, body, record = null) {
  if (body.session?.revision && body.session.revision !== record?.revision) {
    throw Object.assign(new Error('Session revision mismatch; reload the session before retrying.'), { statusCode: 409 });
  }
  const { messages, ignored } = newMessages(record, body.messages);
  const substitute = text => text.replace(/\{\{([A-Za-z][A-Za-z0-9_]*)(\|capitalize)?\}\}/g, (match, key, format) => {
    if (!Object.hasOwn(body.bindings ?? {}, key)) throw new Error(`Missing binding: ${key}`);
    const value = runtime.resolve(body.bindings[key]);
    if (!['string', 'number', 'boolean'].includes(typeof value)) throw new Error('Text bindings require a scalar value');
    const text = String(value);
    return format ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  });
  const inputs = messages.filter(message => message.role !== 'assistant')
    .flatMap(message => substitute(message.content).split(/\r?\n/).map(line => line.trim()).filter(Boolean));
  const results = await (body.interpretation === 'strict' ? runtime.processDetailed(inputs) : runtime.respondDetailed(inputs, { verbosity: body.verbosity }));
  const content = results.map(result => result.text).filter(Boolean).join('\n');
  let saved = null;
  if (record) {
    record.messages.push(...messages, { role: 'assistant', content });
    record.turns++;
    record.valueSequence = Math.max(record.valueSequence ?? 0, record.turns - 1) + 1;
    saved = await runtime.bind(`turn_${record.valueSequence}`, { results, text: content });
  }
  const promptTokens = body.messages.reduce((sum, message) => sum + tokenize(message.content).length, 0);
  const completionTokens = tokenize(content).length;
  return {
    id: `chatcmpl-${randomUUID()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000),
    model: MODEL, choices: [{ index: 0, message: { role: 'assistant', content, refusal: null }, finish_reason: 'stop', logprobs: null }],
    sdlm: { preferences: runtime.preferences(), interpretation: body.interpretation ?? 'assist', results,
      assumptions: [...new Map(results.flatMap(result => result.assumptions ?? []).map(item => [item.id, item])).values()],
      ...(record ? { session_id: record.id, ignored_messages: ignored, executed_inputs: results.length,
        variables: [{ name: saved.name, ref: saved.name, value: saved.value }] } : {}) },
    usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens }
  };
}

export function writeStream(response, completion, { include_usage = false } = {}) {
  response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
  const base = { id: completion.id, object: 'chat.completion.chunk', created: completion.created, model: completion.model,
    ...(completion.sdlm ? { sdlm: completion.sdlm } : {}) };
  const emit = choices => response.write(`data: ${JSON.stringify({ ...base, choices })}\n\n`);
  emit([{ index: 0, delta: { role: 'assistant', content: '' }, finish_reason: null }]);
  // Text is emitted only after the complete symbolic operation and durable commit succeed.
  for (const content of completion.choices[0].message.content.match(/[\s\S]{1,80}/gu) ?? []) {
    emit([{ index: 0, delta: { content }, finish_reason: null }]);
  }
  emit([{ index: 0, delta: {}, finish_reason: 'stop' }]);
  if (include_usage) response.write(`data: ${JSON.stringify({ ...base, choices: [], usage: completion.usage })}\n\n`);
  response.end('data: [DONE]\n\n');
}
