import { registerPrimitive } from '../kernel/primitive-registry.mjs';

// Edit distance with adjacent transpositions. Policy supplies the distance and minimum length.
export function distance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1,
      rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
      rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

export function registerInterpretationPrimitives(registry, context) {
  const add = (name, fn, metadata = {}) => registerPrimitive(registry, name, fn, metadata);
  add('interpretSymbol', ({ tokens, index, classes, category, transforms = [], reason }) => {
    const token = tokens[index];
    if (!token || !/^[\p{L}][\p{L}\p{N}_'-]*$/u.test(token.norm)) {
      throw Object.assign(new Error('Expected a symbolic word'), { name: 'NoMatchError' });
    }
    const klass = classes.find(name => token.lemmas?.[name]);
    if (klass) return { value: token.lemmas[klass], decisions: [] };
    let value = token.norm;
    const transform = transforms.find(rule => value.endsWith(rule.suffix) &&
      value.length - rule.suffix.length >= rule.minStem);
    if (transform) value = value.slice(0, -transform.suffix.length) + transform.replacement;
    return { value, decisions: [{ category, original: token.surface, value, reason,
      evidence: { index, classes: token.classes, transformation: transform ?? null }, certainty: 'heuristic' }] };
  }, { effect: 'read' });
  add('collectDecisions', args => Object.values(args).flatMap(value => value?.decisions ?? []));
  add('reviewUnknownPredicates', ({ proposal, category, reason }) => {
    const result = structuredClone(proposal);
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (value.kind === 'atom') {
        const known = [...context.language.lexemes.values()].some(entries =>
          entries.some(entry => entry.lemma === value.predicate));
        if (!known && !result.decisions.some(item => item.value === value.predicate)) {
          result.decisions.push({ category, original: value.predicate, value: value.predicate, reason,
            evidence: { arity: value.args.length, parser: result.circuit }, certainty: 'heuristic' });
        }
      } else for (const child of Object.values(value)) {
        if (Array.isArray(child)) child.forEach(walk); else walk(child);
      }
    };
    walk(result.command.payload);
    return result;
  }, { effect: 'read' });
  add('reviewReferences', ({ proposal, entities, rejected = [], maxDistance, minLength, maxLength, reason, category, preserveKinds = [] }) => {
    const result = structuredClone(proposal);
    // SOP policy identifies commands whose supplied identities must remain exact.
    if (preserveKinds.includes(result.command.kind)) return result;
    const walk = value => {
      if (!value || typeof value !== 'object') return;
      if (value.kind === 'const' && !entities.includes(value.value) &&
        value.value.length >= minLength && value.value.length <= maxLength) {
        const alternatives = entities.filter(entity => entity.length <= maxLength &&
          Math.abs(value.value.length - entity.length) <= maxDistance).map(entity => {
          context.checkBudget?.();
          return { value: entity, distance: distance(value.value, entity) };
        })
          .filter(item => item.distance <= maxDistance && !rejected.some(decision =>
            decision.category === category && decision.original === value.value && decision.value === item.value))
          .sort((a, b) => a.distance - b.distance ||
            a.value.localeCompare(b.value));
        if (alternatives.length) {
          const selected = alternatives[0];
          result.decisions.push({ category, original: value.value, value: selected.value, reason,
            certainty: 'heuristic', evidence: { alternatives, selectedBy: 'distance-then-name', maxDistance } });
          value.value = selected.value;
        }
      } else for (const child of Object.values(value)) {
        if (Array.isArray(child)) child.forEach(walk); else walk(child);
      }
    };
    walk(result.command.payload);
    return result;
  });
}
