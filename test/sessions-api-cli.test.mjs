import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { SessionStore } from '../src/sessions/session-store.mjs';
import { createApiServer } from '../src/api/server.mjs';

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-sessions-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

test('durable sessions isolate knowledge, preserve learning and survive a fresh store', async t => {
  const root = await temporary(t);
  let store = new SessionStore({ root });
  await store.create('one');
  await store.create('two');
  await store.transact('one', runtime => runtime.process('Alice is human.'));
  await assert.rejects(store.transact('one', async runtime => {
    await runtime.process('Bob is human.');
    throw new Error('Abort before durable commit');
  }));
  await store.transact('one', runtime => runtime.learnParaphrase([
    { surface: 'Able Alice.', canonical: 'Alice can help Bob.' },
    { surface: 'Able Carol.', canonical: 'Carol can help Bob.' }
  ], { learnedRoot: path.join(root, 'training') }));
  store = new SessionStore({ root });
  const one = await store.runtime('one');
  const two = await store.runtime('two');
  assert.equal(await one.process('Is Alice human?'), 'Yes.');
  assert.match(await one.process('Is Bob human?'), /^Unknown/);
  assert.match(await two.process('Is Alice human?'), /^Unknown/);
  await one.process('Able Dana.');
  assert.equal(await one.process('Can Dana help Bob?'), 'Yes.');
  await assert.rejects(store.runtime('../one'), /Session ID/);
});

test('CLI help, numbered examples, session continuation and exit codes work through stdin', async t => {
  const root = await temporary(t);
  const run = input => spawnSync(process.execPath, ['src/cli.mjs', '--sessions', root], { input, encoding: 'utf8' });
  const first = run('/help\n/session new cli-test\nAlice is human.\n/quit\n');
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /\/examples \[number\|all\]/);
  const second = run('/session use cli-test\nIs Alice human?\n/example 5\n/quit\n');
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /Yes\./);
  assert.match(second.stdout, /PASS 5\. Document knowledge as circuits/);
  assert.equal(run('/unknown\n').status, 1);
  assert.equal(run('/mode strict\nUnparseable qqq.\n').status, 1);
  assert.equal(run('Please discuss the origin of the universe.\n').status, 0);
});

test('HTTP text compatibility, SSE, durable session history, errors and pack acceptance', async t => {
  const root = await temporary(t);
  const server = createApiServer({ sessions: root, apiKey: 'test-token' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (route, body) => fetch(base + route, {
    method: body === undefined ? 'GET' : 'POST', headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const chat = (content, extra = {}) => ({ model: 'sdlm', messages: [{ role: 'user', content }], ...extra });
  assert.equal((await fetch(base + '/v1/models')).status, 401);
  assert.equal((await (await call('/v1/models')).json()).data[0].id, 'sdlm');
  assert.equal((await call('/v1/sessions', { id: 'api-test' })).status, 201);
  let response = await call('/v1/chat/completions', chat('Alice is human.', { session_id: 'api-test' }));
  assert.equal(response.status, 200, await response.clone().text());
  assert.equal((await response.json()).choices[0].message.content, 'Learned.');
  response = await call('/v1/chat/completions', chat('Is Alice human?', { session_id: 'api-test', stream: true, stream_options: { include_usage: true } }));
  const stream = await response.text();
  assert.match(stream, /chat.completion.chunk/);
  assert.match(stream, /Yes\./);
  assert.match(stream, /data: \[DONE\]/);
  response = await call('/v1/chat/completions', chat('Is Alice human?'));
  assert.match((await response.json()).choices[0].message.content, /^Unknown/);
  assert.equal((await call('/v1/chat/completions', chat('Alice is human.', { tools: [] }))).status, 400);
  assert.equal((await call('/v1/chat/completions', chat('Unparseable qqq.', { interpretation: 'strict' }))).status, 422);
  assert.equal((await call('/v1/chat/completions', chat('Alice is human.', { session_id: '../escape' }))).status, 400);
  const source = '@a makeConstant\n value "delta"\n@f makeUnaryAtom\n subject $a\n predicate "reliable"\n@w kbAssertFact\n atom $f\n@output result $w\n';
  const pack = { files: [{ path: 'agent/bootstrap/AgentFact.sop', source }], tests: [{ input: 'Is Delta reliable?', expected: 'No.' }] };
  assert.equal((await call('/v1/sessions/api-test/packs', pack)).status, 400);
  response = await call('/v1/chat/completions', chat('Is Delta reliable?', { session_id: 'api-test' }));
  assert.match((await response.json()).choices[0].message.content, /^Unknown/);
  pack.tests[0].expected = 'Yes.';
  response = await call('/v1/sessions/api-test/packs', pack);
  assert.equal(response.status, 200, await response.clone().text());
  response = await call('/v1/chat/completions', chat('Is Delta reliable?', { session_id: 'api-test' }));
  assert.match((await response.json()).choices[0].message.content, /^Yes\./);
  const record = await (await call('/v1/sessions/api-test')).json();
  const full = [...record.messages, { role: 'user', content: 'Is Delta reliable?' }];
  response = await call('/v1/chat/completions', { model: 'sdlm', session_id: 'api-test', messages: full });
  assert.equal(response.status, 200, await response.clone().text());
});

test('separate stores serialize session writes and failed snapshot publication preserves the revision', async t => {
  const root = await temporary(t);
  const first = new SessionStore({ root });
  const second = new SessionStore({ root });
  await first.create('shared');
  await Promise.all([
    first.transact('shared', runtime => runtime.process('Alice is human.')),
    second.transact('shared', runtime => runtime.process('Bob is human.'))
  ]);
  const before = await first.read('shared');
  await assert.rejects(first.transact('shared', async runtime => {
    await runtime.process('Carol is human.');
    runtime.saveSessionPack = async () => { throw Object.assign(new Error('Simulated disk full before publication'), { code: 'ENOSPC' }); };
  }), /disk full/);
  assert.equal((await first.read('shared')).revision, before.revision);
  const resumed = await second.runtime('shared');
  assert.equal(await resumed.process('Is Alice human?'), 'Yes.');
  assert.equal(await resumed.process('Is Bob human?'), 'Yes.');
  assert.match(await resumed.process('Is Carol human?'), /^Unknown/);
});
