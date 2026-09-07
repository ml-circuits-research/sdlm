import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { publishPack } from '../kernel/pack-storage.mjs';
import { createSDLM } from '../sd_lm.mjs';

export async function installUploadedPack(runtime, body) {
  if (!Array.isArray(body.files) || !body.files.length || body.files.length > 1000) throw new Error('Expected 1 to 1000 SOP files');
  if (!Array.isArray(body.tests) || !body.tests.length || body.tests.length > 128) throw new Error('Supply 1 to 128 acceptance tests');
  const entries = body.files.map(file => {
    if (typeof file.path !== 'string' || !/^(?:[A-Za-z_][\w-]*\/)*[A-Za-z_][\w-]*\.sop$/.test(file.path) ||
      typeof file.source !== 'string') throw new Error('Pack files require safe relative SOP paths and source strings');
    const parts = file.path.split('/');
    return { name: parts.at(-1).slice(0, -4), group: parts.slice(0, -1).join('.') || 'root', source: file.source };
  });
  for (const check of body.tests) {
    if (typeof check.input !== 'string' || typeof check.expected !== 'string') throw new Error('Tests require input and exact expected text');
  }
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-upload-'));
  try {
    await publishPack(path.join(temporary, 'pack'), entries);
    const result = await runtime.installCircuitPack(path.join(temporary, 'pack'));
    await runtime.saveSessionPack(path.join(temporary, 'validation'));
    const trial = await createSDLM({ sessionRoot: path.join(temporary, 'validation'), learnedRoots: [],
      backend: runtime.engine === '@suss/datalog' ? 'external' : 'bundled' });
    for (const check of body.tests) {
      const actual = await trial.process(check.input);
      if (actual !== check.expected) throw new Error(`Acceptance test failed for ${check.input}: expected ${check.expected}, got ${actual}`);
    }
    return { circuits: result.circuits, tests: body.tests.length };
  } finally { await fs.rm(temporary, { recursive: true, force: true }); }
}
