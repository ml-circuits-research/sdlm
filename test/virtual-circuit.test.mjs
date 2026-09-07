import test from 'node:test';
import assert from 'node:assert/strict';
import { createSDLM } from './helpers/runtime.mjs';
import { Trace } from '../src/kernel/trace.mjs';

test('runtime genuinely expands and reduces nested virtual circuits', async () => {
  const trace = new Trace(false);
  const s = await createSDLM({ trace });
  trace.events.length = 0;
  await s.process('Alice is a human.');
  const expands = trace.events.filter(e => e.type === 'expand').map(e => e.circuit);
  const reduces = trace.events.filter(e => e.type === 'reduce').map(e => e.circuit);
  assert.ok(expands.includes('ProcessText'));
  assert.ok(expands.includes('0MicroParser') || expands.includes('AChartParser'));
  assert.ok(expands.includes('MicroPropArticleHuman') || expands.includes('ChartFactSentence'));
  assert.ok(expands.includes('MicroUnaryFact') || expands.includes('InterpretChartAtom'));
  assert.ok(expands.includes('MicroUnaryFact') || expands.includes('ChartAtomUnaryArticle'));
  assert.ok(expands.includes('ExecuteCommand'));
  assert.ok(expands.includes('ExecAssertFact'));
  assert.ok(expands.includes('RenderEnglish'));
  assert.ok(reduces.includes('MicroUnaryFact') || reduces.includes('ChartAtomUnaryArticle'));
  assert.ok(reduces.includes('MicroPropArticleHuman') || reduces.includes('ChartFactSentence'));
  assert.ok(reduces.includes('ProcessText'));
  assert.ok(trace.events.some(e => e.type === 'select' && ['english.microSentence','english.chartSentence'].includes(e.group)));
  assert.ok(expands.includes('MicroUnaryFact') || trace.events.some(e => e.type === 'select' && e.group === 'english.chartAtom'));
  assert.ok(expands.includes('MicroUnaryFact') || trace.events.some(e => e.type === 'chart' && e.production === 'FactSentence'));
  assert.ok(trace.events.some(e => e.type === 'epoch' && e.epoch >= 3));
});

test('If rule causes multiple nested parser selections and expansions', async () => {
  const trace = new Trace(false);
  const s = await createSDLM({ trace });
  trace.events.length = 0;
  await s.process('If X is a parent of Y and Y is a parent of Z then X is an ancestor of Z.');
  const atomSelections = trace.events.filter(e => e.type === 'select' && e.group === 'english.chartAtom');
  assert.ok(atomSelections.length >= 3);
  const relationExpansions = trace.events.filter(e => e.type === 'expand' && e.circuit === 'ChartAtomRelationNoun');
  assert.ok(relationExpansions.length >= 3);
});
