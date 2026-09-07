import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from './helpers/runtime.mjs';
import { createApiServer } from '../src/api/server.mjs';

const fresh = options => createSDLM({ learnedRoots: [], ...options });
const ask = async (s, input) => (await s.respondDetailed([input])).at(-1);
const focus = s => s.preferences().quantity_context ?? [];
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-quantity-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('the reported egg problem computes seven and records the decisions that caused the update', async () => {
  const s = await fresh();
  const results = await s.respondDetailed(['Jgon has 3 eggs. He received 4. How many eggs he has now?']);
  assert.deepEqual(results.map(r => r.command.kind), ['setValue', 'adjustNumber', 'readValue']);
  assert.equal(results[2].answer.value, 7);
  assert.equal(results[1].answer.atom.predicate, 'count_egg');
  assert.deepEqual(results[1].answer.computation, { operation: 'add', left: 3, right: 4 });
  assert.deepEqual(results[0].assumptions, []);
  const owner = results[1].assumptions.find(a => a.category === 'pronoun-resolution');
  const item = results[1].assumptions.find(a => a.category === 'omitted-item');
  assert.equal(owner.value, 'jgon');
  assert.equal(item.value, 'egg');
  assert.equal(item.evidence.selected.value, 3);
  assert.equal(item.evidence.selected.atom.args[1].value, '3');
  assert.ok(results[2].assumptions.some(a => a.category === 'question-normalization'));
  assert.ok(results[2].dependencies.includes(owner.id));
  assert.ok(results[2].dependencies.includes(item.id));
  const selected = s.trace.events.find(e => e.type === 'interpretation-selected' && e.input === 'He received 4.');
  assert.ok(selected.assumptions.some(a => a.id === item.id));
  assert.doesNotMatch(results.map(r => r.text).join('\n'), /unary class|What should I work out|known quantity owner yet/);
  assert.equal(s.assumptions().gaps.length, 0);
});

test('quantity language generalizes across names, items, verbs and question order', async () => {
  const s = await fresh();
  for (const [name, item, start, gain, loss, pronoun] of [
    ['Lina', 'coins', 19, 7, 3, 'She'], ['Niko', 'marbles', 4, 9, 2, 'He'],
    ['Ravi', 'boxes', 8, 2, 1, 'They'], ['Robot', 'pens', 0, 6, 4, 'It']
  ]) {
    await s.respond(`${name} has ${start} ${item}. ${pronoun} received ${gain} more. ${pronoun} lost ${loss}.`);
    for (const input of [`How many ${item} does ${name} have?`, `How many ${item} ${pronoun} has now?`,
      `How many ${item} do ${pronoun} have?`, `How many ${item} has ${name}?`,
      `How many does ${pronoun} have left?`, `How many ${item} are left?`, 'How many now?']) {
      assert.equal((await ask(s, input)).answer?.value, start + gain - loss, input);
    }
  }
  for (const verb of ['got', 'gained', 'found', 'bought']) {
    await s.respond('Lina has 2 eggs.');
    assert.equal((await ask(s, `Lina ${verb} 3 eggs.`)).answer.value, 5, verb);
  }
  for (const verb of ['ate', 'used', 'spent', 'sold', 'gave']) {
    await s.respond('Niko has 8 eggs.');
    assert.equal((await ask(s, `Niko ${verb} 3.`)).answer.value, 5, verb);
  }
});

test('recency uses the explicit owner or item and exposes competing candidates', async () => {
  const s = await fresh();
  await s.respond('Nora has 3 eggs. Cora has 9 coins.');
  assert.equal((await ask(s, 'She received 2 eggs.')).command.payload.subject.value, 'nora');
  assert.equal((await ask(s, 'Cora received 4.')).answer.value, 13);
  await s.respond('Nora has 6 apples.');
  const inferred = await ask(s, 'Nora received 1.');
  assert.equal(inferred.answer.atom.predicate, 'count_apple');
  assert.equal(inferred.answer.value, 7);
  const item = inferred.assumptions.find(a => a.category === 'omitted-item');
  assert.deepEqual(item.evidence.alternatives.map(a => a.predicate), ['count_apple', 'count_egg']);
  await s.respond('Cora has 10 eggs.');
  const pronoun = await ask(s, 'She received 2 eggs.');
  const owner = pronoun.assumptions.find(a => a.category === 'pronoun-resolution');
  assert.equal(owner.value, 'cora');
  assert.deepEqual(owner.evidence.alternatives.map(a => a.subject), ['cora', 'nora']);
  assert.match(owner.reason, /no gender/);
  assert.equal((await ask(s, 'How many eggs does Nora have?')).answer.value, 5);
});

test('missing context gets a quantity-specific clarification without asserting a pronoun or inventing zero', async () => {
  const s = await fresh();
  for (const input of ['He received 4.', 'He has 3 eggs.', 'How many eggs he has now?', 'How many left?']) {
    const result = await ask(s, input);
    assert.equal(result.answer.kind, 'chat', input);
    assert.equal(result.answer.status, 'unknown', input);
    assert.match(result.text, /known quantity owner/);
    assert.deepEqual(result.assumptions, []);
  }
  assert.match(await s.respond('Jgon received 4.'), /Which item is being counted for Jgon/);
  assert.match(await s.respond('Jgon received 4 eggs.'), /starting quantity/);
  assert.equal(s.inspect().facts, 0);
  assert.deepEqual(focus(s), []);
  assert.match(await s.respond('I have 3 eggs.'), /known quantity owner/);
  await s.respond('My name is Jgon. I have 3 eggs. I received 4.');
  const result = await ask(s, 'How many eggs do I have now?');
  assert.equal(result.answer.value, 7);
  assert.ok(result.assumptions.some(a => a.category === 'speaker-reference'));
});

test('unsupported quantity fragments and impossible updates do not corrupt counts or focus', async () => {
  const s = await fresh();
  await s.respond('Nora has 3 eggs. Cora has 5 coins.');
  const prior = focus(s);
  const failed = await ask(s, 'Nora lost 9 eggs.');
  assert.equal(failed.answer.kind, 'operationGap');
  assert.deepEqual(focus(s), prior);
  for (const input of ['Nora has -2 eggs.', 'Nora received 4 eggs and 2 coins.',
    'Nora gave 2 eggs to Cora.', 'Nora has 4 more eggs.', 'Nora has 4 more.', 'How many more eggs?', 'How many more?']) {
    const result = await ask(s, input);
    assert.equal(result.status, 'unresolved', input);
    assert.deepEqual(focus(s), prior, input);
  }
  assert.equal((await ask(s, 'How many eggs does Nora have?')).answer.value, 3);
  assert.equal((await ask(s, 'How many coins does Cora have?')).answer.value, 5);
  const signed = await ask(s, 'She gets -2 coins.');
  assert.equal(signed.command.payload.subject.value, 'cora');
  assert.equal(signed.answer.value, 3);
  assert.equal((await ask(s, 'She lost -2 coins.')).answer.value, 5);
  await assert.rejects(s.process('He received 4.'));
});

test('unregistered inventory nouns describe the actual counted-item decision', async () => {
  const s = await fresh();
  const result = await ask(s, 'Dara has 6 zibbles.');
  const item = result.assumptions.find(a => a.category === 'item-classification');
  assert.equal(item.value, 'zibble');
  assert.match(item.reason, /item being counted/);
  assert.doesNotMatch(item.reason, /unary class|quantified subject/);
  assert.equal((await ask(s, 'They received 2.')).answer.value, 8);
  assert.equal((await ask(s, 'How many zibbles does Dara have?')).answer.value, 8);
});

test('answer-only mode shows the final quantity while keeping every update and assumption inspectable', async () => {
  const s = await fresh();
  const input = 'Jgon has 3 eggs. He received 4. How many eggs he has now?';
  const results = await s.respondDetailed([input], { verbosity: 'answer' });
  assert.deepEqual(results.map(r => r.text), ['', '', '7.']);
  assert.equal(results[1].answer.value, 7);
  assert.equal(results[1].assumptions.length, 2);
  assert.equal(await s.respond('Jgon received 1 egg.'), '8.');
  assert.match(await s.respond('Jgon lost 100 eggs. How many eggs does Jgon have?'), /exceeds/);
  assert.equal(await s.respond('How many eggs does Jgon have? How many eggs he has now?'), '8.\n8.');
});

test('focus persists through SOP restart, remains isolated and is bounded', async t => {
  const s = await fresh();
  await s.respond('Nora has 5 eggs. Cora has 8 coins.');
  const saved = path.join(await temporary(t), 'saved');
  await s.saveSessionPack(saved);
  const resumed = await fresh({ sessionRoot: saved });
  assert.deepEqual(focus(resumed), focus(s));
  assert.equal((await ask(resumed, 'She received 4.')).answer.value, 12);
  assert.equal((await ask(resumed, 'How many coins she has now?')).answer.value, 12);
  const other = await fresh();
  assert.equal((await ask(other, 'She received 4.')).answer.status, 'unknown');
  assert.equal((await ask(s, 'How many coins does Cora have?')).answer.value, 8);
  await resumed.respond(Array.from({ length: 20 }, (_, i) => `Owner${i} has ${i} eggs.`).join(' '));
  assert.equal(focus(resumed).length, 16);
  assert.equal(focus(resumed)[0].subject, 'owner19');
});

test('rejecting an omitted item retracts dependent replacement counts and saved values after restart', async t => {
  const s = await fresh();
  await s.respond('Jgon has 3 eggs.');
  const changed = await ask(s, 'He received 4.');
  const id = changed.assumptions.find(a => a.category === 'omitted-item').id;
  const result = await ask(s, 'How many eggs he has now?');
  await s.bind('inventory', result);
  const saved = path.join(await temporary(t), 'saved');
  await s.saveSessionPack(saved);
  const resumed = await fresh({ sessionRoot: saved });
  await resumed.rejectAssumption(id, 'The received items were not eggs');
  assert.throws(() => resumed.resolve('inventory'), /Unknown value reference/);
  assert.equal((await ask(resumed, 'How many eggs does Jgon have?')).answer.kind, 'operationGap');
  assert.equal((await ask(resumed, 'He received 1.')).answer.status, 'unknown');
  assert.deepEqual(await resumed.run('ReadQuantityContexts', { match: {} }), []);
  await resumed.respond('Jgon has 3 eggs.');
  assert.equal((await ask(resumed, 'How many eggs does Jgon have?')).answer.value, 3);
});

test('a failed request rolls back focus and counts together; retraction excludes stale focus', async () => {
  const s = await fresh();
  await s.respond('Nora has 3 eggs.');
  const prior = focus(s);
  await assert.rejects(s.respond('Cora has 9 coins. If X is human then Y is mortal.'), /unbound head variable/);
  assert.deepEqual(focus(s), prior);
  const update = await ask(s, 'He received 2.');
  assert.equal(update.answer.value, 5);
  await s.rejectAssumption(update.assumptions.find(a => a.category === 'pronoun-resolution').id);
  assert.deepEqual(await s.run('ReadQuantityContexts', { match: {} }), []);
  assert.equal((await ask(s, 'She received 1.')).answer.status, 'unknown');
});

test('API continuation ignores the processed prefix and applies an omitted-item gain once', async t => {
  const server = createApiServer({ sessions: await temporary(t) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, body) => {
    const response = await fetch(base + route, { method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    assert.equal(response.ok, true, await response.clone().text());
    return response.json();
  };
  await call('/v1/sessions', { id: 'quantities' });
  const body = { model: 'sdlm', session_id: 'quantities', verbosity: 'answer' };
  await call('/v1/chat/completions', { ...body, messages: [{ role: 'user', content: 'Jgon has 3 eggs.' }] });
  const history = await call('/v1/sessions/quantities');
  const gain = await call('/v1/chat/completions', { ...body, messages: [...history.messages,
    { role: 'user', content: 'He received 4.' }] });
  assert.equal(gain.choices[0].message.content, '7.');
  const continued = await call('/v1/sessions/quantities');
  const result = await call('/v1/chat/completions', { ...body, messages: [...continued.messages,
    { role: 'user', content: 'How many eggs he has now?' }] });
  assert.equal(result.choices[0].message.content, '7.');
  assert.equal(result.sdlm.ignored_messages, 4);
  assert.equal(result.sdlm.executed_inputs, 1);
  assert.ok(result.sdlm.results[0].assumptions.some(a => a.category === 'omitted-item'));
});
