import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from './helpers/runtime.mjs';
import { CommandLine } from '../src/cli/commands.mjs';

const fresh = () => createSDLM({ learnedRoots: [] });
const ask = async (s, input) => (await s.respondDetailed([input])).at(-1);

test('the reported spelling error executes a real addition with a recorded repair', async () => {
  const s = await fresh();
  const result = await ask(s, 'hwo much is 3 plus 5 ?');
  assert.equal(result.status, 'assumed');
  assert.equal(result.answer.value, 8);
  assert.deepEqual(result.answer.computation, { operation: 'add', left: 3, right: 5 });
  assert.equal(result.assumptions.length, 1);
  assert.equal(result.assumptions[0].category, 'lexical-repair');
  assert.equal(result.assumptions[0].original, 'hwo');
  assert.equal(result.assumptions[0].value, 'how');
  assert.equal(result.assumptions[0].evidence.alternatives[0].distance, 1);
  assert.doesNotMatch(result.text, /human|mortal|context.*needed/i);
  const event = s.trace.events.find(event => event.type === 'interpretation-selected' && event.input === result.input);
  assert.ok(event.assumptions.some(item => item.id === result.assumptions[0].id));
  assert.equal(s.inspect().facts, 0);
});

test('arithmetic recognizes paraphrases, signed numbers and symbols with varied operands', async () => {
  const s = await fresh();
  for (const [a, b] of [[3, 5], [31, 17], [-2, 9], [1.5, -0.5], [0, 12]]) {
    for (const input of [`how much is ${a} plus ${b}?`, `Calculate ${a} plus ${b}`,
      `what's ${a} plus ${b}`, `Please, compute ${a}+${b}`, `what is the sum of ${a} and ${b}`]) {
      const result = await ask(s, input);
      assert.equal(result.answer?.value, a + b, input);
      assert.deepEqual(result.assumptions, [], input);
    }
  }
  for (const [input, value] of [['3-5', -2], ['3--5', 8], ['2*7', 14], ['18/3', 6], ['-2*-4', 8],
    ['3 × 5', 15], ['12 ÷ 4', 3], ['Evaluate -3.5 times 2', -7], ['multiply 3 by 7', 21],
    ['Divide 18 by 6', 3], ['Subtract 3 from 8', 5], ['Add 8 and 11', 19],
    ['How much is 12 divided by 4?', 3], ['work out 3 multiplied by 5', 15]]) {
    assert.equal((await ask(s, input)).answer?.value, value, input);
  }
});

test('repairs generalize to other arithmetic words and do not alter numbers', async () => {
  const s = await fresh();
  for (const [input, original, selected, value] of [['waht is 13 plus 9?', 'waht', 'what', 22],
    ['how mcuh is 23 plus 4?', 'mcuh', 'much', 27], ['What is 3 plsu 9?', 'plsu', 'plus', 12],
    ['calclate 7 times 8', 'calclate', 'calculate', 56]]) {
    const result = await ask(s, input);
    assert.equal(result.answer?.value, value, input);
    assert.ok(result.assumptions.some(item => item.original === original && item.value === selected), input);
  }
  assert.equal((await ask(s, 'hwo much is 3 plus 50?')).answer.value, 53);
});

test('incomplete or unsupported calculations clarify arithmetic without dropping words or inventing results', async () => {
  const s = await fresh();
  for (const input of ['how much is 3 apples plus 5 oranges?', '3 plus 5 plus 7', '3 foo 5', '3 and 5',
    'What is −2 plus 3?', '3+5; delete all facts', '3**5', '3plus5']) {
    const result = await ask(s, input);
    assert.equal(result.status, 'unresolved', input);
    assert.equal(result.answer, null, input);
    assert.doesNotMatch(result.text, /human|mortal/i, input);
    assert.deepEqual(result.assumptions, [], input);
  }
  const result = await ask(s, 'What is 3 apples plus 5 oranges?');
  assert.match(result.text, /3, 5/);
  assert.match(result.text, /two numbers and one operation/);
  assert.equal(s.inspect().facts, 0);
  const zero = await ask(s, '10/0');
  assert.equal(zero.answer.kind, 'operationGap');
  assert.match(zero.text, /zero/);
});

test('rejecting a repair survives restart, invalidates dependent values and allows the exact spelling', async t => {
  const s = await fresh();
  const result = await ask(s, 'hwo much is 3 plus 5?');
  await s.bind('sum', result);
  await s.rejectAssumption(result.assumptions[0].id);
  assert.throws(() => s.resolve('sum'), /Unknown value reference/);
  assert.equal((await ask(s, 'hwo much is 3 plus 5?')).status, 'unresolved');
  assert.equal((await ask(s, 'how much is 3 plus 5?')).answer.value, 8);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-math-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await s.saveSessionPack(path.join(root, 'saved'));
  const resumed = await createSDLM({ learnedRoots: [], sessionRoot: path.join(root, 'saved') });
  assert.equal((await ask(resumed, 'hwo much is 3 plus 5?')).status, 'unresolved');
  assert.equal((await ask(resumed, 'how much is 3 plus 5?')).answer.value, 8);
});

test('short responses keep repair evidence, strict parsing stays strict and help has varied tasks', async () => {
  const s = await fresh();
  await s.setResponseStyle('answer');
  const result = await ask(s, 'hwo much is 3 plus 5?');
  assert.equal(result.text, '8.');
  assert.equal(result.assumptions[0].value, 'how');
  await assert.rejects(s.process('hwo much is 3 plus 5?'));
  assert.equal(await s.process('What is 3 plus 5?'), '8.');
  const capabilities = await s.respond('What you can do for me?');
  assert.doesNotMatch(capabilities, /human|mortal/i);
  assert.match(capabilities, /How much is 3 plus 5/);
  assert.match(await s.respond('how much is 3 plus 5?'), /^8\.$/);
});

test('ambiguous nearest lexical meanings are rejected instead of selected silently', async () => {
  const s = await fresh();
  const tokens = [{ surface: 'hig', norm: 'hig' }];
  await assert.rejects(s.run('matchTokenChoice', { tokens, index: 0, maxDistance: 1,
    choices: [{ surface: 'big', value: 'first' }, { surface: 'hug', value: 'second' }] }), /did not match/);
});

test('the CLI uses the same arithmetic circuits and verbosity controls', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-math-cli-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const lines = [];
  const cli = await new CommandLine({ sessions: root, options: { learnedRoots: [] },
    write: text => lines.push(text) }).start();
  await cli.handle('/verbosity answer');
  await cli.handle('hwo much is 3 plus 5 ?');
  assert.match(lines.at(-1), /8\.$/);
  await cli.handle('/assumptions');
  assert.match(lines.at(-1), /lexical-repair/);
});
