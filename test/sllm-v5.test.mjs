import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSLLM } from '../src/sllm.mjs';
import { Trace } from '../src/kernel/trace.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function countSop(dir) {
  let n=0; for (const e of await fs.readdir(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) n+=await countSop(p); else if(e.name.endsWith('.sop')) n++; } return n;
}

test('runtime loads a genuinely large circuit library', async () => {
  const files = await countSop(path.join(root,'circuits'));
  assert.ok(files >= 3000, `expected >=3000 SOP circuits, got ${files}`);
  const s = await createSLLM({ learnedRoots: [] });
  assert.ok(s.circuits.size >= 3000);
  assert.ok((s.selector.rulesByGroup.get('english.microSentence') ?? []).length >= 2800);
});

test('common tense, voice, aspect, modality, contractions, plurals and comparative forms compose', async () => {
  const s = await createSLLM({ learnedRoots: [] });
  const pairs = [
    ['Alice validated Bob.','Did Alice validate Bob?','Yes.'],
    ['Bob is validated by Alice.','Does Alice validate Bob?','Yes.'],
    ['Alice is validating Bob.','Is Alice validating Bob?','Yes.'],
    ['Alice has validated Bob.','Has Alice validated Bob?','Yes.'],
    ['Alice was reliable.','Was Alice reliable?','Yes.'],
    ['Alice is very reliable.','Is Alice very reliable?','Yes.'],
    ['Alice is more experienced than Bob.','Is Alice more experienced than Bob?','Yes.']
  ];
  for (const [fact,q,expected] of pairs) { assert.equal(await s.process(fact),'Learned.',fact); assert.equal(await s.process(q),expected,q); }
  assert.equal(await s.process('Alice can help Bob.'),'Learned.');
  assert.equal(await s.process('Can Alice help Bob?'),'Yes.');
  assert.equal(await s.process("Carol can't help Bob."),'Learned.');
  assert.equal(await s.process('Can Carol help Bob?'),'No.');
  assert.equal(await s.process("Dana doesn't validate Bob."),'Learned.');
  assert.equal(await s.process('Does Dana validate Bob?'),'No.');

  assert.equal(await s.process('All researchers are curious.'),'Learned.');
  assert.equal(await s.process('Eve is a researcher.'),'Learned.');
  assert.equal(await s.process('Is Eve curious?'),'Yes.');
  assert.match(await s.process('Which researchers are curious?'),/eve/i);
  assert.match(await s.process('How many researchers are curious?'),/Count: 1/);
});

test('recursive chart grammar remains the general fallback beyond the specialized micro-circuits', async () => {
  const trace = new Trace(false); const s = await createSLLM({ learnedRoots: [], trace });
  await s.process('Alice is human.'); await s.process('Alice is smart.'); await s.process('Alice is creative.'); await s.process('Alice likes Bob.');
  trace.events.length=0;
  assert.equal(await s.process('When X is human and X is smart and X is creative and X likes Y, X trusts Y.'),'Learned.');
  assert.equal(await s.process('Does Alice trust Bob?'),'Yes.');
  assert.ok(trace.events.some(e=>e.type==='chart-forest' && e.productions.includes('WhenSentence')));
  assert.ok(trace.events.some(e=>e.type==='hypothesis-frontier'));
});

test('parallel speculative micro-circuits preserve a real ambiguity instead of arbitrary early commitment', async () => {
  const trace = new Trace(false); const s = await createSLLM({ learnedRoots: [], trace });
  trace.events.length=0;
  const answer = await s.process('Alice saw Bob with Carol.');
  assert.match(answer,/^Ambiguous:/);
  const start=trace.events.find(e=>e.type==='parallel-start' && (e.candidates??[]).some(x=>x.includes('AmbiguousSawWith')));
  assert.ok(start); assert.ok(start.safe>=2);
  assert.ok(trace.events.some(e=>e.type==='parallel-merge' && e.ambiguous===true));
  assert.equal(s.snapshot().binary.length,0,'ambiguous speculative parses must not mutate KB');
});

test('Datalog candidate rules are partitioned, activation-indexed, and return a narrow frontier', async () => {
  const trace=new Trace(false);
  const s=await createSLLM({learnedRoots:[],trace});
  const tokens=await s.run('EnglishLanguage',{}).catch(()=>null); // bootstrap already ran; just prove API remains callable
  const classified=s.language.classify({surface:'Alice',norm:'alice',classes:[],lemmas:{}});
  assert.ok(classified.classes.includes('entity'));
  const ts=[
    s.language.classify({surface:'Alice',norm:'alice',classes:[],lemmas:{}}),
    s.language.classify({surface:'validates',norm:'validates',classes:[],lemmas:{}}),
    s.language.classify({surface:'Bob',norm:'bob',classes:[],lemmas:{}}),
    s.language.classify({surface:'.',norm:'.',classes:[],lemmas:{}})
  ];
  const candidates=s.selector.selectAll('english.microSentence',{tokens:ts});
  assert.ok(candidates.length>=1 && candidates.length<20,`frontier should be narrow, got ${candidates.length}`);
  assert.ok(s.selector.rulesByGroup.size>5);
  assert.ok((s.selector.rulesByGroup.get('english.microSentence')??[]).length>2800);
  assert.ok((s.selector.rulesByGroup.get('executor')??[]).length<100);
  trace.events.length=0;
  assert.equal(await s.process('Alice validates Bob.'),'Learned.');
  const prune=trace.events.find(e=>e.type==='activation-prune' && e.group==='english.microSentence');
  assert.ok(prune);
  assert.ok(prune.totalRules>2800);
  assert.ok(prune.evaluatedRules<=5,`activation index should drastically narrow Datalog input, got ${prune.evaluatedRules}`);
});

test('induction accepts paraphrases with different lengths and slot positions and persists them', async () => {
  const learnedRoot=await fs.mkdtemp(path.join(os.tmpdir(),'sop-sllm-v5-learn-'));
  let s=await createSLLM({learnedRoots:[]});
  const learned=await s.learnParaphrase([
    {surface:'Recap Alice.',canonical:'Summarize Alice.'},
    {surface:'Give overview for Bob.',canonical:'Summarize Bob.'},
    {surface:'Profile Carol now.',canonical:'Summarize Carol.'}
  ],{learnedRoot});
  assert.equal(learned.productions.length,3);
  assert.match(await s.process('Recap Dana.'),/Dana/i);
  assert.match(await s.process('Give overview for Eve.'),/Eve/i);
  s=await createSLLM({learnedRoots:[learnedRoot]});
  assert.match(await s.process('Profile Frank now.'),/Frank/i);
});

test('generation task paraphrases delegate through specialized circuits to symbolic NLG', async () => {
  const s=await createSLLM({learnedRoots:[]});
  for(const x of ['Project is important.','Project improves reproducibility.','Project supports automation.']) await s.process(x);
  assert.match(await s.process('Give me a concise summary of Project.'),/^Summary of Project:/);
  assert.match(await s.process('Give me a detailed explanation of Project.'),/^A fuller expansion of Project:/);
  assert.match(await s.process('Synthesize what is known about Project.'),/^A fuller expansion of Project:/);
});


test('relative clauses compose recursively and gate rule firing on all relative conditions', async () => {
  const s = await createSLLM({ learnedRoots: [] });
  assert.equal(await s.process('Every researcher who is curious and validates Paper is trusted.'),'Learned.');
  for (const line of ['Alice is a researcher.','Alice is curious.','Alice validates Paper.','Bob is a researcher.','Bob is curious.']) {
    assert.equal(await s.process(line),'Learned.',line);
  }
  assert.equal(await s.process('Is Alice trusted?'),'Yes.');
  assert.match(await s.process('Is Bob trusted?'),/^Unknown:/);
});
