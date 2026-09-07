import { atom, termConst, termVar, atomText } from '../datalog/knowledge-base.mjs';
import { firstToken, descendantNodes } from '../parsing/chart-parser.mjs';
import { tokenize } from './tokenizer.mjs';
import { registerPrimitive, literalArgument, referencesCircuitInput } from '../kernel/primitive-registry.mjs';
import { observationKey } from '../datalog/activation-observations.mjs';

export class NoMatchError extends Error {
  constructor(message) { super(message); this.name = 'NoMatchError'; }
}

const req = (cond, message) => { if (!cond) throw new NoMatchError(message); return true; };
const norm = (x) => String(x).toLowerCase();
const orderedValues = (args) => Object.entries(args).sort(([a],[b]) => a.localeCompare(b, undefined, { numeric: true })).map(([,v]) => v);

const activationOnInput = (inputArg, compile) => ({
  activation: ({ node, circuit }) => {
    if (!referencesCircuitInput(node.args, inputArg, circuit)) return null;
    return compile(node.args);
  }
});

const required = (path, value, test, score = 1) => ({
  requiredKeys: [observationKey(path, value)], test, score
});


function termAt(tokens, index, variableClass = 'variable') {
  const t = tokens[index];
  if (!t) throw new NoMatchError(`missing token ${index}`);
  return (t.classes ?? []).includes(variableClass) ? termVar(t.surface) : termConst(t.norm);
}

async function realizeAtomThroughCircuit(context, a) {
  if (!a) return '';
  return context.run('RealizeAtom', { atom: a });
}

async function proofLines(tree, context, depth = 0) {
  if (!tree) return [];
  const natural = tree.atomObject ? await realizeAtomThroughCircuit(context, tree.atomObject) : tree.atom;
  const line = `${'  '.repeat(depth)}${natural} [${tree.source}]`;
  const children = [];
  for (const child of (tree.children ?? [])) children.push(...await proofLines(child, context, depth + 1));
  return [line, ...children];
}

export function createPrimitives(context) {
  const p = new Map();
  const add = (name, fn, metadata = {}) => registerPrimitive(p, name, fn, metadata);
  let freshSequence = 0;

  add('constant', ({ value }) => value);
  add('tokenize', ({ text }) => tokenize(text));
  add('classifyTokens', ({ tokens }) => tokens.map(t => { const c = context.language.classify(t); if ((c.classes ?? []).includes('entity')) context.language.rememberDisplay(c.norm, c.surface); return c; }), { effect: 'write' });

  add('addTokenPattern', ({ class: klass, pattern }) => { context.language.addPattern(klass, pattern); return true; }, { effect: 'write' });
  add('addLexeme', ({ surface, class: klass, lemma }) => { context.language.addLexeme(surface, klass, lemma ?? surface); return true; }, { effect: 'write' });

  add('grammarToken', ({ value }) => ({ kind: 'terminal', value: String(value).toLowerCase() }));
  add('grammarCategory', ({ name }) => ({ kind: 'category', value: String(name) }));
  add('addGrammarRule', ({ name, lhs, rhs, weight }) => context.grammar.addRule({ name, lhs, rhs, weight }), { effect: 'write' });
  add('chartParse', ({ tokens, root }) => context.chartParser.parse(tokens, String(root ?? 'Sentence')), { effect: 'read' });
  add('chartParseAll', ({ tokens, root, limit }) => context.chartParser.parseAll(tokens, String(root ?? 'Sentence'), { limit: Number(limit ?? 24) }), { effect: 'read' });
  add('resolveParseForest', async ({ trees, group, tokens, beam, ambiguityMargin }) => {
    const hypotheses = [];
    for (const tree of (trees ?? [])) {
      const candidates = context.selector.selectAll(String(group), { tokens, value: tree }).slice(0, 6);
      for (const c of candidates) hypotheses.push({ tree, circuit: c.circuit, score: Number(tree.score ?? 0) + Number(c.score ?? 0) });
    }
    hypotheses.sort((a,b) => b.score - a.score || a.circuit.localeCompare(b.circuit));
    const frontier = hypotheses.slice(0, Math.max(1, Number(beam ?? 12)));
    if (!frontier.length) throw new NoMatchError(`no semantic circuit for parse forest in group ${group}`);
    context.trace?.push({ type: 'hypothesis-frontier', group: String(group), total: hypotheses.length, beam: frontier.map(h => ({ circuit: h.circuit, production: h.tree.production, score: h.score })) });
    const runOne = async (h) => {
      try { return { ...h, value: await context.run(h.circuit, { tree: h.tree }), ok: true }; }
      catch (error) { if (error?.name === 'NoMatchError') return { ...h, error, ok: false }; throw error; }
    };
    const safe = frontier.filter(h => context.effectAnalyzer?.isSpeculativelySafe(h.circuit));
    const unsafe = frontier.filter(h => !safe.includes(h));
    const outcomes = await Promise.all(safe.map(runOne));
    for (const h of unsafe) { context.trace?.push({ type: 'hypothesis-branch', circuit: h.circuit, score: h.score, status: 'unsafe-skipped' }); outcomes.push({ ...h, ok: false, unsafe: true }); }
    const successes = outcomes.filter(x => x.ok).sort((a,b) => b.score - a.score || a.circuit.localeCompare(b.circuit));
    if (!successes.length) throw new NoMatchError('all parse/semantic hypotheses failed');
    const canonical = x => Array.isArray(x) ? x.map(canonical) : (x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])])) : x);
    const key = x => JSON.stringify(canonical(x));
    const unique = [];
    for (const x of successes) if (!unique.some(u => key(u.value) === key(x.value))) unique.push(x);
    const top = unique[0], second = unique[1], margin = Number(ambiguityMargin ?? 1);
    context.trace?.push({ type: 'hypothesis-merge', group: String(group), successes: successes.length, distinct: unique.length, selected: top.circuit, margin: second ? top.score - second.score : null });
    if (second && top.score - second.score <= margin) return { kind: 'ambiguity', status: 'ambiguous', alternatives: unique.slice(0,4).map(x => ({ circuit: x.circuit, score: x.score, production: x.tree.production, value: x.value })) };
    return top.value;
  }, { effect: 'read' });
  add('chartChild', ({ tree, index }) => {
    const child = tree?.children?.[Number(index)];
    if (!child) throw new NoMatchError(`parse child ${index} absent`);
    return child;
  });
  add('chartChildren', ({ tree }) => tree?.children ?? []);
  add('chartDescendants', ({ tree, category }) => descendantNodes(tree, String(category)));
  add('chartTerm', ({ tree, variableClass }) => {
    const t = firstToken(tree);
    if (!t) throw new NoMatchError('parse node has no token');
    return (t.classes ?? []).includes(String(variableClass ?? 'variable')) ? termVar(t.surface) : termConst(t.norm);
  });
  add('chartNorm', ({ tree }) => { const t = firstToken(tree); if (!t) throw new NoMatchError('parse node has no token'); return t.norm; });
  add('chartSurface', ({ tree }) => { const t = firstToken(tree); if (!t) throw new NoMatchError('parse node has no token'); return t.surface; });
  add('chartLemma', ({ tree, class: klass }) => {
    const t = firstToken(tree);
    if (!t) throw new NoMatchError('parse node has no token');
    return t.lemmas?.[String(klass)] ?? t.norm;
  });


  add('candidateWeight', () => true, {
    activation: ({ node }) => {
      const weight = literalArgument(node.args, 'weight');
      return weight === undefined ? null : { weight: Number(weight), score: 0 };
    }
  });
  add('parseProductionIs', ({ value, production, expected }) => req(String(value?.production) === String(production ?? expected), `root production != ${production ?? expected}`), activationOnInput('value', args => {
    const wanted = literalArgument(args, 'production') ?? literalArgument(args, 'expected');
    return wanted === undefined ? null : required('value.production', String(wanted), request => String(request.value?.production) === String(wanted));
  }));
  add('parseHasProduction', ({ value, production, expected }) => {
    const wanted = String(production ?? expected); const stack = [value];
    while (stack.length) { const n = stack.pop(); if (n?.production === wanted) return true; stack.push(...(n?.children ?? [])); }
    throw new NoMatchError(`parse production ${wanted} absent`);
  }, activationOnInput('value', args => {
    const wanted = literalArgument(args, 'production') ?? literalArgument(args, 'expected');
    if (wanted === undefined) return null;
    return required('value.desc.production', String(wanted), request => {
      const stack = [request.value]; while (stack.length) { const n = stack.pop(); if (n?.production === String(wanted)) return true; stack.push(...(n?.children ?? [])); } return false;
    });
  }));
  add('parseCategoryIs', ({ value, category, expected }) => req(String(value?.category) === String(category ?? expected), `root category != ${category ?? expected}`), activationOnInput('value', args => {
    const wanted = literalArgument(args, 'category') ?? literalArgument(args, 'expected');
    return wanted === undefined ? null : required('value.category', String(wanted), request => String(request.value?.category) === String(wanted));
  }));
  add('parseHasCategory', ({ value, category, expected }) => {
    const wanted = String(category ?? expected); const stack = [value];
    while (stack.length) { const n = stack.pop(); if (n?.category === wanted) return true; stack.push(...(n?.children ?? [])); }
    throw new NoMatchError(`parse category ${wanted} absent`);
  }, activationOnInput('value', args => {
    const wanted = literalArgument(args, 'category') ?? literalArgument(args, 'expected');
    if (wanted === undefined) return null;
    return required('value.desc.category', String(wanted), request => {
      const stack = [request.value]; while (stack.length) { const n = stack.pop(); if (n?.category === String(wanted)) return true; stack.push(...(n?.children ?? [])); } return false;
    });
  }));
  add('makeAmbiguity', ({ alternatives }) => ({ kind: 'ambiguity', status: 'ambiguous', alternatives: alternatives ?? [] }));
  add('tokenIs', ({ tokens, index, value }) => req(tokens[index]?.norm === norm(value), `token ${index} != ${value}`), activationOnInput('tokens', args => {
    const index = literalArgument(args, 'index'), value = literalArgument(args, 'value');
    if (index === undefined || value === undefined) return null;
    const wanted = norm(value), i = Number(index);
    return required(`tokens.${i}.norm`, wanted, request => request.tokens?.[i]?.norm === wanted);
  }));
  add('tokenClassIs', ({ tokens, index, class: klass }) => req(tokens[index]?.classes?.includes(String(klass)), `token ${index} not class ${klass}`), activationOnInput('tokens', args => {
    const index = literalArgument(args, 'index'), klass = literalArgument(args, 'class');
    if (index === undefined || klass === undefined) return null;
    const wanted = String(klass), i = Number(index);
    return required(`tokens.${i}.classes.*`, wanted, request => (request.tokens?.[i]?.classes ?? []).includes(wanted));
  }));
  add('tokenCountIs', ({ tokens, count }) => req(tokens.length === Number(count), `token count ${tokens.length} != ${count}`), activationOnInput('tokens', args => {
    const count = literalArgument(args, 'count'); if (count === undefined) return null; const wanted = Number(count);
    return required('tokens.length', wanted, request => request.tokens?.length === wanted);
  }));
  add('tokenCountAtLeast', ({ tokens, count }) => req(tokens.length >= Number(count), `token count ${tokens.length} < ${count}`), activationOnInput('tokens', args => {
    const count = literalArgument(args, 'count'); if (count === undefined) return null; const wanted = Number(count);
    return { test: request => (request.tokens?.length ?? 0) >= wanted, score: 1 };
  }));
  add('tokenContains', ({ tokens, value }) => req(tokens.some(t => t.norm === norm(value)), `token ${value} absent`), activationOnInput('tokens', args => {
    const value = literalArgument(args, 'value'); if (value === undefined) return null; const wanted = norm(value);
    return required('tokens.*.norm', wanted, request => (request.tokens ?? []).some(t => t.norm === wanted));
  }));
  add('tokenNotContains', ({ tokens, value }) => req(!tokens.some(t => t.norm === norm(value)), `token ${value} present`), activationOnInput('tokens', args => {
    const value = literalArgument(args, 'value'); if (value === undefined) return null; const wanted = norm(value);
    return { test: request => !(request.tokens ?? []).some(t => t.norm === wanted), score: 1 };
  }));
  add('tokenLastIs', ({ tokens, value }) => req(tokens.at(-1)?.norm === norm(value), `last token != ${value}`), activationOnInput('tokens', args => {
    const value = literalArgument(args, 'value'); if (value === undefined) return null; const wanted = norm(value);
    return required('tokens.last.norm', wanted, request => request.tokens?.at(-1)?.norm === wanted);
  }));
  add('commandKindIs', ({ value, kind }) => req(value?.kind === kind, `command kind != ${kind}`), activationOnInput('value', args => {
    const kind = literalArgument(args, 'kind'); if (kind === undefined) return null;
    return required('value.kind', String(kind), request => String(request.value?.kind) === String(kind));
  }));
  add('answerKindIs', ({ value, kind }) => req(value?.kind === kind, `answer kind != ${kind}`), activationOnInput('value', args => {
    const kind = literalArgument(args, 'kind'); if (kind === undefined) return null;
    return required('value.kind', String(kind), request => String(request.value?.kind) === String(kind));
  }));
  add('answerStatusIs', ({ value, status }) => req(value?.status === status, `answer status != ${status}`), activationOnInput('value', args => {
    const status = literalArgument(args, 'status'); if (status === undefined) return null;
    return required('value.status', String(status), request => String(request.value?.status) === String(status));
  }));
  add('valueFieldIs', ({ value, name, expected }) => req(String(value?.[String(name)]) === String(expected), `field ${name} != ${expected}`), activationOnInput('value', args => {
    const name = literalArgument(args, 'name'), expected = literalArgument(args, 'expected');
    if (name === undefined || expected === undefined) return null;
    return required(`value.${String(name)}`, expected, request => String(request.value?.[String(name)]) === String(expected));
  }));

  add('atomArityIs', ({ value, atom: atomValue, arity }) => {
    const a = atomValue ?? value; return req((a?.args?.length ?? 0) === Number(arity), `atom arity != ${arity}`);
  }, activationOnInput('value', args => {
    const arity = literalArgument(args, 'arity'); if (arity === undefined) return null;
    return required('value.args.length', Number(arity), request => (request.value?.args?.length ?? 0) === Number(arity));
  }));
  add('atomPolarityIs', ({ value, atom: atomValue, polarity }) => {
    const a = atomValue ?? value; return req(String(a?.polarity) === String(polarity), `atom polarity != ${polarity}`);
  }, activationOnInput('value', args => {
    const polarity = literalArgument(args, 'polarity'); if (polarity === undefined) return null;
    return required('value.polarity', String(polarity), request => String(request.value?.polarity) === String(polarity));
  }));
  add('predicateHasLexemeClass', ({ atom: a, value, class: klass }) => {
    const target = a ?? value;
    return req(context.language.hasLemmaClass(target?.predicate, String(klass)), `predicate ${target?.predicate} has no ${klass} lexeme`);
  }, { effect: 'read' });
  add('atomArgument', ({ atom: a, index }) => {
    const arg = a?.args?.[Number(index)]; if (!arg) throw new NoMatchError(`atom argument ${index} absent`); return arg;
  });
  add('atomPredicate', ({ atom: a }) => String(a?.predicate ?? ''));
  add('atomQualifierPresent', ({ atom: a, value }) => { const target = a ?? value; return req(Boolean(target?.qualifier), 'atom qualifier absent'); });
  add('lexemeSurface', ({ lemma, class: klass }) => {
    const surface = context.language.surfaceForLemma(String(lemma), String(klass));
    if (!surface) throw new NoMatchError(`no surface form for ${lemma} as ${klass}`);
    return surface;
  }, { effect: 'read' });
  add('wordify', ({ value }) => String(value ?? '').replaceAll('_', ' ').replaceAll('-', ' '));

  add('tokenNormAt', ({ tokens, index }) => { const t = tokens[Number(index)]; if (!t) throw new NoMatchError(`missing token ${index}`); return t.norm; });
  add('tokenSurfaceAt', ({ tokens, index }) => { const t = tokens[Number(index)]; if (!t) throw new NoMatchError(`missing token ${index}`); return t.surface; });
  add('tokenLemmaAt', ({ tokens, index, class: klass }) => {
    const t = tokens[Number(index)]; if (!t) throw new NoMatchError(`missing token ${index}`);
    return t.lemmas?.[String(klass)] ?? t.norm;
  });
  add('termAt', ({ tokens, index, variableClass }) => termAt(tokens, Number(index), variableClass));
  add('constantAt', ({ tokens, index }) => termConst(tokens[Number(index)]?.norm ?? (() => { throw new NoMatchError(`missing token ${index}`); })()));
  add('makeVariable', ({ name }) => termVar(name));
  add('makeConstant', ({ value }) => termConst(value));
  add('freshTerm', ({ prefix }) => termConst(`_${String(prefix ?? 'anon').toLowerCase()}_${++freshSequence}`));

  add('makeUnaryAtom', ({ subject, predicate, polarity, qualifier }) => atom(predicate, [subject], polarity ?? 'positive', qualifier));
  add('makeBinaryAtom', ({ subject, predicate, object, polarity, qualifier }) => atom(predicate, [subject, object], polarity ?? 'positive', qualifier));
  add('list', (args) => orderedValues(args));
  add('makeRule', ({ head, body }) => ({ kind: 'rule', head, body }));
  add('makeCommand', ({ kind, payload }) => ({ kind: String(kind), payload }));
  add('makePairCommand', ({ kind, left, right }) => ({ kind: String(kind), payload: { left, right } }));
  add('field', ({ value, name }) => value?.[String(name)]);
  add('setField', ({ value, name, fieldValue }) => ({ ...(value ?? {}), [String(name)]: fieldValue }));
  add('arrayField', ({ values, name }) => (values ?? []).map(v => v?.[String(name)]));

  add('findToken', ({ tokens, value }) => { const i = tokens.findIndex(t => t.norm === norm(value)); if (i < 0) throw new NoMatchError(`cannot find token ${value}`); return i; });
  add('findTokenAfter', ({ tokens, value, start }) => { const offset = Number(start); const i = tokens.findIndex((t,j) => j >= offset && t.norm === norm(value)); if (i < 0) throw new NoMatchError(`cannot find token ${value} after ${start}`); return i; });
  add('add', ({ value, delta }) => Number(value) + Number(delta));
  add('tokenCount', ({ tokens }) => tokens.length);
  add('sliceTokens', ({ tokens, start, end }) => tokens.slice(Number(start), Number(end)));

  add('selectCircuit', async ({ group, tokens, value }) => (await context.selector.select(String(group), { tokens, value })).circuit, { effect: 'read', selectsGroup: true });
  add('selectCircuits', ({ group, tokens, value }) => context.selector.selectAll(String(group), { tokens, value }), { effect: 'read', selectsGroup: true });

  add('kbAssertFact', ({ atom: a }) => context.kb.addFact(a), { effect: 'write' });
  add('kbAssertFacts', ({ atoms }) => context.kb.addFacts(atoms), { effect: 'write' });
  add('kbAssertRule', ({ rule }) => context.kb.addRule(rule), { effect: 'write' });
  add('kbAskBoolean', ({ atom: a }) => context.kb.askBoolean(a), { effect: 'read' });
  add('kbAskBindings', ({ atom: a }) => context.kb.askBindings(a), { effect: 'read' });
  add('kbAskConjunctiveBindings', ({ atoms }) => context.kb.askConjunctiveBindings(atoms), { effect: 'read' });
  add('kbAskCount', ({ payload }) => context.kb.askCount(payload), { effect: 'read' });
  add('kbAskExists', ({ payload }) => context.kb.askExists(payload), { effect: 'read' });
  add('kbExplain', ({ atom: a }) => context.kb.explain(a), { effect: 'read' });
  add('kbDescribe', ({ entity }) => context.kb.describe(entity?.value ?? entity), { effect: 'read' });
  add('kbProfile', ({ entity }) => context.kb.profile(entity), { effect: 'read' });
  add('kbCompare', ({ left, right }) => context.kb.compare(left, right), { effect: 'read' });
  add('kbSummary', () => context.kb.summarize(), { effect: 'read' });
  add('kbReflect', ({ atom: a }) => context.kb.reflect(a), { effect: 'read' });
  add('kbMissing', ({ atom: a }) => context.kb.missingFor(a), { effect: 'read' });
  add('runtimeIntrospect', () => context.lastAudit ?? { kind: 'introspection', status: 'unknown', epochs: 0, expansions: 0, reductions: 0, rewrites: 0, selections: 0, circuits: [] }, { effect: 'read' });

  add('join', ({ values, separator }) => (values ?? []).join(separator ?? ', '));
  add('joinOrDefault', ({ values, separator, fallback }) => (values?.length ? values.join(separator ?? ', ') : String(fallback ?? '')));
  add('concat', (args) => orderedValues(args).map(v => v ?? '').join(''));
  add('take', ({ values, count }) => (values ?? []).slice(0, Number(count)));
  add('sortByNumber', ({ values, field, direction }) => [...(values ?? [])].sort((a,b) => (Number(a?.[String(field)] ?? 0) - Number(b?.[String(field)] ?? 0)) * (String(direction) === 'desc' ? -1 : 1)));
  add('length', ({ values }) => (values ?? []).length);
  add('unique', ({ values }) => [...new Set(values ?? [])]);
  add('append', ({ values, value }) => [...(values ?? []), value]);
  add('prepend', ({ values, value }) => [value, ...(values ?? [])]);
  add('display', ({ value }) => context.language.display(value), { effect: 'read' });
  add('realizeAtoms', async ({ atoms }) => {
    const out = []; for (const a of (atoms ?? [])) out.push(await realizeAtomThroughCircuit(context, a)); return out;
  }, { effect: 'read' });
  add('proofLines', async ({ tree }) => proofLines(tree, context), { effect: 'read' });
  add('factLines', ({ facts }) => facts ?? []);
  add('atomText', ({ atom: a }) => atomText(a));
  add('featurePredicates', ({ features }) => (features ?? []).map(f => `${f.polarity === 'negative' ? 'not ' : ''}${f.predicate}`));
  add('pathMissingAtoms', ({ paths }) => (paths ?? []).flatMap(p => p.missing ?? []));

  return p;
}
