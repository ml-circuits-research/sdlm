import test from 'node:test';
import assert from 'node:assert/strict';
import { createSDLM } from './helpers/runtime.mjs';

test('unary inheritance, explicit negation, unknown and bindings', async () => {
  const s = await createSDLM();
  assert.equal(await s.process('Every human is a mortal.'), 'Learned.');
  assert.equal(await s.process('Every mortal is finite.'), 'Learned.');
  assert.equal(await s.process('No finite is a machine.'), 'Learned.');
  assert.equal(await s.process('Alice is a human.'), 'Learned.');
  assert.equal(await s.process('Is Alice a finite?'), 'Yes.');
  assert.equal(await s.process('Is Alice a machine?'), 'No.');
  assert.match(await s.process('Is Alice a reptile?'), /^Unknown:/);
  assert.match(await s.process('Who is a mortal?'), /alice/);
});

test('rules taught through CNL derive a recursive binary closure', async () => {
  const s = await createSDLM();
  for (const line of [
    'Alice is a parent of Bob.',
    'Bob is a parent of Carol.',
    'Carol is a parent of Dana.',
    'If X is a parent of Y then X is an ancestor of Y.',
    'If X is a parent of Y and Y is an ancestor of Z then X is an ancestor of Z.'
  ]) assert.equal(await s.process(line), 'Learned.');
  assert.equal(await s.process('Is Alice an ancestor of Dana?'), 'Yes.');
  assert.match(await s.process('Who is an ancestor of Dana?'), /alice/);
});

test('conjunctive and mixed rules work', async () => {
  const s = await createSDLM();
  for (const line of [
    'Every human that is smart is rational.',
    'Alice is human.',
    'Alice is smart.',
    'Every human that likes Bob is happy.',
    'Alice likes Bob.'
  ]) assert.equal(await s.process(line), 'Learned.');
  assert.equal(await s.process('Is Alice rational?'), 'Yes.');
  assert.equal(await s.process('Is Alice happy?'), 'Yes.');
});

test('four-valued result reports contradiction instead of collapsing it', async () => {
  const s = await createSDLM();
  await s.process('Every human is mortal.');
  await s.process('Alice is human.');
  await s.process('Alice is not mortal.');
  assert.match(await s.process('Is Alice mortal?'), /^Both/);
  const why = await s.process('Why is Alice mortal?');
  assert.match(why, /Support:/);
  assert.match(why, /Refutation:/);
});
