#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { createSLLM } from './sllm.mjs';

const args = process.argv.slice(2);
let trace = false;
const extensions = [];
let file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--trace') trace = true;
  else if (args[i] === '--extension') extensions.push(path.resolve(args[++i]));
  else file = args[i];
}

const sllm = await createSLLM({ trace, extensions });
console.error(`Datalog backend: ${sllm.engine}`);

async function handle(line) {
  const text = line.trim();
  if (!text || text.startsWith('#')) return;
  try {
    const result = await sllm.process(text);
    console.log(`> ${text}\n${result}`);
  } catch (error) {
    console.log(`> ${text}\nERROR: ${error.message}`);
  }
}

if (file) {
  const text = await fs.readFile(file, 'utf8');
  for (const line of text.split(/\r?\n/)) await handle(line);
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: 'sllm> ' });
  rl.prompt();
  rl.on('line', async line => { await handle(line); rl.prompt(); });
}
