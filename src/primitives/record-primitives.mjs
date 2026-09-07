import { registerPrimitive } from '../kernel/primitive-registry.mjs';

// Generic record selection and bounded recency. Field names and selection policy
// are supplied by circuits; these operations do not know the records' domain.
export function registerRecordPrimitives(registry) {
  const add = (name, fn) => registerPrimitive(registry, name, fn);
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  add('filterMatching', ({ values = [], match = {} }) => values.filter(value =>
    Object.entries(match).every(([key, expected]) => equal(value?.[key], expected))));
  add('rememberRecord', ({ values = [], value, keys, limit }) => [value, ...values.filter(prior =>
    !keys.every(key => equal(prior?.[key], value?.[key])))].slice(0, Number(limit)));
  add('concatLists', args => Object.values(args).flatMap(values => values ?? []));
  add('sliceText', ({ value, start, end }) => String(value).slice(start, end));
  add('textStartsWith', ({ value, prefix }) => {
    if (typeof value !== 'string' || !value.startsWith(prefix)) {
      throw Object.assign(new Error('Text prefix did not match'), { name: 'NoMatchError' });
    }
    return true;
  });
}
