import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from './helpers/runtime.mjs';
import { createApiServer } from '../src/api/server.mjs';

const runtime = options => createSDLM({ learnedRoots: [], ...options });
const answer = async (s, input) => (await s.respondDetailed([input])).at(-1);
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-chat-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('the reported failed conversation introduces, remembers, greets and explains capabilities', async () => {
  const s = await runtime();
  for (const input of ['hello , I am Jhon', 'I am jhon', 'Hello', 'who is Jhon?', 'What you can do for me?']) {
    const result = await answer(s, input);
    assert.notEqual(result.status, 'unresolved', input);
    assert.equal(result.answer.kind, 'chat', input);
    assert.doesNotMatch(result.text, /No bindings|Recognized categories|No candidates|could not yet form/);
    assert.ok(!result.assumptions.some(item => item.category === 'predicate-classification'));
  }
  assert.equal(s.assumptions().gaps.length, 0);
  assert.match(await s.respond('Hello'), /Hello, Jhon!/);
  assert.match(await s.respond('Who am I?'), /name is Jhon/);
});

test('introductions generalize across case, names, punctuation, prefixes and contractions', async () => {
  const s = await runtime();
  for (const [input, name] of [
    ["Hi, I'm mary jane!", 'mary_jane'], ['MY NAME IS Nora', 'nora'], ['call me Cora', 'cora'],
    ['You can call me Alex', 'alex'], ['I am called Lina', 'lina'], ["I'm called Ivo", 'ivo'],
    ['hey, please, my name is Jhon', 'jhon']
  ]) {
    const result = await answer(s, input);
    assert.equal(result.command.kind, 'introduceSpeaker', input);
    assert.equal(result.command.payload.value, name);
    assert.ok(!result.assumptions.some(item => item.category === 'entity-resolution'));
    assert.equal((await answer(s, 'What is my name?')).answer.atom.args[1].value, name);
  }
  const explicit = await answer(s, 'My name is Mary Jane');
  assert.deepEqual(explicit.assumptions, []);
  await s.respond('I am human.');
  assert.equal((await answer(s, 'Is Mary_Jane human?')).answer.status, 'true');
  assert.equal((await answer(s, 'Am I human?')).answer.status, 'true');
});

test('first-person statements use the speaker and category questions still query predicates', async () => {
  const s = await runtime({ foundation: true });
  await s.respond('My name is Jhon. Every human is mortal. I am human.');
  const result = await answer(s, 'Am I mortal?');
  assert.equal(result.answer.status, 'true');
  assert.ok(result.assumptions.some(item => item.category === 'speaker-reference'));
  assert.equal(result.command.payload.args[0].value, 'jhon');
  assert.equal((await answer(s, 'Who is human?')).answer.kind, 'bindings');
  assert.match(await s.respond('who is jhon?'), /Jhon is human/);
  assert.match(await s.respond('Tell me about me'), /Jhon is human/);
  await s.respond('I have 5 apples. I get 2 apples. I go to Garden.');
  assert.equal((await answer(s, 'How many apples does Jhon have?')).answer.value, 7);
  assert.match(await s.respond('Where am I?'), /garden/i);
  assert.equal((await answer(s, 'I am tired.')).command.kind, 'assertFact');
  assert.equal((await answer(s, 'Am I tired?')).answer.status, 'true');
});

test('polite wrappers preserve supported task meaning and supplied punctuation', async () => {
  const s = await runtime({ foundation: true });
  for (const text of ['Please, what is 7 plus 8?', 'Hi, what is 7 plus 8?',
    'Could you tell me if 8 is greater than 3?', 'Can you help me?', 'Do you know if Mia is human?']) {
    const result = await answer(s, text);
    assert.notEqual(result.status, 'unresolved', text);
    assert.ok(!result.assumptions.some(item => item.category === 'sentence-boundary'), text);
  }
  const result = await answer(s, 'Please, what is 7 plus 8?');
  assert.equal(result.answer.value, 15);
  assert.equal(result.rewrites[0].policy ?? result.rewrites[0].circuit, 'ChatPrefixPlease');
  await s.respond('Please, Mia is human.');
  assert.equal((await answer(s, 'Is Mia human?')).answer.status, 'true');
});

test('speaker assumptions have causal dependencies and rejection retracts dependent facts across restart', async t => {
  const s = await runtime();
  const intro = await answer(s, 'I am Jhon');
  const id = intro.assumptions[0].id;
  const fact = await answer(s, 'I am human.');
  assert.ok(fact.dependencies.includes(id));
  await s.bind('personalFact', fact);
  const dir = path.join(await temporary(t), 'snapshot');
  await s.saveSessionPack(dir);
  const resumed = await runtime({ sessionRoot: dir });
  assert.equal((await answer(resumed, 'Am I human?')).answer.status, 'true');
  await resumed.rejectAssumption(id, 'This was not a name');
  assert.throws(() => resumed.resolve('personalFact'), /Unknown value reference/);
  assert.equal((await answer(resumed, 'Is Jhon human?')).answer.status, 'unknown');
  assert.match(await resumed.respond('Who am I?'), /What name should I use/);
  assert.notEqual((await answer(resumed, 'I am Jhon')).command?.kind, 'introduceSpeaker');
  await resumed.respond('My name is Jhon. I am human.');
  assert.equal((await answer(resumed, 'Am I human?')).answer.status, 'true');
});

test('explicit identity, style and knowledge survive restart and remain isolated', async t => {
  const s = await runtime();
  await s.respond('My name is Nora. I am human. Answer only.');
  const dir = path.join(await temporary(t), 'saved');
  await s.saveSessionPack(dir);
  const resumed = await runtime({ sessionRoot: dir });
  assert.match(await resumed.respond('Who am I?'), /Nora/);
  assert.equal(await resumed.respond('Am I human?'), 'Yes.');
  assert.match(await resumed.respond('Hello'), /Nora/);
  const other = await runtime();
  assert.match(await other.respond('Who am I?'), /What name should I use/);
  assert.equal((await answer(other, 'Is Nora human?')).answer.status, 'unknown');
  await resumed.respond('My name is Cora.');
  assert.match(await resumed.respond('Who am I?'), /Cora/);
  assert.equal((await answer(resumed, 'Am I human?')).answer.status, 'unknown');
  assert.equal((await answer(resumed, 'Is Nora human?')).answer.status, 'true');
});

test('unknown people and unsupported requests receive useful clarification without fabricated execution', async () => {
  const s = await runtime();
  assert.match(await s.respond('Who is Beatrice?'), /Tell me something about them/);
  for (const text of ['Am I human?', 'I am human', 'Tell me about me', 'Where am I?']) {
    assert.match(await s.respond(text), /What name should I use/);
  }
  const results = await s.respondDetailed(['Mia is human. Please write a novel about the moon. Is Mia human?']);
  assert.equal(results[1].status, 'unresolved');
  assert.match(results[1].text, /cannot write arbitrary/);
  assert.ok(results[1].gap.tokens.length > 0);
  assert.equal(results[2].answer.status, 'true');
  assert.equal(s.inspect().facts, 1);
  assert.match(await s.respond('weather tomorrow'), /cannot check live weather/);
  assert.match(await s.respond('thanks'), /welcome/);
  assert.match(await s.respond('who are you?'), /sdlm/);
});

test('strict entry points remain strict and a failing request rolls back an introduction', async () => {
  const s = await runtime();
  await assert.rejects(s.process('Hello'));
  await assert.rejects(s.respond('My name is Jhon. If X is human then Y is mortal.'), /unbound head variable/);
  assert.match(await s.respond('Who am I?'), /What name should I use/);
  assert.equal(s.inspect().facts, 0);
});

test('HTTP history continuation restores the speaker without replaying an introduction', async t => {
  const server = createApiServer({ sessions: await temporary(t) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, body) => {
    const response = await fetch(base + route, { method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(response.ok, true, await response.clone().text());
    return response.json();
  };
  await call('/v1/sessions', { id: 'speaker' });
  const body = { model: 'sdlm', session_id: 'speaker', verbosity: 'answer' };
  await call('/v1/chat/completions', { ...body, messages: [{ role: 'user', content: 'My name is Jhon.' }] });
  const history = await call('/v1/sessions/speaker');
  const result = await call('/v1/chat/completions', { ...body, messages: [...history.messages,
    { role: 'user', content: 'Who am I?' }] });
  assert.match(result.choices[0].message.content, /Jhon/);
  assert.equal(result.sdlm.ignored_messages, 2);
  assert.equal(result.sdlm.executed_inputs, 1);
});

test('repeating an explicit name tentatively does not erase its independent support', async () => {
  const s = await runtime();
  await s.respond('My name is Jhon.');
  const tentative = await answer(s, 'I am Jhon');
  await s.rejectAssumption(tentative.assumptions[0].id);
  assert.match(await s.respond('Who am I?'), /name is Jhon/);
  assert.deepEqual((await answer(s, 'Who am I?')).assumptions, []);
});
