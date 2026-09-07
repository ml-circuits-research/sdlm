import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSDLM } from './helpers/runtime.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('All A are B is now part of the base CNL circuits', async () => {
  const s = await createSDLM();
  assert.equal(await s.process('All philosopher are thinker.'), 'Learned.');
  assert.equal(await s.process('Socrates is a philosopher.'), 'Learned.');
  assert.equal(await s.process('Is Socrates a thinker?'), 'Yes.');
});

test('a new verb is still taught by an SOP lexicon circuit only', async () => {
  const s = await createSDLM({ extensions: [path.join(root, 'extensions/admires')] });
  assert.equal(await s.process('Alice admires Bob.'), 'Learned.');
  assert.equal(await s.process('Does Alice admire Bob?'), 'Yes.');
  assert.match(await s.process('Who admires Bob?'), /alice/);
});
