// Minimal positive Datalog compatibility layer used only when @suss/datalog
// is unavailable. It implements the subset exercised by this prototype.

export const variable = (name) => ({ kind: 'var', name });
export const constant = (value) => ({ kind: 'const', value });
export const lit = (relation, ...terms) => ({ relation, terms, negated: false });
export const rule = (relation, headTerms, body) => ({ relation, headTerms, body });

const key = (tuple) => JSON.stringify(tuple);
const termValue = (term, env) => term.kind === 'var' ? env.get(term.name) : term.value;

export class Database {
  constructor() {
    this.relations = new Map();
  }
  add(relation, tuple) {
    if (!this.relations.has(relation)) this.relations.set(relation, new Map());
    this.relations.get(relation).set(key(tuple), tuple.slice());
  }
  facts(relation) {
    return [...(this.relations.get(relation)?.values() ?? [])].map(x => x.slice());
  }
  clear(relation) { this.relations.delete(relation); }
}

function unifyLiteral(literal, tuple, env) {
  if (tuple.length !== literal.terms.length) return null;
  const out = new Map(env);
  for (let i = 0; i < tuple.length; i++) {
    const term = literal.terms[i];
    if (term.kind === 'const') {
      if (!Object.is(term.value, tuple[i])) return null;
    } else if (out.has(term.name)) {
      if (!Object.is(out.get(term.name), tuple[i])) return null;
    } else out.set(term.name, tuple[i]);
  }
  return out;
}

function solutions(db, body, index = 0, env = new Map()) {
  if (index >= body.length) return [env];
  const literal = body[index];
  if (literal.negated) throw new Error('mini-datalog fallback does not implement negation');
  const out = [];
  for (const tuple of db.facts(literal.relation)) {
    const next = unifyLiteral(literal, tuple, env);
    if (next) out.push(...solutions(db, body, index + 1, next));
  }
  return out;
}

export function evaluate(db, rules) {
  let changed = true;
  let rounds = 0;
  while (changed) {
    if (++rounds > 10000) throw new Error('Datalog did not converge');
    changed = false;
    for (const r of rules) {
      for (const env of solutions(db, r.body)) {
        const tuple = r.headTerms.map(t => termValue(t, env));
        const before = db.facts(r.relation).length;
        db.add(r.relation, tuple);
        if (db.facts(r.relation).length !== before) changed = true;
      }
    }
  }
  return db;
}
