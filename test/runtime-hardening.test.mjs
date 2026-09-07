import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from './helpers/runtime.mjs';
import { parseCircuit } from '../src/kernel/sop-loader.mjs';
import { EffectAnalyzer } from '../src/kernel/effect-analyzer.mjs';
import { registerPrimitive } from '../src/kernel/primitive-registry.mjs';

const temporary = async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-hardening-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
};

test('a failed concurrent request preserves a successful request and the queue recovers', async () => {
  const s = await createSDLM({ learnedRoots: [] });
  const results = await Promise.allSettled([
    s.process('Alice likes Bob.'), s.process('If X is human and X is smart and X likes Y then Y is.')
  ]);
  assert.equal(results[0].value, 'Learned.');
  assert.equal(results[1].status, 'rejected');
  assert.equal(await s.process('Does Alice like Bob?'), 'Yes.');
  assert.equal(s.transactions.active.size, 0);
});

test('unsafe rules are rejected before mutation on either backend', async () => {
  const s = await createSDLM({ learnedRoots: [] });
  await s.process('Alice is human.');
  const before = s.snapshot();
  await assert.rejects(s.process('If X is human then Y is mortal.'), /unbound head variable/);
  assert.deepEqual(s.snapshot(), before);
});

test('modal learning preserves meaning across restart and rejection leaves no published circuits', async t => {
  const root = await temporary(t);
  let s = await createSDLM({ learnedRoots: [] });
  const before = { circuits: s.circuits.size, grammar: s.grammar.rules.length };
  await assert.rejects(s.learnParaphrase([
    { surface: 'Alice is human.', canonical: 'Alice is mortal.' },
    { surface: 'Bob is human.', canonical: 'Bob is mortal.' }
  ], { learnedRoot: root }), /validation failed/);
  assert.deepEqual({ circuits: s.circuits.size, grammar: s.grammar.rules.length }, before);
  assert.deepEqual(await fs.readdir(root), []);
  await s.learnParaphrase([
    { surface: 'Able Alice.', canonical: 'Alice can help Bob.' },
    { surface: 'Able Carol.', canonical: 'Carol can help Bob.' }
  ], { learnedRoot: root });
  s = await createSDLM({ learnedRoots: [root] });
  await s.process('Able Dana.');
  assert.equal(await s.process('Can Dana help Bob?'), 'Yes.');
  assert.match(await s.process('Does Dana help Bob?'), /^Unknown/);
});

test('activation never drops coercively matching or unconstrained circuits', async () => {
  const s = await createSDLM({ learnedRoots: [] });
  for (const [name, source] of [
    ['AuditGuard', '@input value\n@ok valueFieldIs\n value $value\n name "count"\n expected 7\n@output result $ok'],
    ['AuditConstant', '@ok constant\n value true\n@output result $ok']
  ]) s.circuits.set(name, parseCircuit(source, { name, group: 'audit', file: '<test>' }));
  s.selector.refresh();
  assert.equal(await s.run('AuditGuard', { value: { count: '7' } }), true);
  assert.deepEqual(s.selector.selectAll('audit', { value: { count: '7' } }).map(c => c.circuit).sort(),
    ['AuditConstant', 'AuditGuard']);
});

test('effect analysis propagates writes through recursion regardless of query order', () => {
  const primitives = new Map();
  registerPrimitive(primitives, 'writeState', () => true, { effect: 'write' });
  const circuits = new Map();
  for (const [name, source] of [
    ['A', '@b B\n@w writeState\n@output result $w'], ['B', '@a A\n@output result $a']
  ]) circuits.set(name, parseCircuit(source, { name, group: 'test', file: '<test>' }));
  for (const order of [['A', 'B'], ['B', 'A']]) {
    const analyzer = new EffectAnalyzer({ circuits, primitives });
    for (const name of order) assert.equal(analyzer.circuitEffect(name), 'write');
    assert.equal(analyzer.isSpeculativelySafe('B'), false);
  }
});

test('trace retention is bounded and recursive execution stops with a reusable instance', async () => {
  const s = await createSDLM({ learnedRoots: [], maxTraceEvents: 40 });
  await s.process('Alice is human.');
  assert.ok(s.trace.events.length <= 40);
  assert.ok(s.inspect().lastAudit.expansions > 0);
  s.circuits.set('Loop', parseCircuit('@again Loop\n@output result $again', { name: 'Loop', group: 'test', file: '<test>' }));
  await assert.rejects(s.run('Loop'), /limit exceeded|budget exceeded/);
  assert.equal(await s.process('Is Alice human?'), 'Yes.');
});

test('knowledge save, retraction and a session snapshot preserve exact state and learned competence', async t => {
  const root = await temporary(t);
  const s = await createSDLM({ learnedRoots: [] });
  await s.processBatch(['Every human is mortal.', 'Alice is human.']);
  await s.forget('Alice is human.');
  assert.match(await s.process('Is Alice mortal?'), /^Unknown/);
  await s.process('Bob can help Alice.');
  await s.saveCircuitPack(path.join(root, 'knowledge'));
  const imported = await createSDLM({ extensions: [path.join(root, 'knowledge')], learnedRoots: [] });
  assert.equal(await imported.process('Can Bob help Alice?'), 'Yes.');
  await s.saveSessionPack(path.join(root, 'session'));
  const restored = await createSDLM({ sessionRoot: path.join(root, 'session'), learnedRoots: [] });
  assert.deepEqual(restored.snapshot(), s.snapshot());
  await assert.rejects(s.saveCircuitPack(path.join(root, 'knowledge')), /already exists/);
});

test('a multi-line request rolls back every line when a later line fails', async () => {
  const s = await createSDLM({ learnedRoots: [] });
  await assert.rejects(s.processBatch(['Alice is human.', 'Unparseable qqq.']));
  assert.equal(s.snapshot().unary.length, 0);
});
