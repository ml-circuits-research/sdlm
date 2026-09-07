import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from '../src/sd_lm.mjs';
import { CommandLine } from '../src/cli/commands.mjs';
import { completeChat, validateChat } from '../src/api/chat.mjs';

const make = options => createSDLM({ learnedRoots: [], ...options });
const question = 'Socrate is a human. All humans die. Is Scorate going to die?';

test('SOP answer-only input suppresses acknowledgements and explanations but preserves actual evidence', async () => {
  const runtime = await make();
  const results = await runtime.respondDetailed(['Answer only. ' + question]);
  assert.equal(results.map(result => result.text).filter(Boolean).join('\n'), 'Yes.');
  assert.equal(results.at(-1).assumptions.length, 2);
  assert.match(results.at(-1).explanation, /Assumptions used:/);
  assert.equal(runtime.assumptions().decisions.length, 2);
  assert.equal(runtime.preferences().response_style, 'answer');
  assert.equal(await runtime.respond('What is 13 plus 28?'), '41.');
  assert.equal(await runtime.respond('Invent a fairy tale.'), "I don't know.");
  assert.equal(await runtime.respond('Mira is a cat.'), 'Learned.');
  const explanation = await runtime.respond('Show assumptions. Is Scorate going to die?');
  assert.match(explanation, /Assumptions used:/);
  assert.match(explanation, /Support: die\(socrate\)/);
  assert.equal(runtime.preferences().response_style, 'explain');
});

test('verbosity is isolated, restored from SOP, and rolled back with a failed request', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-style-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const runtime = await make();
  await runtime.setResponseStyle('answer');
  await runtime.saveSessionPack(path.join(root, 'saved'));
  const restored = await make({ sessionRoot: path.join(root, 'saved') });
  assert.equal(restored.preferences().response_style, 'answer');
  assert.equal((await make()).preferences().response_style, 'explain');
  await assert.rejects(restored.respondDetailed(['Show assumptions.', 'If X is human then Y is mortal.']), /unbound head variable/);
  assert.equal(restored.preferences().response_style, 'answer');
  await assert.rejects(restored.setResponseStyle('verbose'));
  assert.equal(restored.preferences().response_style, 'answer');
  assert.equal(await restored.respond('Doar răspunsul. What is 6 times 7?'), '42.');
});

test('CLI preference commands survive durable session switching and appear in help', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-style-cli-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const output = [];
  const cli = await new CommandLine({ sessions: root, options: { learnedRoots: [] }, write: text => output.push(text) }).start();
  await cli.handle('/help');
  assert.match(output.join('\n'), /\/verbosity \[answer\|explain\]/);
  await cli.handle('/session new compact');
  await cli.handle('/verbosity answer');
  await cli.handle('/session new other');
  assert.equal(cli.runtime.preferences().response_style, 'explain');
  await cli.handle('/session use compact');
  assert.equal(cli.runtime.preferences().response_style, 'answer');
  await cli.handle(question);
  assert.ok(output.at(-1).endsWith('\nYes.'));
  await cli.handle('/assumptions');
  assert.match(output.at(-1), /entity-resolution/);
  await cli.handle('/verbosity explain');
  assert.equal(cli.runtime.preferences().response_style, 'explain');
});

test('Chat verbosity and system input use the same SOP policy without hiding structured audit', async () => {
  const runtime = await make();
  const body = validateChat({ model: 'sdlm', verbosity: 'answer', messages: [{ role: 'user', content: question }] });
  const response = await completeChat(runtime, body);
  assert.equal(response.choices[0].message.content, 'Yes.');
  assert.equal(response.sdlm.assumptions.length, 2);
  assert.equal(response.sdlm.preferences.response_style, 'answer');
  const next = await completeChat(runtime, validateChat({ model: 'sdlm', messages: [
    { role: 'system', content: 'Show assumptions.' }, { role: 'user', content: 'Is Scorate going to die?' }
  ] }));
  assert.match(next.choices[0].message.content, /Assumptions used:/);
  assert.throws(() => validateChat({ ...body, verbosity: 'many' }), /verbosity/);
  assert.throws(() => validateChat({ ...body, interpretation: 'strict' }), /verbosity requires assist/);
});

test('generic read mapping refuses a mutating circuit even when invoked indirectly', async () => {
  const runtime = await make();
  const before = runtime.preferences();
  await assert.rejects(runtime.run('mapReadCircuit', { values: ['answer'], circuit: 'ResponseStyleAnswer' }), /read-only circuit/);
  assert.deepEqual(runtime.preferences(), before);
});
