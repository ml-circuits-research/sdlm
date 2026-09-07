import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSLLM } from '../src/sllm.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('a circuit pack adds vocabulary and task phrasings without JavaScript changes', async () => {
  const s = await createSLLM({ extensions: [path.join(root, 'extensions/research-pack')] });
  assert.equal(await s.process('Reviewer validates Paper.'), 'Learned.');
  assert.equal(await s.process('Does Reviewer validate Paper?'), 'Yes.');
  const brief = await s.process('Give a brief on Reviewer.');
  assert.match(brief, /^Summary of Reviewer:/);
  assert.match(brief, /validates Paper/);
});
