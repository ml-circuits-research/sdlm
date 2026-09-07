import fs from 'node:fs/promises';
import path from 'node:path';
import { parseCircuit } from '../kernel/sop-loader.mjs';
import { tokenize } from '../primitives/tokenizer.mjs';

const same = xs => xs.every(x => JSON.stringify(x) === JSON.stringify(xs[0]));
const q = s => JSON.stringify(String(s));
const safe = s => String(s).replace(/[^A-Za-z0-9_]/g, '_');
const preferredClasses = ['variable','entity','noun','relationNoun','verb3','verbBase','verbPast','verbPart','article','number','word','token'];
const pkey = path0 => path0.join('.');

function classifyText(text, language) { return tokenize(text).map(t => language.classify(t)); }
function commonClass(tokens) {
  const sets = tokens.map(t => new Set(t.classes ?? []));
  return preferredClasses.find(c => sets.every(s => s.has(c))) ?? 'token';
}

function collectVaryingPaths(values, path0 = [], out = []) {
  if (same(values)) return out;
  const first = values[0];
  if (first == null || typeof first !== 'object') { out.push({ path: path0, values }); return out; }
  if (Array.isArray(first)) {
    if (!values.every(v => Array.isArray(v) && v.length === first.length)) throw new Error(`Induction shape mismatch at ${pkey(path0)}`);
    first.forEach((_, i) => collectVaryingPaths(values.map(v => v[i]), [...path0, i], out)); return out;
  }
  const keys = Object.keys(first);
  if (!values.every(v => v && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(Object.keys(v).sort()) === JSON.stringify([...keys].sort())))
    throw new Error(`Induction object shape mismatch at ${pkey(path0)}`);
  for (const k of keys) collectVaryingPaths(values.map(v => v[k]), [...path0, k], out);
  return out;
}

function alignSlots(tokenExamples, commandExamples) {
  const varying = collectVaryingPaths(commandExamples);
  const indices = new Map();
  const classes = new Map();
  for (const leaf of varying) {
    const vals = leaf.values.map(v => String(v).toLowerCase());
    const idxs = [];
    for (let j = 0; j < tokenExamples.length; j++) {
      const ts = tokenExamples[j];
      const candidates = ts.map((t,i) => (t.norm === vals[j] || Object.values(t.lemmas ?? {}).includes(vals[j])) ? i : -1).filter(i => i >= 0);
      if (candidates.length !== 1) throw new Error(`Could not uniquely align varying semantic leaf ${pkey(leaf.path)} in example ${j + 1}`);
      idxs.push(candidates[0]);
    }
    indices.set(pkey(leaf.path), idxs);
    classes.set(pkey(leaf.path), commonClass(idxs.map((idx,j) => tokenExamples[j][idx])));
  }
  return { varying, indices, classes };
}

function shapeFor(exampleIndex, tokens, aligned) {
  const byIndex = new Map();
  for (const [path0, idxs] of aligned.indices) byIndex.set(idxs[exampleIndex], { path: path0, klass: aligned.classes.get(path0) });
  return tokens.map((t,i) => byIndex.has(i) ? ({ kind: 'category', value: byIndex.get(i).klass }) : ({ kind: 'terminal', value: t.norm }));
}

class SopBuilder {
  constructor({ production, slotMap, slotClasses, globallyVarying }) {
    this.lines = ['@input tree', '@guard valueFieldIs', '    value $tree', '    name "production"', `    expected ${q(production)}`];
    this.n = 0; this.slotMap = slotMap; this.slotClasses = slotClasses; this.globallyVarying = globallyVarying;
  }
  id(prefix='n') { return `${safe(prefix)}${++this.n}`; }
  node(id, command, args) { this.lines.push(`@${id} ${command}`); for (const [k,v] of Object.entries(args)) this.lines.push(`    ${k} ${v}`); return `$${id}`; }
  slotNode(index) { return this.node(this.id('slot'), 'chartChild', { tree: '$tree', index }); }
  isDynamic(path0) { return this.globallyVarying.has(pkey(path0)); }
  dynamicPrimitive(path0) {
    const key = pkey(path0), idx = this.slotMap.get(key);
    if (idx == null) throw new Error(`Could not align varying semantic leaf ${key} to this surface production`);
    const child = this.slotNode(idx); const klass = this.slotClasses.get(key) ?? 'token';
    if (['verb3','verbBase','verbPast','verbPart','relationNoun','noun'].includes(klass)) return this.node(this.id('lemma'), 'chartLemma', { tree: child, class: q(klass) });
    return this.node(this.id('norm'), 'chartNorm', { tree: child });
  }
  term(values, path0) {
    const first = values[0];
    if (first.kind === 'const') {
      if (this.isDynamic([...path0,'value'])) { const child = this.slotNode(this.slotMap.get(pkey([...path0,'value']))); return this.node(this.id('term'), 'chartTerm', { tree: child }); }
      return this.node(this.id('const'), 'makeConstant', { value: q(first.value) });
    }
    if (first.kind === 'var') {
      if (!same(values.map(v => v.name))) throw new Error('Varying logical variable names are not supported');
      return this.node(this.id('var'), 'makeVariable', { name: q(first.name) });
    }
    throw new Error(`Unsupported term ${JSON.stringify(first)}`);
  }
  build(values, path0=[]) {
    const first=values[0];
    if (first?.kind === 'const' || first?.kind === 'var') return this.term(values,path0);
    if (first?.kind === 'atom') {
      const args=first.args.map((_,i)=>this.build(values.map(v=>v.args[i]),[...path0,'args',i]));
      const pred=this.isDynamic([...path0,'predicate']) ? this.dynamicPrimitive([...path0,'predicate']) : q(first.predicate);
      if (!same(values.map(v=>v.polarity))) throw new Error('Varying polarity is not supported');
      const params={ subject:args[0], predicate:pred }; if(args.length===2) params.object=args[1]; params.polarity=q(first.polarity);
      return this.node(this.id('atom'),args.length===1?'makeUnaryAtom':'makeBinaryAtom',params);
    }
    if (first?.kind === 'rule') {
      const head=this.build(values.map(v=>v.head),[...path0,'head']); const bodyVals=values.map(v=>v.body);
      if (!bodyVals.every(b=>b.length===first.body.length)) throw new Error('Varying rule body length unsupported');
      const items=first.body.map((_,i)=>this.build(bodyVals.map(b=>b[i]),[...path0,'body',i]));
      const body=this.node(this.id('body'),'list',Object.fromEntries(items.map((x,i)=>[`item${i+1}`,x])));
      return this.node(this.id('rule'),'makeRule',{head,body});
    }
    if (first?.kind && Object.hasOwn(first,'payload')) {
      if (!same(values.map(v=>v.kind))) throw new Error('Varying command kind unsupported');
      const payload=this.build(values.map(v=>v.payload),[...path0,'payload']);
      return this.node(this.id('command'),'makeCommand',{kind:q(first.kind),payload});
    }
    throw new Error(`Unsupported semantic structure at ${pkey(path0)}: ${JSON.stringify(first)}`);
  }
  finish(outputRef) { this.lines.push(`@output result ${outputRef}`); return this.lines.join('\n')+'\n'; }
}

export async function induceParaphrase({ examples, language, parseCanonical, circuits, selector, run, learnedRoot, sequence }) {
  if (!Array.isArray(examples) || examples.length < 2) throw new Error('Induction needs at least two surface/canonical examples');
  const tokenExamples=examples.map(e=>classifyText(e.surface,language));
  const commandExamples=[]; for (const e of examples) commandExamples.push(await parseCanonical(e.canonical));
  const aligned=alignSlots(tokenExamples,commandExamples);
  const globallyVarying=new Set(aligned.varying.map(x=>pkey(x.path)));

  const groups=new Map();
  for (let i=0;i<examples.length;i++) {
    const rhs=shapeFor(i,tokenExamples[i],aligned); const sig=JSON.stringify(rhs);
    if(!groups.has(sig))groups.set(sig,{rhs,indices:[]}); groups.get(sig).indices.push(i);
  }

  const id=String(sequence).padStart(4,'0'); const files=[]; const productions=[]; const semanticNames=[]; const installNames=[];
  let gi=0;
  for (const group of groups.values()) {
    gi++; const suffix=gi===1?'':`_${gi}`;
    const production=`InducedSentence${id}${suffix}`; const semanticName=`InducedSemantic${id}${suffix}`; const installName=`InstallInducedGrammar${id}${suffix}`;
    const firstIndex=group.indices[0]; const slotMap=new Map();
    for (const [path0,idxs] of aligned.indices) slotMap.set(path0,idxs[firstIndex]);
    const builder=new SopBuilder({production,slotMap,slotClasses:aligned.classes,globallyVarying});
    const subCommands=group.indices.map(i=>commandExamples[i]); const output=builder.build(subCommands,[]); const semanticSource=builder.finish(output);
    const installLines=[];
    for (let ri=0; ri<group.rhs.length; ri++) {
      const symbol=group.rhs[ri]; const sid=`rhsSymbol${ri+1}`;
      if (symbol.kind === 'terminal') installLines.push(`@${sid} grammarToken`, `    value ${q(symbol.value)}`);
      else if (symbol.kind === 'category') installLines.push(`@${sid} grammarCategory`, `    name ${q(symbol.value)}`);
      else throw new Error(`unsupported induced grammar symbol ${JSON.stringify(symbol)}`);
    }
    installLines.push('@rhs list',...group.rhs.map((_,i)=>`    item${i+1} $rhsSymbol${i+1}`),'@installed addGrammarRule',`    name ${q(production)}`,'    lhs "Sentence"','    rhs $rhs','    weight 12','@output result $installed');
    const installSource=installLines.join('\n')+'\n';
    const base=path.join(learnedRoot,'circuits'); const semanticFile=path.join(base,'english','chartSentence',`${semanticName}.sop`); const installFile=path.join(base,'learned','bootstrap',`${installName}.sop`);
    await fs.mkdir(path.dirname(semanticFile),{recursive:true}); await fs.mkdir(path.dirname(installFile),{recursive:true}); await fs.writeFile(semanticFile,semanticSource); await fs.writeFile(installFile,installSource);
    circuits.set(semanticName,parseCircuit(semanticSource,{name:semanticName,group:'english.chartSentence',file:semanticFile})); circuits.set(installName,parseCircuit(installSource,{name:installName,group:'learned.bootstrap',file:installFile}));
    await run(installName,{}); files.push(semanticFile,installFile); productions.push(production); semanticNames.push(semanticName); installNames.push(installName);
  }
  selector.refresh();
  for(let i=0;i<examples.length;i++) {
    const actual=await parseCanonical(examples[i].surface);
    if(JSON.stringify(actual)!==JSON.stringify(commandExamples[i])) throw new Error(`Induced circuit validation failed for ${examples[i].surface}`);
  }
  return { id, production:productions[0], productions, semanticName:semanticNames[0], semanticNames, installName:installNames[0], installNames, rhs:[...groups.values()][0].rhs, files, examples:examples.length };
}
