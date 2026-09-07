const key = value => JSON.stringify(value);

export class InterpretationEvidence {
  constructor(kb) {
    this.kb = kb;
    this.active = [];
    this.state = { sequence: 0, decisions: [], sources: [], feedback: [], gaps: [], invalidatedValues: [], valueDependencies: {} };
  }
  snapshot() { return structuredClone(this.state); }
  restore(state) { this.state = structuredClone(state); }
  seed() {
    for (const fact of this.kb.baseFacts) this.record('fact', fact);
    for (const rule of this.kb.rules) this.record('rule', rule);
  }
  record(kind, value) {
    let source = this.state.sources.find(item => item.kind === kind && key(item.value) === key(value));
    if (!source) {
      source = { kind, value: structuredClone(value), supports: [] };
      this.state.sources.push(source);
    }
    if (!source.supports.some(ids => key(ids) === key(this.active))) source.supports.push([...this.active]);
  }
  blocked(decision, circuit) {
    return this.state.decisions.some(item => item.status === 'rejected' && item.circuit === circuit &&
      item.category === decision.category && item.original === decision.original && item.value === decision.value);
  }
  select(decisions, input, circuit) {
    if (this.state.decisions.length + decisions.length > 2048) throw new Error('Assumption limit reached; start a new session');
    return decisions.map(decision => {
      const item = { ...decision, id: `a${++this.state.sequence}`, input, circuit, status: 'active' };
      this.state.decisions.push(item);
      return item;
    });
  }
  gap(input, tokens) {
    const item = { input, tokens, reason: 'No installed interpretation circuit produced an executable command.' };
    this.state.gaps.push(item);
    if (this.state.gaps.length > 100) this.state.gaps.shift();
    return item;
  }
  sourceIds(kind, value) {
    const source = this.state.sources.find(item => item.kind === kind && key(item.value) === key(value));
    if (!source) return [];
    const rejected = new Set(this.state.decisions.filter(item => item.status === 'rejected').map(item => item.id));
    const supports = source.supports.filter(ids => !ids.some(id => rejected.has(id)));
    // Prefer an independent explicit assertion when one exists.
    return supports.sort((a, b) => a.length - b.length)[0] ?? [];
  }
  dependencies(proof) {
    if (!proof) return [];
    return [...new Set([
      ...this.sourceIds(proof.source === 'given' ? 'fact' : 'rule', proof.rule ?? proof.atomObject),
      ...(proof.children ?? []).flatMap(child => this.dependencies(child))
    ])];
  }
  forget(command) {
    const values = command.kind === 'assertFacts' ? command.payload : [command.payload];
    const kind = command.kind === 'assertRule' ? 'rule' : 'fact';
    this.state.sources = this.state.sources.filter(item => item.kind !== kind || !values.some(v => key(v) === key(item.value)));
  }
  references(inputs) {
    const ids = new Set();
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.$ref === 'string') for (const id of this.state.valueDependencies[value.$ref.split('.')[0]] ?? []) ids.add(id);
      for (const child of Object.values(value)) walk(child);
    };
    walk(inputs);
    return [...ids];
  }
  bind(name, value, inputs = {}) {
    this.state.invalidatedValues = this.state.invalidatedValues.filter(item => item !== name);
    const ids = new Set(this.references(inputs));
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (this.state.decisions.some(item => item.id === value.id)) ids.add(value.id);
      if (value.kind === 'atom' && value.args.every(term => term.kind === 'const')) {
        const proof = this.kb.explain(value);
        for (const id of [...this.dependencies(proof.support), ...this.dependencies(proof.refutation)]) ids.add(id);
      }
      for (const child of Object.values(value)) walk(child);
    };
    walk(value);
    this.state.valueDependencies[name] = [...ids];
    if (this.state.decisions.some(item => item.status === 'rejected' && ids.has(item.id))) {
      this.state.invalidatedValues.push(name);
    }
  }
  pruneValues(values) {
    for (const name of Object.keys(this.state.valueDependencies)) {
      if (!Object.hasOwn(values, name)) delete this.state.valueDependencies[name];
    }
    this.state.invalidatedValues = this.state.invalidatedValues.filter(name => Object.hasOwn(values, name));
  }
  usableValues(values) {
    return Object.fromEntries(Object.entries(values).filter(([name]) => !this.state.invalidatedValues.includes(name)));
  }
  invalidateValues(values, id) {
    const contains = value => value && typeof value === 'object' &&
      (value.id === id || Object.values(value).some(contains));
    const invalid = new Set(this.state.invalidatedValues);
    for (const [name, value] of Object.entries(values)) if (contains(value)) invalid.add(name);
    for (const [name, ids] of Object.entries(this.state.valueDependencies)) if (ids.includes(id)) invalid.add(name);
    this.state.invalidatedValues = [...invalid];
    return [...invalid];
  }
  reject(id, note = '') {
    const decision = this.state.decisions.find(item => item.id === id);
    if (!decision) throw new Error(`Unknown assumption: ${id}`);
    decision.status = 'rejected';
    this.state.feedback.push({ id, note: String(note).slice(0, 4000), decision: structuredClone(decision) });
    if (this.state.feedback.length > 200) this.state.feedback.shift();
    const rejected = new Set(this.state.decisions.filter(item => item.status === 'rejected').map(item => item.id));
    const removed = this.state.sources.filter(item => !item.supports.some(ids => !ids.some(a => rejected.has(a))) &&
      (item.kind === 'rule' ? this.kb.rules : this.kb.baseFacts).some(value => key(value) === key(item.value)));
    for (const source of removed) this.kb.forget({
      kind: source.kind === 'rule' ? 'assertRule' : 'assertFact', payload: source.value
    });
    return { id, status: 'rejected', removed: removed.map(({ kind, value }) => ({ kind, value })) };
  }
}
