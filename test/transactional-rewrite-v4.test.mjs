import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSLLM } from '../src/sllm.mjs';
import { Trace } from '../src/kernel/trace.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ext = path.resolve(here, '..', 'extensions', 'transaction-probe');

test('failed candidate rolls back KB, lexicon and grammar before rewrite', async () => {
  const trace = new Trace(false);
  const s = await createSLLM({ extensions: [ext], trace, learnedRoots: [] });
  trace.events.length = 0;
  assert.equal(await s.run('TxProbeRoot', { value: { kind: 'go' } }), 'fallback-ok');
  assert.equal(s.snapshot().unary.some(x => x[1] === 'temporary_fact'), false);
  assert.equal(s.grammar.rules.some(r => r.name === 'TemporaryGrammar'), false);
  const token = s.language.classify({ surface: 'blorp', norm: 'blorp', classes: [], lemmas: {} });
  assert.equal(token.classes.includes('temporaryClass'), false);
  assert.ok(trace.events.some(e => e.type === 'tx-rollback'));
  assert.ok(trace.events.some(e => e.type === 'rewrite' && e.from === 'TxWriteThenFail' && e.to === 'TxFallback'));
});
