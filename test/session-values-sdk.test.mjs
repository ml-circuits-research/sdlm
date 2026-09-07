import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import OpenAI from 'openai';
import { createApiServer } from '../src/api/server.mjs';
import { SessionStore } from '../src/sessions/session-store.mjs';
import { newMessages, extendHistory } from '../src/sessions/history.mjs';

test('official SDK resumes SOP values, skips history and rejects stale revisions', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-sdk-'));
  const server = createApiServer({ sessions: root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const baseURL = `http://127.0.0.1:${server.address().port}/v1`;
  const store = new SessionStore({ root });
  await store.create('sdk');
  const client = new OpenAI({ baseURL, apiKey: 'local', maxRetries: 0 });
  const first = await client.chat.completions.create({ model: 'sdlm', session_id: 'sdk',
    messages: [{ role: 'user', content: 'Alice is human.' }] });
  assert.equal(first.sdlm.executed_inputs, 1);
  assert.equal(first.sdlm.variables[0].value.results[0].command.payload.args[0].value, 'alice');
  await assert.rejects(client.chat.completions.create({ model: 'sdlm', interpretation: 'strict',
    messages: [{ role: 'user', content: 'Is alice human?' }] }), error => error.status === 422);
  const record = await store.read('sdk');
  const next = await client.chat.completions.create({ model: 'sdlm', messages: [
    { role: 'system', content: [{ type: 'sdlm_session', id: 'sdk', revision: first.sdlm.revision }] },
    ...record.messages, { role: 'user', content: 'Is {{person|capitalize}} human?' }
  ], bindings: { person: 'turn_1.results.0.command.payload.args.0.value' } });
  assert.equal(next.choices[0].message.content, 'Yes.');
  assert.equal(next.sdlm.ignored_messages, 2);
  assert.equal(next.sdlm.executed_inputs, 1);
  assert.notEqual(next.sdlm.revision, first.sdlm.revision);
  await assert.rejects(client.chat.completions.create({ model: 'sdlm', session: { id: 'sdk', revision: first.sdlm.revision },
    messages: [{ role: 'user', content: 'Bob is human.' }] }), error => error.status === 409);
  const resumed = await new SessionStore({ root }).runtime('sdk');
  assert.equal(resumed.resolve('turn_2.text'), 'Yes.');
  assert.match(await resumed.process('Is Bob human?'), /^Unknown/);
  const task = await resumed.runTask('RenderEnglish', { answer: { $ref: 'turn_2.results.0.answer' } }, 'rendered');
  assert.equal(task.value, 'Yes.');
  await store.transact('sdk', runtime => runtime.runTask('RenderEnglish', { answer: { $ref: 'turn_2.results.0.answer' } }, 'rendered'));
  assert.equal((await store.runtime('sdk')).resolve('rendered'), 'Yes.');
  await store.create('fork', resumed);
  const forked = await client.chat.completions.create({ model: 'sdlm', session_id: 'fork',
    messages: [{ role: 'user', content: 'Is Alice human?' }] });
  assert.equal(forked.sdlm.variables[0].name, 'turn_3');
  assert.equal((await store.runtime('fork')).resolve('turn_1.text'), 'Learned.');
  const stream = await client.chat.completions.create({ model: 'sdlm', session_id: 'sdk', stream: true,
    messages: [{ role: 'user', content: 'Is Alice human?' }], stream_options: { include_usage: true } });
  let text = '', metadata;
  for await (const chunk of stream) { text += chunk.choices[0]?.delta.content ?? ''; metadata = chunk.sdlm; }
  assert.equal(text, 'Yes.');
  assert.equal(metadata.session_id, 'sdk');
});

test('history hash recognizes full history beyond retained conversation without parsing it', () => {
  const all = Array.from({ length: 240 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `message ${i}` }));
  const record = { historyCount: all.length, historyHash: extendHistory('', all), messages: all.slice(-200) };
  const next = { role: 'user', content: 'Is Alice human?' };
  assert.deepEqual(newMessages(record, [...all, next]), { messages: [next], ignored: 240 });
  assert.deepEqual(newMessages(record, [...record.messages, next]), { messages: [next], ignored: 200 });
  assert.throws(() => newMessages(record, [{ role: 'system', content: 'changed' }, ...all.slice(1), next]), /mismatch/);
});
