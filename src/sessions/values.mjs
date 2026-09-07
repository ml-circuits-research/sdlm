export function valueName(name) {
  if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)) throw new Error('Invalid value name');
  return name;
}

export function resolveValue(values, reference) {
  if (typeof reference !== 'string') throw new Error('Value reference must be a string');
  const parts = reference.split('.');
  let value = values;
  for (const part of parts) {
    if (!value || typeof value !== 'object' || !Object.hasOwn(value, part)) throw new Error(`Unknown value reference: ${reference}`);
    value = value[part];
  }
  return structuredClone(value);
}

export function resolveInputs(values, input) {
  if (!input || typeof input !== 'object') return input;
  if (Object.keys(input).length === 1 && Object.hasOwn(input, '$ref')) return resolveValue(values, input.$ref);
  if (Array.isArray(input)) return input.map(item => resolveInputs(values, item));
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, resolveInputs(values, value)]));
}

// Values remain ordinary SOP constructor calls, including nested objects and arrays.
export function valuesSource(values) {
  const lines = [];
  let sequence = 0;
  const emit = (command, args) => {
    const id = `v${++sequence}`;
    lines.push(`@${id} ${command}`);
    for (const [key, value] of Object.entries(args)) lines.push(`    ${key} ${value}`);
    return `$${id}`;
  };
  const serialize = value => {
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Cannot save a non-finite value');
      return emit('constant', { value: JSON.stringify(value) });
    }
    if (Array.isArray(value)) return emit('list', Object.fromEntries(value.map((item, i) => [`item${i + 1}`, serialize(item)])));
    if (!value || typeof value !== 'object') throw new Error('Only JSON-compatible values can be saved');
    const entries = serialize(Object.entries(value));
    return emit('objectFromEntries', { entries });
  };
  lines.push(`@output result ${serialize(values)}`);
  return lines.join('\n') + '\n';
}
