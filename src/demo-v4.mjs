import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from './sd_lm.mjs';

const learnedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-sd_lm-v4-learned-'));
const s = await createSDLM({ learnedRoots: [] });

for (const line of [
  'Alice is human.',
  'Alice is smart.',
  'Alice is creative.',
  'Alice likes Bob.',
  'If X is human and X is smart and X is creative and X likes Y then X trusts Y.'
]) console.log(`${line}\n  -> ${await s.process(line)}`);
console.log(`Does Alice trust Bob?\n  -> ${await s.process('Does Alice trust Bob?')}`);

const learned = await s.learnParaphrase([
  { surface: 'Tell me about Alice.', canonical: 'Summarize Alice.' },
  { surface: 'Tell me about Bob.', canonical: 'Summarize Bob.' }
], { learnedRoot });
console.log('\nInduced:', learned);
console.log(`Tell me about Alice.\n  -> ${await s.process('Tell me about Alice.')}`);

console.log(`\nReflect on whether Alice is smart.\n  -> ${await s.process('Reflect on whether Alice is smart.').catch(e => `[not in current CNL: ${e.message}]`)}`);
