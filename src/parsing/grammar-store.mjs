function normalizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'object') throw new Error('Grammar RHS symbols must be values created by grammarToken or grammarCategory');
  const kind = String(symbol.kind);
  if (!['terminal', 'category'].includes(kind)) throw new Error(`Unknown grammar symbol kind ${kind}`);
  const value = String(symbol.value ?? '');
  if (!value) throw new Error('Grammar symbol needs a non-empty value');
  return { kind, value };
}

export class GrammarStore {
  constructor() { this.rules = []; }
  addRule({ name, lhs, rhs, weight = 1 }) {
    const rule = { name: String(name), lhs: String(lhs), rhs: (rhs ?? []).map(normalizeSymbol), weight: Number(weight ?? 1) };
    if (!rule.name || !rule.lhs || !rule.rhs.length) throw new Error('Grammar rule needs name, lhs and non-empty rhs');
    if (!this.rules.some(existing => existing.name === rule.name)) this.rules.push(rule);
    return true;
  }
  snapshot() { return structuredClone(this.rules); }
  restore(state) { this.rules = structuredClone(state ?? []); }
}
