import assert from 'node:assert/strict';
import { createSDLM } from './sd_lm.mjs';

const s = await createSDLM({ backend: 'external' });
assert.equal(s.engine, '@suss/datalog', 'External @suss/datalog is not installed/loaded; run npm install first');
await s.process('Every human is mortal.');
await s.process('Alice is human.');
assert.equal(await s.process('Is Alice mortal?'), 'Yes.');
console.log(`External Datalog conformance smoke test passed using ${s.engine}.`);
