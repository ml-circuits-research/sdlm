import { createSLLM } from './sllm.mjs';

const s = await createSLLM();
const lines = [
  'Every human is a mortal.',
  'No mortal is a machine.',
  'Alice is a human.',
  'Is Alice a mortal?',
  'Is Alice a machine?',
  'Who is a mortal?',
  'Alice is a parent of Bob.',
  'Bob is a parent of Carol.',
  'If X is a parent of Y then X is an ancestor of Y.',
  'If X is a parent of Y and Y is an ancestor of Z then X is an ancestor of Z.',
  'Is Alice an ancestor of Carol?',
  'Why is Alice a mortal?',
];
for (const line of lines) console.log(`${line}\n  ${String(await s.process(line)).replaceAll('\n','\n  ')}\n`);
