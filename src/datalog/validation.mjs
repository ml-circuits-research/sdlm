export function validateAtom(atom, { ground = false } = {}) {
  if (atom?.kind !== 'atom' || typeof atom.predicate !== 'string' || !atom.predicate) {
    throw new Error('An atom requires a non-empty predicate');
  }
  if (!Array.isArray(atom.args) || ![1, 2].includes(atom.args.length)) {
    throw new Error('Only unary and binary atoms are supported');
  }
  if (!['positive', 'negative'].includes(atom.polarity)) throw new Error('Invalid atom polarity');
  if (atom.qualifier != null && typeof atom.qualifier !== 'string') throw new Error('Invalid atom qualifier');
  for (const term of atom.args) {
    if (term?.kind === 'const' && typeof term.value === 'string' && term.value.length) continue;
    if (!ground && term?.kind === 'var' && typeof term.name === 'string' && term.name.length) continue;
    throw new Error(ground ? 'Cannot assert a non-ground or invalid fact' : 'Invalid atom term');
  }
}

export function validateRule(rule) {
  if (rule?.kind !== 'rule' || !Array.isArray(rule.body) || !rule.body.length) {
    throw new Error('A rule requires a head and a non-empty body');
  }
  validateAtom(rule.head);
  rule.body.forEach(atom => validateAtom(atom));
  const bound = new Set(rule.body.flatMap(atom => atom.args.filter(t => t.kind === 'var').map(t => t.name)));
  for (const term of rule.head.args) {
    if (term.kind === 'var' && !bound.has(term.name)) {
      throw new Error(`Unsafe rule: unbound head variable ${term.name}`);
    }
  }
}
