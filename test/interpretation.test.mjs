import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from './helpers/runtime.mjs';
import { createApiServer } from '../src/api/server.mjs';
import { segments } from '../src/interpretation/respond.mjs';

const runtime = options => createSDLM({ learnedRoots: [], ...options });
async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-interpretation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('Socrate response records the actual name and temporal decisions before executing the query', async () => {
  const s = await runtime();
  const results = await s.respondDetailed(['Socrate is a human. All humans die. Is Scorate going to die?']);
  assert.equal(results.length, 3);
  const result = results[2];
  assert.equal(result.answer.status, 'true');
  assert.deepEqual(result.assumptions.map(item => item.category), ['temporal-projection', 'entity-resolution']);
  assert.equal(result.command.payload.args[0].value, 'socrate');
  assert.equal(result.command.payload.qualifier, null);
  assert.equal(result.assumptions[1].evidence.alternatives[0].distance, 1);
  assert.match(result.text, /Support: die\(socrate\) from human\(socrate\)/);
  assert.equal(result.proof.support.rule.head.predicate, 'die');
  const selected = s.trace.events.findLastIndex(event => event.type === 'interpretation-selected');
  assert.ok(selected >= 0);
  assert.deepEqual(s.trace.events[selected].assumptions, result.assumptions);
  assert.ok(s.trace.events.slice(selected + 1).length > 0);
  await s.rejectAssumption(result.assumptions[1].id, 'These are different people');
  const corrected = (await s.respondDetailed(['Does Scorate die?']))[0];
  assert.equal(corrected.answer.status, 'unknown');
  assert.equal(corrected.command.payload.args[0].value, 'scorate');
  assert.equal((await s.respondDetailed(['Does Socrate die?']))[0].answer.status, 'true');
});

test('unknown unary and binary verbs become inspectable hypotheses across different entities', async () => {
  const s = await runtime();
  const results = await s.respondDetailed(['Mara is human. Every human glimmers. Does Mara glimmer?']);
  assert.equal(results[2].answer.status, 'true');
  const assumedRule = results[1].assumptions[0];
  assert.equal(assumedRule.value, 'glimmer');
  assert.equal(assumedRule.evidence.transformation.suffix, 's');
  assert.ok(results[2].dependencies.includes(assumedRule.id));
  const binary = await s.respondDetailed(['Mara zorps Ivo. Does Mara zorp Ivo?']);
  assert.equal(binary[1].answer.status, 'true');
  assert.equal(binary[0].command.payload.args.length, 2);
  const rejected = await s.rejectAssumption(assumedRule.id, 'This verb classification is wrong');
  assert.equal(rejected.removed[0].kind, 'rule');
  assert.equal((await s.respondDetailed(['Does Mara glimmer?']))[0].answer.status, 'unknown');
  assert.equal((await s.respondDetailed(['Does Mara zorp Ivo?']))[0].answer.status, 'true');
});

test('rejection retains independent explicit support and invalidates saved dependent values after restart', async t => {
  const s = await runtime();
  const result = (await s.respondDetailed(['Mara glimmers.']))[0];
  const id = result.assumptions[0].id;
  await s.bind('answer', result);
  await s.runTask('RenderEnglish', { answer: { $ref: 'answer.answer' } }, 'rendered');
  // An independent explicit assertion of the same atom must survive rejection.
  await s.run('ExecuteCommand', { command: result.command });
  const root = await temporary(t);
  await s.saveSessionPack(path.join(root, 'snapshot'));
  const resumed = await runtime({ sessionRoot: path.join(root, 'snapshot') });
  const rejected = await resumed.rejectAssumption(id);
  assert.deepEqual(rejected.removed, []);
  assert.ok(rejected.invalidated_values.includes('answer'));
  assert.ok(rejected.invalidated_values.includes('rendered'));
  assert.throws(() => resumed.resolve('answer.answer'), /Unknown value reference/);
  assert.equal((await resumed.respondDetailed(['Does Mara glimmer?']))[0].answer.status, 'true');
  await resumed.saveSessionPack(path.join(root, 'corrected'));
  const corrected = await runtime({ sessionRoot: path.join(root, 'corrected') });
  assert.equal(corrected.assumptions().decisions.find(item => item.id === id).status, 'rejected');
  assert.throws(() => corrected.resolve('rendered'), /Unknown value reference/);
});

test('rejected tentative knowledge stays retracted after a session restore and cannot be exported without provenance', async t => {
  const s = await runtime();
  const result = (await s.respondDetailed(['Mara glimmers.']))[0];
  const root = await temporary(t);
  await assert.rejects(s.saveCircuitPack(path.join(root, 'unsafe-export')), /assumption dependencies/);
  await s.rejectAssumption(result.assumptions[0].id);
  await s.saveSessionPack(path.join(root, 'snapshot'));
  const resumed = await runtime({ sessionRoot: path.join(root, 'snapshot') });
  assert.equal((await resumed.respondDetailed(['Does Mara glimmer?']))[0].answer.status, 'unknown');
  assert.equal(resumed.assumptions().feedback.length, 1);
});

test('partial responses retain useful sentences and expose missing premises without inventing facts', async () => {
  const s = await runtime();
  const results = await s.respondDetailed(['Every human dies. Explain the meaning of the universe. Does Mara die?']);
  assert.equal(results[1].status, 'unresolved');
  assert.doesNotMatch(results[1].text, /No candidates|NoMatch|ERROR/);
  assert.equal(results[2].hypothesis.asserted, false);
  assert.equal(results[2].hypothesis.premises[0].predicate, 'human');
  assert.equal(results[2].answer.status, 'unknown');
  assert.equal(s.inspect().facts, 0);
  assert.equal(s.assumptions().gaps.length, 1);
  await s.respond('Mara is human.');
  assert.equal((await s.respondDetailed(['Does Mara die?']))[0].answer.status, 'true');
});

test('tied name guesses disclose alternatives, exact entities are preserved, and contradiction is retained', async () => {
  const s = await runtime();
  await s.respond('Lana is human. Lara is not human.');
  const guessed = (await s.respondDetailed(['Is Lama human?']))[0];
  const decision = guessed.assumptions.find(item => item.category === 'entity-resolution');
  assert.deepEqual(decision.evidence.alternatives.map(item => item.value), ['lana', 'lara']);
  assert.equal((await s.respondDetailed(['Is Lara human?']))[0].answer.status, 'false');
  await s.respond('Lana is not human.');
  assert.equal((await s.respondDetailed(['Is Lana human?']))[0].answer.status, 'both');
});

test('punctuation repair is disclosed and segmentation preserves decimal text', async () => {
  const s = await runtime();
  const results = await s.respondDetailed(['Mara is human', 'Does Mara run']);
  assert.equal(results[0].command.kind, 'assertFact');
  assert.equal(results[0].assumptions[0].category, 'sentence-boundary');
  assert.equal(results[1].command.kind, 'askBoolean');
  assert.equal(results[1].assumptions[0].value, '?');
  assert.deepEqual(segments('Value is 3.5. Is it 3.5?'), ['Value is 3.5.', 'Is it 3.5?']);
});

test('strict execution still rejects gaps, learned competence precedes guesses, and request failures roll back decisions', async t => {
  const s = await runtime();
  await assert.rejects(s.process('Every human glimmers.'));
  await s.learnParaphrase([
    { surface: 'Able Alice.', canonical: 'Alice can help Bob.' },
    { surface: 'Able Carol.', canonical: 'Carol can help Bob.' }
  ], { learnedRoot: await temporary(t) });
  assert.equal(await s.respond('Able Dana.'), 'Learned.');
  assert.equal(await s.respond('Can Dana help Bob?'), 'Yes.');
  const before = s.assumptions();
  await assert.rejects(s.respondDetailed(['Mara glimmers.', 'If X is human then Y is mortal.']), /unbound head variable/);
  assert.deepEqual(s.assumptions(), before);
  assert.equal((await s.respondDetailed(['Does Mara glimmer?']))[0].answer.status, 'unknown');
});

test('HTTP conversation metadata, session history and rejection expose the same assumptions', async t => {
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
  await call('/v1/sessions', { id: 'assisted' });
  const body = { model: 'sdlm', session_id: 'assisted', messages: [{ role: 'user',
    content: 'Socrate is a human. All humans die. Is Scorate going to die?' }] };
  const first = await call('/v1/chat/completions', body);
  assert.equal(first.sdlm.executed_inputs, 3);
  assert.equal(first.sdlm.assumptions.length, 2);
  const history = await call('/v1/sessions/assisted');
  const second = await call('/v1/chat/completions', { ...body,
    messages: [...history.messages, { role: 'user', content: 'Does Socrate die?' }] });
  assert.equal(second.sdlm.ignored_messages, 2);
  assert.equal(second.sdlm.executed_inputs, 1);
  const rejected = await call('/v1/sessions/assisted/reject', { id: first.sdlm.assumptions[1].id, reason: 'Different person' });
  assert.ok(rejected.invalidated_values.includes('turn_1'));
  const audit = await call('/v1/sessions/assisted/assumptions');
  assert.equal(audit.feedback.length, 1);
  const stateless = await call('/v1/chat/completions', { model: 'sdlm', messages: [{ role: 'user',
    content: 'Mara glimmers. Does Mara glimmer?' }] });
  assert.equal(stateless.sdlm.results.at(-1).answer.status, 'true');
  assert.ok(stateless.sdlm.assumptions.length > 0);
});

test('ambiguity commits only the declared choice and rejection reverses that choice', async () => {
  const s = await runtime();
  const result = (await s.respondDetailed(['Alice saw Bob with Carol.']))[0];
  const choice = result.assumptions.find(item => item.category === 'parse-choice');
  assert.ok(choice);
  assert.ok(choice.evidence.alternatives.length > 1);
  assert.ok(s.inspect().facts > 0);
  await s.rejectAssumption(choice.id);
  assert.equal(s.inspect().facts, 0);
});

test('aggregate context is separate from established dependencies and value IDs survive source-value eviction', async () => {
  const s = await runtime();
  const result = (await s.respondDetailed(['Mara glimmers.']))[0];
  await s.bind('source', result);
  await s.runTask('RenderEnglish', { answer: { $ref: 'source.answer' } }, 'derived');
  const summary = (await s.respondDetailed(['Summarize the knowledge base.']))[0];
  // The installed summary may not have a complete dependency tree; it must expose the session context.
  assert.equal(summary.answer.kind, 'kbSummary');
  assert.ok(summary.assumptions.length + summary.context_assumptions.length > 0);
  for (let i = 0; i < 199; i++) await s.bind(`filler${i}`, i);
  assert.throws(() => s.resolve('source'), /Unknown value reference/);
  assert.equal(s.resolve('derived'), 'Learned.');
  await s.rejectAssumption(result.assumptions[0].id);
  assert.throws(() => s.resolve('derived'), /Unknown value reference/);
  await s.bind('rebound', result);
  assert.throws(() => s.resolve('rebound'), /Unknown value reference/);
});
