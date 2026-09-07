import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSDLM } from './sd_lm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pack = path.resolve(here, '..', 'extensions', 'document-atlas');
const sdlm = await createSDLM();

console.log('Before installing document circuits:');
console.log(await sdlm.process('Is Architecture auditable?'));

const installed = await sdlm.installCircuitPack(pack);
console.log(`\nInstalled ${installed.circuits.length} SOP circuits from the document pack.`);

for (const question of [
  'Did Atlas start in 2024?',
  'Can Atlas reconstruct Evidence?',
  'What does PronounIt refer to?',
  'Who reported EvidenceClaim?',
  'What does KnowledgeCircuit mean?',
  'Is Architecture auditable?',
  'Why is Architecture auditable?',
  'Summarize Atlas.'
]) {
  console.log(`\n> ${question}`);
  console.log(await sdlm.process(question));
}
