import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSLLM } from '../src/sllm.mjs';

test('paired surface/canonical examples synthesize inspectable SOP circuits and survive restart', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-sllm-learn-'));
  let s = await createSLLM({ learnedRoots: [] });
  const learned = await s.learnParaphrase([
    { surface: 'Tell me about Alice.', canonical: 'Summarize Alice.' },
    { surface: 'Tell me about Bob.', canonical: 'Summarize Bob.' }
  ], { learnedRoot: root });
  const semantic = await fs.readFile(learned.files[0], 'utf8');
  const installer = await fs.readFile(learned.files[1], 'utf8');
  assert.match(semantic, /@command\d+ makeCommand/);
  assert.match(semantic, /chartTerm/);
  assert.match(installer, /addGrammarRule/);
  assert.match(installer, /grammarToken/);
  assert.match(installer, /value "tell"/);
  assert.match(await s.process('Tell me about Carol.'), /Carol|describe Carol/i);

  s = await createSLLM({ learnedRoots: [root] });
  assert.match(await s.process('Tell me about Dana.'), /Dana|describe Dana/i);
});
