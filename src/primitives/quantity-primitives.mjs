import { registerPrimitive } from '../kernel/primitive-registry.mjs';
import { atom, termConst, termVar } from '../datalog/knowledge-base.mjs';

const finite = value => {
  const number = Number(value);
  if (!Number.isFinite(number) || Math.abs(number) > 1e12) throw new Error('Numeric value is outside the supported range');
  return number;
};

export function registerQuantityPrimitives(registry, context) {
  const add = (name, fn, metadata = {}) => registerPrimitive(registry, name, fn, metadata);
  add('numericToken', ({ tokens, index }) => {
    const token = tokens[index];
    if (!token?.classes.includes('number')) throw Object.assign(new Error('Expected a number'), { name: 'NoMatchError' });
    return finite(token.norm);
  });
  add('calculateNumber', ({ left, right, operation }) => {
    const a = finite(left), b = finite(right);
    if (operation === 'divide' && b === 0) return { kind: 'operationGap', status: 'unknown', reason: 'Division by zero is undefined.' };
    const operations = { add: () => a + b, subtract: () => a - b, multiply: () => a * b, divide: () => a / b };
    if (!Object.hasOwn(operations, operation)) throw new Error(`Unknown numeric operation: ${operation}`);
    return { kind: 'number', value: finite(operations[operation]()), computation: { operation, left: a, right: b } };
  });
  add('compareNumbers', ({ left, right, operation }) => {
    const a = finite(left), b = finite(right);
    const operations = { greater: a > b, less: a < b, equal: a === b };
    if (!Object.hasOwn(operations, operation)) throw new Error(`Unknown comparison: ${operation}`);
    return { kind: 'boolean', status: operations[operation] ? 'true' : 'false', computation: { operation, left: a, right: b } };
  });
  const query = (subject, predicate) => context.kb.askBindings(atom(predicate, [subject, termVar('Value')]));
  const replace = (subject, predicate, value, inherited = []) => {
    const next = atom(predicate, [subject, termConst(value)]);
    const previous = context.kb.baseFacts.filter(fact => fact.predicate === predicate && fact.args.length === 2 &&
      fact.args[0].value === subject.value && fact.polarity === 'positive' && !fact.qualifier);
    for (const fact of previous) {
      // Repeating the same value adds support without destroying an independent assertion.
      if (JSON.stringify(fact) === JSON.stringify(next)) continue;
      context.kb.forget({ kind: 'assertFact', payload: fact });
      context.evidence.forget({ kind: 'assertFact', payload: fact });
    }
    const fact = next;
    const result = context.kb.addFact(fact);
    const active = context.evidence.active;
    try {
      context.evidence.active = [...new Set([...active, ...inherited])];
      context.evidence.record('fact', fact);
    } finally { context.evidence.active = active; }
    return result;
  };
  add('kbSetValue', ({ subject, predicate, value }) => replace(subject, predicate, value), { effect: 'write' });
  add('kbReadValue', ({ subject, predicate, numeric = false }) => {
    const answer = query(subject, predicate);
    if (answer.values.length !== 1) return { kind: 'operationGap', status: 'unknown', reason: 'No unique stored value is available.' };
    return { kind: 'value', status: 'true', value: numeric ? finite(answer.values[0]) : answer.values[0],
      atom: atom(predicate, [subject, termConst(answer.values[0])]) };
  }, { effect: 'read' });
  add('kbAdjustNumber', ({ subject, predicate, delta, minimum = 0 }) => {
    const answer = query(subject, predicate);
    if (answer.values.length !== 1) return { kind: 'operationGap', status: 'unknown', reason: 'A starting quantity is needed.' };
    const prior = finite(answer.values[0]), change = finite(delta), value = finite(prior + change);
    if (value < minimum) return { kind: 'operationGap', status: 'unknown', reason: 'The requested change exceeds the available quantity.' };
    const fact = atom(predicate, [subject, termConst(prior)]);
    const inherited = context.evidence.dependencies(context.kb.explain(fact).support);
    replace(subject, predicate, value, inherited);
    return { kind: 'number', value, atom: atom(predicate, [subject, termConst(value)]),
      computation: { operation: 'add', left: prior, right: change } };
  }, { effect: 'write' });
  add('kbDefaultApplicable', ({ target, premises, blockers }) => {
    const applicable = context.kb.askBoolean(target).status === 'unknown' &&
      premises.every(item => context.kb.askBoolean(item).status === 'true') &&
      blockers.every(item => !['true', 'both'].includes(context.kb.askBoolean(item).status));
    if (!applicable) throw Object.assign(new Error('Default conditions are not satisfied'), { name: 'NoMatchError' });
    return true;
  }, { effect: 'read' });
  add('kbConditionalAnswer', ({ target, premises }) => ({ kind: 'boolean', status: 'true', atom: target,
    hypothetical: true, premises, support: premises.map(item => context.kb.explain(item)) }), { effect: 'read' });
}
