const primitive = value => value == null || ['string', 'number', 'boolean'].includes(typeof value);

export function observationKey(path, value) {
  return JSON.stringify([String(path), value == null ? null : value]);
}

function walk(value, path, keys, descendantRoot = null) {
  if (primitive(value)) {
    keys.add(observationKey(path, value));
    return;
  }
  if (Array.isArray(value)) {
    keys.add(observationKey(`${path}.length`, value.length));
    value.forEach((item, index) => {
      walk(item, `${path}.${index}`, keys, descendantRoot);
      walk(item, `${path}.*`, keys, descendantRoot);
    });
    if (value.length) walk(value.at(-1), `${path}.last`, keys, descendantRoot);
    return;
  }
  if (typeof value === 'object') {
    for (const [name, child] of Object.entries(value)) {
      if (descendantRoot && primitive(child)) keys.add(observationKey(`${descendantRoot}.desc.${name}`, child));
      walk(child, `${path}.${name}`, keys, descendantRoot);
    }
  }
}

export function buildRequestObservations(request) {
  const keys = new Set();
  if (request.tokens) walk(request.tokens, 'tokens', keys, null);
  if (request.value !== undefined) walk(request.value, 'value', keys, 'value');
  return keys;
}
