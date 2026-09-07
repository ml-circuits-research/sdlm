import fs from 'node:fs/promises';
import { createSLLM } from './sllm.mjs';
const s = await createSLLM();
const text = await fs.readFile(new URL('../examples/sllm-v3-demo.sopnl', import.meta.url), 'utf8');
for (const raw of text.split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  try {
    const answer = await s.process(line);
    console.log(`> ${line}\n${answer}\n`);
  } catch (error) {
    console.log(`> ${line}\nERROR: ${error.message}\n`);
  }
}
