import { validateAtom, validateRule } from './validation.mjs';

const tupleKey = (relation, tuple) => `${relation}:${JSON.stringify(tuple)}`;
const isVar = (t) => t?.kind === 'var';
const isConst = (t) => t?.kind === 'const';

export const termConst = (value) => ({ kind: 'const', value: String(value).toLowerCase() });
export const termVar = (name) => ({ kind: 'var', name: String(name) });
export const atom = (predicate, args, polarity = 'positive', qualifier = null) => ({
  kind: 'atom', predicate: String(predicate).toLowerCase(), args, polarity, qualifier: qualifier == null ? null : String(qualifier).toLowerCase()
});

export function atomRelation(a) {
  if (a.args.length === 1) return 'unary';
  if (a.args.length === 2) return 'binary';
  throw new Error(`Only unary/binary atoms are supported, got arity ${a.args.length}`);
}

export function atomTuple(a, substitution = new Map()) {
  const resolve = (t) => isVar(t) ? substitution.get(t.name) : t.value;
  const qualifier = a.qualifier ?? '';
  if (a.args.length === 1) return [resolve(a.args[0]), a.predicate, a.polarity, qualifier];
  return [resolve(a.args[0]), a.predicate, resolve(a.args[1]), a.polarity, qualifier];
}

export function atomText(a) {
  const args = a.args.map(t => isVar(t) ? t.name : t.value).join(', ');
  const qualifier = a.qualifier ? `${a.qualifier} ` : '';
  return `${a.polarity === 'negative' ? 'not ' : ''}${qualifier}${a.predicate}(${args})`;
}

const sameAtom = (a, b) => atomRelation(a) === atomRelation(b) && JSON.stringify(atomTuple(a)) === JSON.stringify(atomTuple(b));

export class KnowledgeBase {
  constructor({ datalog, trace }) {
    this.datalog = datalog;
    this.trace = trace;
    this.baseFacts = [];
    this.rules = [];
    this.db = new datalog.Database();
  }

  #datalogTerm(t) { return isVar(t) ? this.datalog.variable(t.name) : this.datalog.constant(t.value); }

  #literal(a) {
    const terms = a.args.length === 1
      ? [this.#datalogTerm(a.args[0]), this.datalog.constant(a.predicate), this.datalog.constant(a.polarity), this.datalog.constant(a.qualifier ?? '')]
      : [this.#datalogTerm(a.args[0]), this.datalog.constant(a.predicate), this.#datalogTerm(a.args[1]), this.datalog.constant(a.polarity), this.datalog.constant(a.qualifier ?? '')];
    return this.datalog.lit(atomRelation(a), ...terms);
  }

  #rule(r) {
    const head = r.head;
    const headTerms = head.args.length === 1
      ? [this.#datalogTerm(head.args[0]), this.datalog.constant(head.predicate), this.datalog.constant(head.polarity), this.datalog.constant(head.qualifier ?? '')]
      : [this.#datalogTerm(head.args[0]), this.datalog.constant(head.predicate), this.#datalogTerm(head.args[1]), this.datalog.constant(head.polarity), this.datalog.constant(head.qualifier ?? '')];
    return this.datalog.rule(atomRelation(head), headTerms, r.body.map(a => this.#literal(a)));
  }

  #rebuild() {
    this.db = new this.datalog.Database();
    for (const a of this.baseFacts) this.db.add(atomRelation(a), atomTuple(a));
    this.datalog.evaluate(this.db, this.rules.map(r => this.#rule(r)));
  }

  addFact(a) {
    validateAtom(a, { ground: true });
    a = structuredClone(a);
    if (!this.baseFacts.some(f => sameAtom(f, a))) this.baseFacts.push(a);
    this.db.add(atomRelation(a), atomTuple(a));
    this.datalog.evaluate(this.db, this.rules.map(r => this.#rule(r)));
    this.trace?.push({ type: 'datalog', message: `asserted ${atomText(a)}` });
    return { kind: 'ack', action: 'fact', text: atomText(a) };
  }

  addFacts(atoms) {
    for (const a of atoms ?? []) validateAtom(a, { ground: true });
    for (const a of atoms ?? []) this.addFact(a);
    return { kind: 'ack', action: 'facts', count: (atoms ?? []).length };
  }

  addRule(r) {
    validateRule(r);
    if (this.rules.some(existing => JSON.stringify(existing) === JSON.stringify(r))) {
      return { kind: 'ack', action: 'rule', text: atomText(r.head) };
    }
    this.rules.push(structuredClone(r));
    this.#rebuild();
    this.trace?.push({ type: 'datalog', message: `installed rule ${atomText(r.head)} <= ${r.body.map(atomText).join(', ')}` });
    return { kind: 'ack', action: 'rule', text: `${atomText(r.head)} <= ${r.body.map(atomText).join(', ')}` };
  }

  has(a) {
    if (a.args.some(isVar)) return false;
    const tuple = atomTuple(a);
    return this.db.facts(atomRelation(a)).some(x => JSON.stringify(x) === JSON.stringify(tuple));
  }

  askBoolean(a) {
    const opposite = { ...a, polarity: a.polarity === 'positive' ? 'negative' : 'positive' };
    const yes = this.has(a);
    const no = this.has(opposite);
    const status = yes && no ? 'both' : yes ? 'true' : no ? 'false' : 'unknown';
    return { kind: 'boolean', status, atom: a };
  }

  askBindings(a) {
    const vars = a.args.filter(isVar);
    if (vars.length !== 1) throw new Error('AskBindings currently requires exactly one variable');
    const variable = vars[0].name;
    const values = [];
    for (const tuple of this.db.facts(atomRelation(a))) {
      const env = this.#unifyAtomTuple(a, tuple, new Map());
      if (env && env.has(variable)) values.push(env.get(variable));
    }
    const unique = [...new Set(values)].sort();
    return { kind: 'bindings', status: unique.length ? 'true' : 'unknown', variable, values: unique, atom: a };
  }

  askConjunctiveBindings(atoms) {
    const vars = [...new Set((atoms ?? []).flatMap(a => a.args.filter(isVar).map(t => t.name)))];
    if (vars.length !== 1) throw new Error('Conjunctive binding query currently requires one logical variable');
    const envs = this.#bodyGroundings(atoms, 0, new Map());
    const values = [...new Set(envs.map(e => e.get(vars[0])).filter(v => v != null))].sort();
    return { kind: 'bindings', status: values.length ? 'true' : 'unknown', variable: vars[0], values, atoms };
  }

  askCount(payload) {
    const answer = Array.isArray(payload) ? this.askConjunctiveBindings(payload) : this.askBindings(payload);
    return { kind: 'count', status: 'true', count: answer.values.length, values: answer.values };
  }

  askExists(payload) {
    const answer = Array.isArray(payload) ? this.askConjunctiveBindings(payload) : this.askBindings(payload);
    return { kind: 'exists', status: answer.values.length ? 'true' : 'false', values: answer.values };
  }

  #unifyAtomTuple(a, tuple, seed) {
    const env = new Map(seed);
    const actual = a.args.length === 1 ? [tuple[0]] : [tuple[0], tuple[2]];
    const pred = tuple[1];
    const pol = a.args.length === 1 ? tuple[2] : tuple[3];
    const qualifier = a.args.length === 1 ? tuple[3] : tuple[4];
    if (pred !== a.predicate || pol !== a.polarity || qualifier !== (a.qualifier ?? '')) return null;
    for (let i = 0; i < a.args.length; i++) {
      const t = a.args[i];
      if (isConst(t) && t.value !== actual[i]) return null;
      if (isVar(t)) {
        if (env.has(t.name) && env.get(t.name) !== actual[i]) return null;
        env.set(t.name, actual[i]);
      }
    }
    return env;
  }

  #groundAtom(a, env) {
    return { ...a, args: a.args.map(t => isVar(t) && env.has(t.name) ? termConst(env.get(t.name)) : t) };
  }

  #bodyGroundings(body, index, env) {
    if (index === body.length) return [env];
    const a = body[index];
    const out = [];
    for (const tuple of this.db.facts(atomRelation(a))) {
      const next = this.#unifyAtomTuple(a, tuple, env);
      if (next) out.push(...this.#bodyGroundings(body, index + 1, next));
    }
    return out;
  }

  #proof(a, visited = new Set(), depth = 0) {
    if (depth > 40 || a.args.some(isVar)) return null;
    const key = tupleKey(atomRelation(a), atomTuple(a));
    if (visited.has(key) || !this.has(a)) return null;
    if (this.baseFacts.some(f => tupleKey(atomRelation(f), atomTuple(f)) === key)) {
      return { atom: atomText(a), atomObject: a, source: 'given', children: [] };
    }
    const nextVisited = new Set(visited); nextVisited.add(key);
    for (const r of this.rules) {
      const headEnv = this.#unifyAtomTuple(r.head, atomTuple(a), new Map());
      if (!headEnv) continue;
      for (const env of this.#bodyGroundings(r.body, 0, headEnv)) {
        const children = r.body.map(b => this.#proof(this.#groundAtom(b, env), nextVisited, depth + 1));
        if (children.every(Boolean)) return { atom: atomText(a), atomObject: a, source: 'rule', rule: structuredClone(r), children };
      }
    }
    return { atom: atomText(a), atomObject: a, source: 'derived', children: [] };
  }

  #proofDepth(tree) {
    if (!tree) return null;
    if (!tree.children?.length) return 0;
    return 1 + Math.max(...tree.children.map(c => this.#proofDepth(c) ?? 0));
  }

  explain(a) {
    const positive = this.#proof(a);
    const opposite = { ...a, polarity: a.polarity === 'positive' ? 'negative' : 'positive' };
    const negative = this.#proof(opposite);
    const status = positive && negative ? 'both' : positive ? 'true' : negative ? 'false' : 'unknown';
    return { kind: 'explanation', status, atom: a, support: positive, refutation: negative };
  }

  #tupleAtom(relation, tuple) {
    if (relation === 'unary') return atom(tuple[1], [termConst(tuple[0])], tuple[2], tuple[3] || null);
    return atom(tuple[1], [termConst(tuple[0]), termConst(tuple[2])], tuple[3], tuple[4] || null);
  }

  factsAbout(entity) {
    const e = String(entity?.value ?? entity).toLowerCase();
    const facts = [];
    for (const tuple of this.db.facts('unary')) if (tuple[0] === e) facts.push(this.#tupleAtom('unary', tuple));
    for (const tuple of this.db.facts('binary')) if (tuple[0] === e || tuple[2] === e) facts.push(this.#tupleAtom('binary', tuple));
    return facts;
  }

  profile(entity) {
    const e = String(entity?.value ?? entity).toLowerCase();
    const facts = this.factsAbout(e);
    const items = facts.map(a => {
      const proof = this.#proof(a);
      return { atom: a, source: proof?.source ?? 'derived', depth: this.#proofDepth(proof) ?? 0 };
    });
    return {
      kind: 'entityProfile', status: items.length ? 'true' : 'unknown', entity: e,
      facts: items.map(x => x.atom), items,
      directCount: items.filter(x => x.source === 'given').length,
      derivedCount: items.filter(x => x.source !== 'given').length
    };
  }

  describe(entity) {
    const p = this.profile(entity);
    return { kind: 'description', status: p.status, entity: p.entity, facts: p.facts.map(atomText) };
  }

  compare(left, right) {
    const l = String(left?.value ?? left).toLowerCase();
    const r = String(right?.value ?? right).toLowerCase();
    const unaryFeatures = (entity) => this.db.facts('unary')
      .filter(([x]) => x === entity)
      .map(([,predicate,polarity,qualifier]) => JSON.stringify({ predicate, polarity, qualifier: qualifier || null }));
    const ls = new Set(unaryFeatures(l));
    const rs = new Set(unaryFeatures(r));
    const common = [...ls].filter(x => rs.has(x)).sort();
    const leftOnly = [...ls].filter(x => !rs.has(x)).sort();
    const rightOnly = [...rs].filter(x => !ls.has(x)).sort();
    const decode = s => JSON.parse(s);
    return {
      kind: 'comparison', status: 'true', left: l, right: r,
      common: common.map(decode), leftOnly: leftOnly.map(decode), rightOnly: rightOnly.map(decode),
      leftProfile: this.profile(l), rightProfile: this.profile(r)
    };
  }

  summarize() {
    const unary = this.db.facts('unary');
    const binary = this.db.facts('binary');
    const entities = new Set();
    const predicates = new Set();
    for (const [x,p] of unary) { entities.add(x); predicates.add(p); }
    for (const [s,p,o] of binary) { entities.add(s); entities.add(o); predicates.add(p); }
    const samples = [
      ...unary.slice(0,4).map(t => this.#tupleAtom('unary', t)),
      ...binary.slice(0,4).map(t => this.#tupleAtom('binary', t))
    ];
    return {
      kind: 'kbSummary', status: 'true', factCount: unary.length + binary.length,
      baseFactCount: this.baseFacts.length, ruleCount: this.rules.length,
      entityCount: entities.size, predicateCount: predicates.size,
      entities: [...entities].sort(), predicates: [...predicates].sort(), samples
    };
  }

  #missingPaths(a) {
    const paths = [];
    if (a.args.some(isVar)) return paths;
    for (let index = 0; index < this.rules.length; index++) {
      const r = this.rules[index];
      const env = this.#unifyAtomTuple(r.head, atomTuple(a), new Map());
      if (!env) continue;
      const grounded = r.body.map(b => this.#groundAtom(b, env));
      const known = grounded.filter(x => !x.args.some(isVar) && this.has(x));
      const missing = grounded.filter(x => x.args.some(isVar) || !this.has(x));
      paths.push({ ruleIndex: index, head: r.head, known, missing, body: grounded });
    }
    return paths.sort((x,y) => x.missing.length - y.missing.length || y.known.length - x.known.length);
  }

  reflect(a) {
    const answer = this.askBoolean(a);
    const explanation = this.explain(a);
    const paths = this.#missingPaths(a);
    const best = paths[0] ?? null;
    return {
      kind: 'reflection', status: answer.status, atom: a,
      support: explanation.support, refutation: explanation.refutation,
      supportDepth: this.#proofDepth(explanation.support),
      refutationDepth: this.#proofDepth(explanation.refutation),
      relevantRuleCount: paths.length,
      missingPremises: best?.missing ?? [],
      knownPremises: best?.known ?? [],
      alternativePaths: paths.slice(0,3)
    };
  }

  missingFor(a) {
    const paths = this.#missingPaths(a);
    const best = paths[0] ?? null;
    return {
      kind: 'missing', status: best ? (best.missing.length ? 'true' : 'already') : 'unknown',
      atom: a, missing: best?.missing ?? [], known: best?.known ?? [], pathCount: paths.length
    };
  }

  exportState() {
    return { baseFacts: structuredClone(this.baseFacts), rules: structuredClone(this.rules) };
  }

  forget(command) {
    const before = this.baseFacts.length + this.rules.length;
    if (command.kind === 'assertFact' || command.kind === 'assertFacts') {
      const atoms = command.kind === 'assertFact' ? [command.payload] : command.payload;
      atoms.forEach(a => validateAtom(a, { ground: true }));
      this.baseFacts = this.baseFacts.filter(fact => !atoms.some(a => sameAtom(fact, a)));
    } else if (command.kind === 'assertRule') {
      this.rules = this.rules.filter(rule => JSON.stringify(rule) !== JSON.stringify(command.payload));
    } else throw new Error('Forget requires an asserted fact, conjunction of facts, or rule');
    this.#rebuild();
    return { removed: before - this.baseFacts.length - this.rules.length };
  }

  importState(state) {
    for (const fact of state.baseFacts ?? []) validateAtom(fact, { ground: true });
    for (const rule of state.rules ?? []) validateRule(rule);
    this.baseFacts = structuredClone(state.baseFacts ?? []);
    this.rules = structuredClone(state.rules ?? []);
    this.#rebuild();
  }

  snapshotState() { return this.exportState(); }
  restoreState(state) { this.importState(state); }

  snapshot() {
    return {
      engine: this.datalog.engineName,
      unary: this.db.facts('unary'),
      binary: this.db.facts('binary'),
      rules: this.rules.map(r => ({ head: atomText(r.head), body: r.body.map(atomText) }))
    };
  }
}
