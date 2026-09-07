const META = Symbol('sopPrimitiveMetadata');

export function registerPrimitive(registry, name, run, metadata = {}) {
  if (registry.has(name)) throw new Error(`duplicate primitive ${name}`);
  Object.defineProperty(run, META, {
    value: Object.freeze({ effect: 'pure', ...metadata }),
    enumerable: false,
    configurable: false,
    writable: false
  });
  registry.set(name, run);
  return run;
}

export function primitiveMetadata(registry, name) {
  return registry.get(name)?.[META] ?? null;
}

export function literalArgument(args, name) {
  const value = args?.[name];
  return value && typeof value === 'object' && value.ref ? undefined : value;
}

export function referencesCircuitInput(args, name, circuit) {
  const value = args?.[name];
  return Boolean(value && typeof value === 'object' && value.ref && circuit.inputs.includes(value.ref));
}
