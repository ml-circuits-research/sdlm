import test from 'node:test';
import assert from 'node:assert/strict';
import { createSLLM } from '../src/sllm.mjs';
import { Trace } from '../src/kernel/trace.mjs';

test('chart parser composes arbitrarily long condition lists from one recursive grammar rule', async () => {
  const trace = new Trace(false);
  const s = await createSLLM({ trace, learnedRoots: [] });
  for (const x of ['Alice is human.','Alice is smart.','Alice is creative.','Alice likes Bob.']) await s.process(x);
  trace.events.length = 0;
  await s.process('If X is human and X is smart and X is creative and X likes Y then X trusts Y.');
  assert.equal(await s.process('Does Alice trust Bob?'), 'Yes.');
  assert.ok(trace.events.some(e => e.type === 'chart' && e.production === 'IfSentence'));
  assert.ok(trace.events.filter(e => e.type === 'expand' && e.circuit === 'ChartConditionsAnd').length >= 3);
});

test('surface length differences caused by articles use grammar productions rather than token offsets in JS', async () => {
  const s = await createSLLM({ learnedRoots: [] });
  await s.process('Every human is mortal.');
  await s.process('Every scientist is a human.');
  await s.process('Ada is a scientist.');
  assert.equal(await s.process('Is Ada mortal?'), 'Yes.');
});
