import test from 'node:test';
import assert from 'node:assert/strict';
import { createSLLM } from '../src/sllm.mjs';

test('representative CNL surface forms parse and execute', async () => {
  const s = await createSLLM();
  const learns = [
    'Alice is human.',
    'Bob is a human.',
    'Carol is not human.',
    'Dana is not a human.',
    'Alice likes Bob.',
    'Bob does not like Carol.',
    'Alice is a friend of Bob.',
    'Carol is not a friend of Dana.',
    'Every human is mortal.',
    'No robot is human.',
    'If X likes Y then Y trusts X.'
  ];
  for (const line of learns) assert.equal(await s.process(line), 'Learned.', line);
  for (const q of [
    'Is Alice human?',
    'Is Alice a mortal?',
    'Does Alice like Bob?',
    'Does Bob not like Carol?',
    'Is Alice a friend of Bob?',
    'Who is human?',
    'Who likes Bob?',
    'Who does Alice like?',
    'Why is Alice mortal?',
    'Why does Alice like Bob?',
    'What is known about Alice?'
  ]) assert.doesNotMatch(await s.process(q), /^ERROR/, q);
});
