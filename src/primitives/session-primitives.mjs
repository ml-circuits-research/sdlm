import { registerPrimitive } from '../kernel/primitive-registry.mjs';

// Generic state and collection operations. Values, allowed settings and presentation
// policy are supplied by SOP circuits, including the functions used for each item.
export function registerSessionPrimitives(registry, context) {
  const add = (name, fn, metadata) => registerPrimitive(registry, name, fn, metadata);
  const requireMatch = condition => {
    if (!condition) throw Object.assign(new Error('Value did not match the circuit guard'), { name: 'NoMatchError' });
    return true;
  };
  add('valueIs', ({ value, expected }) => requireMatch(value === expected));
  add('valuePresent', ({ value }) => requireMatch(value != null));
  add('hasItems', ({ values }) => requireMatch(Array.isArray(values) && values.length > 0));
  add('valueIn', ({ value, values }) => requireMatch(values.includes(value)));
  add('trimTokenEdges', ({ tokens, leading = [], trailing = [] }) => {
    let start = 0, end = tokens.length;
    while (start < end && leading.includes(tokens[start].norm)) start++;
    while (end > start && trailing.includes(tokens[end - 1].norm)) end--;
    return tokens.slice(start, end);
  });
  add('symbolicTokenSpan', ({ tokens, maximum, excludedClasses = [] }) => {
    requireMatch(tokens.length > 0 && tokens.length <= maximum && tokens.every(token =>
      /^[\p{L}][\p{L}\p{N}_'-]*$/u.test(token.norm) &&
      !excludedClasses.some(name => token.classes.includes(name))));
    return tokens;
  });
  add('jsonString', ({ value }) => JSON.stringify(value));
  add('upperInitial', ({ value }) => String(value).slice(0, 1).toUpperCase() + String(value).slice(1));
  add('getSessionSetting', ({ name }) => context.settings.read(name), { effect: 'read' });
  add('setSessionSetting', ({ name, value }) => context.settings.write(name, value), { effect: 'write' });
  add('filterField', ({ values, path, excluded }) => values.filter(value => {
    for (const field of path) value = value?.[field];
    return !excluded.includes(value);
  }));
  add('mapReadCircuit', async ({ values, circuit }) => {
    // The runtime check also covers dynamic targets and subsequently installed packs.
    // A writer can never hide behind the mapping operation's read effect.
    if (!context.effectAnalyzer.isSpeculativelySafe(circuit)) throw new Error('Mapping requires a read-only circuit');
    const results = [];
    for (const value of values ?? []) {
      context.checkBudget();
      results.push(await context.run(circuit, { value }));
    }
    return results;
  }, { effect: 'read' });
}
