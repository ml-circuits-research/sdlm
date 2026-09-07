import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSDLM } from './helpers/runtime.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const atlasPack = path.join(repo, 'extensions', 'document-atlas');

function semanticSnapshot(snapshot) {
  return {
    unary: [...snapshot.unary].map(x => JSON.stringify(x)).sort(),
    binary: [...snapshot.binary].map(x => JSON.stringify(x)).sort(),
    rules: [...snapshot.rules].map(x => JSON.stringify(x)).sort()
  };
}

test('a document is installed as SOP circuits and materialized knowledge supports reasoning', async () => {
  const sdlm = await createSDLM();
  assert.match(await sdlm.process('Is Architecture auditable?'), /Unknown/i);

  const installed = await sdlm.installCircuitPack(atlasPack);
  assert.ok(installed.circuits.length >= 10);
  assert.ok(installed.bootstraps.includes('AtlasDocumentKnowledge'));

  assert.equal(await sdlm.process('Can Atlas reconstruct Evidence?'), 'Yes.');
  assert.equal(await sdlm.process('Is Architecture auditable?'), 'Yes.');
  assert.equal(await sdlm.process('Did Atlas start in 2024?'), 'Yes.');
  assert.match(await sdlm.process('Did Atlas start in 2023?'), /Unknown/i);
  assert.match(await sdlm.process('What does Atlas use?'), /semantic_circuits/i);
  assert.match(await sdlm.process('What does KnowledgeCircuit mean?'), /executable_sop_circuit_generated_from_source_material/i);
  assert.match(await sdlm.process('What does PronounIt refer to?'), /atlas/i);
  assert.match(await sdlm.process('Who reported EvidenceClaim?'), /team/i);

  const explanation = await sdlm.process('Why is Architecture auditable?');
  assert.match(explanation, /retain derivation links/i);
});

test('the circuit pack is the persistent source: a fresh runtime reconstructs the same materialized KB', async () => {
  const a = await createSDLM({ extensions: [atlasPack] });
  const b = await createSDLM({ extensions: [atlasPack] });
  assert.deepEqual(semanticSnapshot(a.snapshot()), semanticSnapshot(b.snapshot()));
});

test('document knowledge pack contains SOP circuits rather than a second knowledge DSL', async () => {
  const circuitRoot = path.join(atlasPack, 'circuits');
  const stack = [circuitRoot];
  const files = [];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  assert.ok(files.length >= 10);
  assert.ok(files.every(file => file.endsWith('.sop')), `non-SOP generated knowledge file found: ${files.find(file => !file.endsWith('.sop'))}`);
});

test('dynamic circuit-pack installation is transactional for both circuits and materialized state', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-bad-pack-'));
  const circuitDir = path.join(root, 'circuits', 'bad', 'bootstrap');
  await fs.mkdir(circuitDir, { recursive: true });
  await fs.writeFile(path.join(circuitDir, 'BadDocumentBootstrap.sop'), `@temp makeConstant\n    value "temporary_document_fact"\n@fact makeUnaryAtom\n    subject $temp\n    predicate "temporary_fact"\n@written kbAssertFact\n    atom $fact\n@value constant\n    value "not_an_object"\n@fail valueFieldIs\n    value $value\n    name "missing"\n    expected "required"\n@output result $fail\n`);

  const sdlm = await createSDLM();
  const before = semanticSnapshot(sdlm.snapshot());
  await assert.rejects(() => sdlm.installCircuitPack(root));
  const after = semanticSnapshot(sdlm.snapshot());
  assert.deepEqual(after, before);
  assert.equal(sdlm.circuits.has('BadDocumentBootstrap'), false);
});
