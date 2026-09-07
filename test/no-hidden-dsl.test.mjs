import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSLLM } from '../src/sllm.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

async function walk(dir, predicate = () => true) {
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(p, predicate));
    else if (predicate(p)) out.push(p);
  }
  return out;
}

async function textOf(files) {
  return (await Promise.all(files.map(f => fs.readFile(f, 'utf8')))).join('\n');
}

test('runtime has no hidden activation, grammar-token, text-template, or predicate-qualifier DSL', async () => {
  const selector = await fs.readFile(path.join(root, 'src/datalog/candidate-selector.mjs'), 'utf8');
  const effects = await fs.readFile(path.join(root, 'src/kernel/effect-analyzer.mjs'), 'utf8');
  for (const forbidden of ['GUARDS', 'tokenIs', 'tokenClassIs', 'parseProductionIs', 'answerKindIs', 'valueFieldIs']) {
    assert.equal(selector.includes(forbidden), false, `selector must not recognize ${forbidden} by name`);
  }
  for (const forbidden of ['PRIMITIVE_EFFECTS', 'kbAssertFact', 'kbAssertRule', 'addLexeme', 'addGrammarRule']) {
    assert.equal(effects.includes(forbidden), false, `effect analyzer must not recognize ${forbidden} by name`);
  }

  const sopFiles = await walk(root, p => p.endsWith('.sop'));
  const sop = await textOf(sopFiles);
  for (const forbidden of ['tok:', 'addTemplate', 'addAtomTemplate', 'renderTemplate', 'renderAmbiguity', '{subject}', '{object}', '{entity}', 'can::']) {
    assert.equal(sop.includes(forbidden), false, `SOP library contains retired hidden syntax ${forbidden}`);
  }

  const implementationFiles = await walk(path.join(root, 'src'), p => p.endsWith('.mjs'));
  const implementation = await textOf(implementationFiles);
  for (const forbidden of ['qualifyPredicate', "replaceAll('::'", 'atomTemplate(']) {
    assert.equal(implementation.includes(forbidden), false, `runtime contains retired encoding ${forbidden}`);
  }
});

test('grammar symbols are structured values and NLG expands through SOP realizer circuits', async () => {
  const s = await createSLLM({ learnedRoots: [] });
  const rules = s.grammar.rules;
  assert.ok(rules.length > 20);
  for (const rule of rules) for (const symbol of rule.rhs) {
    assert.equal(typeof symbol, 'object');
    assert.ok(symbol.kind === 'terminal' || symbol.kind === 'category');
    assert.equal(typeof symbol.value, 'string');
  }

  await s.process('Alice validates Bob.');
  const text = await s.process('Summarize Alice.');
  assert.match(text, /Alice validates Bob\./);
  assert.ok(s.circuits.has('RealizeAtom'));
  assert.ok([...s.circuits.values()].some(c => c.group === 'english.atomRealizer'));
});
