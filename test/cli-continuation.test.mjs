import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { CommandLine } from '../src/cli/commands.mjs';
import { CliState, appendHistory, HISTORY_LIMIT } from '../src/cli/state.mjs';

async function setup(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-cli-continuation-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
const cli = root => new CommandLine({ sessions: root, remember: true, write() {} });

test('interactive continuation restores selected SOP state and submitted commands without replay', async t => {
  const root = await setup(t);
  const first = await cli(root).start(null, { resume: true });
  assert.ok(first.session);
  await first.handle('Alice is human.');
  await first.handle('/verbosity answer');
  await assert.rejects(first.handle('/bad-command'), /Unknown command/);
  await first.handle('/status');
  await first.handle('/quit');
  const before = await first.store.read(first.session);
  const resumed = await cli(root).start(null, { resume: true });
  assert.equal(resumed.session, first.session);
  assert.equal(resumed.runtime.preferences().response_style, 'answer');
  assert.deepEqual(resumed.inputHistory, ['Alice is human.', '/verbosity answer', '/bad-command', '/status']);
  assert.deepEqual(await resumed.store.read(first.session), before);
  assert.equal(await resumed.runtime.respond('Is Alice human?'), 'Yes.');
  await resumed.handle('/session new other');
  assert.deepEqual(resumed.inputHistory, []);
  assert.equal(resumed.runtime.preferences().response_style, 'explain');
  await resumed.handle('/parse Bob is human.');
  assert.equal((await cli(root).start(null, { resume: true })).session, 'other');
  await resumed.handle(`/session use ${first.session}`);
  assert.ok(resumed.inputHistory.includes('/status'));
  assert.ok(!resumed.inputHistory.includes('/parse Bob is human.'));
  await assert.rejects(resumed.handle('/session use absent'));
  assert.equal((await cli(root).start(null, { resume: true })).session, first.session);
  await resumed.handle('/reset');
  assert.notEqual(resumed.session, first.session);
  assert.deepEqual(resumed.inputHistory, []);
  assert.equal((await cli(root).start(null, { resume: true })).session, resumed.session);
});

test('legacy sessions seed recall from user text and stale pointers recover without mixing stores', async t => {
  const root = await setup(t);
  const legacy = await new CommandLine({ sessions: root, write() {} }).start();
  await legacy.handle('/session new legacy');
  await legacy.handle('Alice is human.');
  const resumed = await cli(root).start(null, { resume: true });
  assert.equal(resumed.session, 'legacy');
  assert.deepEqual(resumed.inputHistory, ['Alice is human.']);
  await resumed.local.rememberSession('deleted');
  assert.equal((await cli(root).start(null, { resume: true })).session, 'legacy');
  const separate = await cli(path.join(root, 'separate')).start(null, { resume: true });
  assert.notEqual(separate.session, 'legacy');
  assert.deepEqual(separate.inputHistory, []);
  const temporary = await cli(root).start();
  await temporary.handle('/status');
  assert.equal(temporary.session, null);
  assert.equal(await temporary.local.lastSession(), 'legacy');
});

test('history is bounded, atomic across writers and independent of semantic revisions', async t => {
  const root = await setup(t);
  const runtime = await cli(root).start(null, { resume: true });
  const record = await runtime.store.read(runtime.session);
  const a = new CliState(root), b = new CliState(root);
  await Promise.all([a.append(runtime.session, '/status'), b.append(runtime.session, '/kb')]);
  assert.deepEqual(new Set(await a.history(runtime.session)), new Set(['/status', '/kb']));
  assert.deepEqual(await runtime.store.read(runtime.session), record);
  let history = [];
  for (let index = 0; index < HISTORY_LIMIT + 2; index++) history = appendHistory(history, `command ${index}`);
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history[0], 'command 2');
  assert.deepEqual(appendHistory(history, '/quit'), history);
  assert.deepEqual(appendHistory(history, history.at(-1)), history);
  assert.deepEqual(appendHistory(history, 'x'.repeat(8193)), history);
  await assert.rejects(a.history('../escape'), /Session ID/);
});


test('batch input does not consume the interactive session and explicit flags remain deterministic', async t => {
  const root = await setup(t);
  const interactive = await cli(root).start(null, { resume: true });
  await interactive.handle('Alice is human.');
  const metadata = await fs.readFile(path.join(root, '.cli-state.json'), 'utf8');
  const run = args => spawnSync(process.execPath, ['src/cli.mjs', '--sessions', root, ...args], {
    input: 'Is Alice human?\n', encoding: 'utf8'
  });
  const batch = run([]);
  assert.equal(batch.status, 0, batch.stderr);
  assert.match(batch.stdout, /Unknown:/);
  const named = run(['--session', interactive.session]);
  assert.equal(named.status, 0, named.stderr);
  assert.match(named.stdout, /Yes\./);
  assert.equal(await fs.readFile(path.join(root, '.cli-state.json'), 'utf8'), metadata);
  const invalid = run(['--session', interactive.session, '--temporary']);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /cannot be combined/);
});
