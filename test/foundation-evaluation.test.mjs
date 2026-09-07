import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from '../src/sd_lm.mjs';
import { CommandLine } from '../src/cli/commands.mjs';
import { benchmarkDataset, scoreAnswer } from '../src/evaluation/benchmark.mjs';
import { createApiServer } from '../src/api/server.mjs';

const fresh = options => createSDLM({ learnedRoots: [], ...options });
const ask = async (runtime, text) => (await runtime.respondDetailed([text])).at(-1);

test('default base knowledge composes across unseen entity names and respects explicit flight exceptions', async () => {
  const runtime = await fresh();
  for (const name of ['Fennel', 'Copper', 'Wicket']) {
    const result = await ask(runtime, `${name} is a bee. Is ${name} alive?`);
    assert.equal(result.answer.status, 'true');
    assert.equal(result.proof.support.source, 'rule');
  }
  assert.equal((await ask(runtime, 'Pogo is a penguin. Can Pogo fly?')).answer.status, 'false');
  assert.equal((await ask(runtime, 'Pogo is a penguin. Is Pogo a mammal?')).answer.status, 'unknown');
  const blank = await fresh({ foundation: false });
  assert.equal((await ask(blank, 'Fennel is a bee. Is Fennel alive?')).answer.status, 'unknown');
});

test('arithmetic evaluates new operands, comparisons and division by zero without answer lookup', async () => {
  const runtime = await fresh();
  for (const [a, b] of [[13, 6], [23, 4], [0, 9], [31, 17], [-2, 3], [1.5, -0.5]]) {
    assert.equal((await ask(runtime, `What is ${a} plus ${b}?`)).answer.value, a + b);
    assert.equal((await ask(runtime, `What is ${a} times ${b}?`)).answer.value, a * b);
    assert.equal((await ask(runtime, `Is ${a} greater than ${b}?`)).answer.status, a > b ? 'true' : 'false');
  }
  assert.equal((await ask(runtime, 'What is +2 plus 3?')).answer.value, 5);
  assert.equal((await ask(runtime, 'What is −2 plus 3?')).status, 'unresolved');
  const zero = await ask(runtime, 'What is 5 divided by 0?');
  assert.equal(zero.answer.kind, 'operationGap');
  assert.equal(zero.answer.status, 'unknown');
});

test('quantities preserve object and owner identity, reject impossible updates and survive SOP restoration', async t => {
  const runtime = await fresh();
  const result = await ask(runtime, 'Quinn has 11 pencils. Quinn gets 6 pencils. Quinn loses 4 pencils. How many pencils does Quinn have?');
  assert.equal(result.answer.value, 13);
  await runtime.respond('Quinn has 3 books. Poppy has 8 pencils.');
  assert.equal((await ask(runtime, 'Quinn loses 30 pencils.')).answer.status, 'unknown');
  assert.equal((await ask(runtime, 'Quinn has -2 pencils.')).status, 'unresolved');
  assert.equal((await ask(runtime, 'How many pencils does Quinn have?')).answer.value, 13);
  assert.equal((await ask(runtime, 'How many books does Quinn have?')).answer.value, 3);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-foundation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await runtime.saveSessionPack(path.join(root, 'saved'));
  const resumed = await fresh({ sessionRoot: path.join(root, 'saved') });
  assert.equal((await ask(resumed, 'How many pencils does Quinn have?')).answer.value, 13);
  assert.equal((await ask(resumed, 'How many pencils does Poppy have?')).answer.value, 8);
});

test('movement replaces the previous location and recomputes nested location answers', async () => {
  const runtime = await fresh();
  await runtime.respond('Token is in Pouch. Pouch is in Attic. Attic is in House.');
  assert.equal((await ask(runtime, 'Is Token in House?')).answer.status, 'true');
  await runtime.respond('Pouch goes to School.');
  assert.equal((await ask(runtime, 'Is Token in House?')).answer.status, 'unknown');
  assert.equal((await ask(runtime, 'Is Token in School?')).answer.status, 'true');
  assert.deepEqual((await ask(runtime, 'Where is Pouch?')).answer.values, ['school']);
});

test('rain defaults disclose their conditions, respect shelter and do not become unconditional stored facts', async () => {
  const runtime = await fresh();
  await runtime.respond('Poppy is outside. Poppy is in rain.');
  const rain = await ask(runtime, 'Is Poppy wet?');
  assert.equal(rain.answer.status, 'true');
  assert.equal(rain.answer.hypothetical, true);
  assert.ok(rain.assumptions.some(item => item.category === 'everyday-default'));
  assert.match(await runtime.process('Is Poppy wet?'), /^Unknown/);
  await runtime.respond('Poppy has shelter.');
  assert.equal((await ask(runtime, 'Is Poppy wet?')).answer.status, 'unknown');
  assert.equal((await ask(runtime, 'Is Poppy not wet?')).answer.status, 'unknown');
});

test('family and ordering rules compose independently of benchmark names', async () => {
  const runtime = await fresh();
  await runtime.respond('Olive is a mother of Finch. Finch is a father of Rowan.');
  assert.equal((await ask(runtime, 'Is Rowan a grandchild of Olive?')).answer.status, 'true');
  await runtime.respond('Music is before Recess. Recess is before Painting.');
  assert.equal((await ask(runtime, 'Is Painting after Music?')).answer.status, 'true');
  await runtime.respond('Tower is taller than Shed. Shed is taller than Fence.');
  assert.equal((await ask(runtime, 'Is Fence shorter than Tower?')).answer.status, 'true');
});

test('benchmark splits have distinct IDs, exact typed scoring and no accidental abstention credit', async () => {
  const dataset = await benchmarkDataset();
  assert.equal(dataset.cases.length, 88);
  assert.equal(new Set(dataset.cases.map(item => item.id)).size, 88);
  assert.equal(dataset.cases.filter(item => item.split === 'dev').length, 44);
  assert.equal(dataset.cases.filter(item => item.split === 'eval').length, 44);
  assert.equal(new Set(dataset.cases.map(item => item.domain)).size, 11);
  assert.equal(scoreAnswer(null, { kind: 'boolean', status: 'unknown' }), false);
  assert.equal(scoreAnswer({ kind: 'boolean', status: 'unknown' }, { kind: 'boolean', status: 'true' }), false);
  assert.equal(scoreAnswer({ kind: 'number', value: 12 }, { kind: 'number', value: 2 }), false);
  assert.equal(scoreAnswer({ values: ['garden', 'kitchen'] }, { kind: 'bindings', values: ['garden'] }), false);
});

test('/examples documents a case and /example executes it without changing the selected runtime', async () => {
  const output = [];
  const cli = await new CommandLine({ write: value => output.push(String(value)) }).start();
  const before = cli.runtime.snapshot();
  await cli.handle('/examples 14');
  assert.match(output.join('\n'), /Nothing was executed/);
  assert.doesNotMatch(output.join('\n'), /Actual:|PASS 14/);
  assert.deepEqual(cli.runtime.snapshot(), before);
  output.length = 0;
  assert.equal(await cli.handle('/example 14'), true);
  assert.match(output.join('\n'), /PASS 14/);
  assert.deepEqual(cli.runtime.snapshot(), before);
  output.length = 0;
  await cli.handle('/help');
  assert.match(output.join('\n'), /\/examples (\d+) shows.*\/example \1 runs/);
});

test('the sdlm API name, metadata and default knowledge are usable together', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-api-foundation-'));
  const server = createApiServer({ sessions: root });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await fs.rm(root, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}/v1`;
  const response = await fetch(base + '/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'sdlm', messages: [{ role: 'user', content: 'Pip is a cat. Is Pip an animal?' }] }) });
  assert.equal(response.status, 200);
  const completion = await response.json();
  assert.equal(completion.model, 'sdlm');
  assert.equal(completion.sdlm.results.at(-1).answer.status, 'true');
  assert.equal((await (await fetch(base + '/models')).json()).data[0].id, 'sdlm');
});


test('state statements preserve similar new names and known relation words are not guessed', async () => {
  const runtime = await fresh();
  await runtime.respond('Nora has 5 apples. Cora has 3 apples. Cora gets 2 apples.');
  assert.equal((await ask(runtime, 'How many apples does Nora have?')).answer.value, 5);
  assert.equal((await ask(runtime, 'How many apples does Cora have?')).answer.value, 5);
  await runtime.respond('Nora is in Kitchen. Cora is in Attic. Bora is in Cellar.');
  assert.deepEqual((await ask(runtime, 'Where is Nora?')).answer.values, ['kitchen']);
  assert.deepEqual((await ask(runtime, 'Where is Cora?')).answer.values, ['attic']);
  assert.deepEqual((await ask(runtime, 'Where is Bora?')).answer.values, ['cellar']);
  const results = await runtime.respondDetailed(['Is Cora in Attic?', 'What comes after Monday?', 'What do eyes help us do?']);
  assert.ok(results.every(result => result.assumptions.length === 0));
  await runtime.respond('Lora gets 2 apples.');
  assert.equal((await ask(runtime, 'How many apples does Nora have?')).answer.value, 5);
  assert.equal(runtime.assumptions().decisions.length, 0);
});
