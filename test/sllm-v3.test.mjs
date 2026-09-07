import test from 'node:test';
import assert from 'node:assert/strict';
import { createSLLM } from '../src/sllm.mjs';
import { Trace } from '../src/kernel/trace.mjs';

test('larger CNL: conjunction facts, universal verb rules, conjunction queries, count and exists', async () => {
  const s = await createSLLM();
  for (const line of [
    'Every researcher is curious.',
    'Every researcher uses AI.',
    'Alice is a researcher and scientist.',
    'Alice is creative.',
    'Bob is a researcher.',
    'If X is researcher and X is curious and X is creative then X is innovative.'
  ]) assert.equal(await s.process(line), 'Learned.', line);
  assert.equal(await s.process('Is Alice innovative?'), 'Yes.');
  assert.match(await s.process('Who is researcher and curious?'), /alice.*bob|bob.*alice/);
  assert.match(await s.process('How many are researcher?'), /Count: 2/);
  assert.match(await s.process('Is anyone innovative?'), /^Yes\./);
  assert.match(await s.process('What does Alice use?'), /ai/);
});

test('symbolic summarization and expansion generate multi-sentence text from KB profiles', async () => {
  const s = await createSLLM();
  for (const line of [
    'ExecutableScience is promising.',
    'ExecutableScience improves reproducibility.',
    'ExecutableScience reduces manual-review.',
    'ExecutableScience supports automation.'
  ]) await s.process(line);
  const summary = await s.process('Summarize ExecutableScience.');
  assert.match(summary, /^Summary of/);
  assert.match(summary, /reproducibility/i);
  assert.match(summary, /automation/i);
  const expansion = await s.process('Write a short paragraph about ExecutableScience.');
  assert.match(expansion, /^A fuller expansion/);
  assert.match(expansion, /directly stated facts/);
});

test('comparison and KB summary are generated from symbolic state', async () => {
  const s = await createSLLM();
  await s.process('Alice is human and smart.');
  await s.process('Bob is human and cautious.');
  assert.match(await s.process('Compare Alice and Bob.'), /Shared properties: human/);
  assert.match(await s.process('Summarize the knowledge base.'), /knowledge base contains/i);
});

test('reflection inspects proofs and missing premises', async () => {
  const s = await createSLLM();
  await s.process('Every researcher is curious.');
  await s.process('If X is researcher and X is curious and X is creative then X is innovative.');
  await s.process('Bob is a researcher.');
  const reflection = await s.process('Reflect on whether Bob is innovative.');
  assert.match(reflection, /cannot currently derive/i);
  assert.match(reflection, /creative/i);
  const missing = await s.process('What would make Bob innovative?');
  assert.match(missing, /creative/i);
});

test('chart grammar handles conjunction depth compositionally instead of ParseIfN templates', async () => {
  const trace = new Trace(false);
  const s = await createSLLM({ trace });
  trace.events.length = 0;
  assert.equal(await s.process('If X is human and X is smart and X is creative and X likes Y then X trusts Y.'), 'Learned.');
  assert.ok(trace.events.some(e => e.type === 'chart' && e.production === 'IfSentence'));
  const expands = trace.events.filter(e => e.type === 'expand').map(e => e.circuit);
  assert.ok(!expands.some(x => /^ParseIf(One|Two|Three)$/.test(x)));
  assert.ok(expands.filter(x => x === 'ChartConditionsAnd').length >= 3);
});

test('runtime can inspect its previous explicit symbolic execution trace', async () => {
  const s = await createSLLM();
  await s.process('Alice is human.');
  await s.process('Is Alice human?');
  const introspection = await s.process('Inspect your last reasoning.');
  assert.match(introspection, /virtual circuit used/i);
  assert.match(introspection, /expansions/);
  assert.match(introspection, /Datalog-guided selections/);
});
