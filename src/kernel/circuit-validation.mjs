const STRUCTURAL = new Set(['callCircuit', 'callCandidates', 'callParallelCandidates']);

export function validateCircuits(circuits, primitives) {
  for (const def of circuits.values()) {
    const dependencies = new Map(def.nodes.map(node => [node.id,
      Object.values(node.args).filter(value => value?.ref && !def.inputs.includes(value.ref)).map(value => value.ref)
    ]));
    const done = new Set();
    const visiting = new Set();
    const visit = id => {
      if (done.has(id)) return;
      if (visiting.has(id)) throw new Error(`${def.name}: cyclic data dependencies at ${id}`);
      visiting.add(id);
      for (const dependency of dependencies.get(id) ?? []) visit(dependency);
      visiting.delete(id);
      done.add(id);
    };
    for (const node of def.nodes) {
      visit(node.id);
      if (!STRUCTURAL.has(node.command) && !circuits.has(node.command) && !primitives.has(node.command)) {
        throw new Error(`${def.name}: unknown command ${node.command}`);
      }
      const target = node.command === 'callCircuit' ? node.args.circuit : node.command;
      if (node.command === 'callCircuit' && typeof target === 'string' && !circuits.has(target)) {
        throw new Error(`${def.name}: unknown circuit ${target}`);
      }
      if (circuits.has(target)) {
        for (const input of circuits.get(target).inputs) {
          if (!Object.hasOwn(node.args, input)) throw new Error(`${def.name}: ${target} requires input ${input}`);
        }
      }
    }
  }
}
