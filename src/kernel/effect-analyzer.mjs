import { primitiveMetadata } from './primitive-registry.mjs';

const ORDER = new Map([['pure',0],['read',1],['write',2],['external',3],['unknown',4]]);
const STRUCTURAL_CALLS = new Set(['callCircuit', 'callCandidates', 'callParallelCandidates']);

function maxEffect(a, b) { return ORDER.get(a) >= ORDER.get(b) ? a : b; }

export class EffectAnalyzer {
  constructor({ circuits, primitives }) {
    this.circuits = circuits;
    this.primitives = primitives;
    this.memo = new Map();
  }

  refresh() { this.memo.clear(); }

  primitiveEffect(name) {
    const metadata = primitiveMetadata(this.primitives, name);
    return metadata?.effect ?? (this.primitives.has(name) ? 'pure' : 'unknown');
  }

  #groupEffect(group, stack) {
    const defs = [...this.circuits.values()].filter(circuit => circuit.group === group);
    if (!defs.length) return 'unknown';
    return defs.reduce((effect, def) => maxEffect(effect, this.circuitEffect(def.name, stack)), 'pure');
  }

  #dynamicTargetEffect(def, node, stack) {
    const ref = node.args.candidates?.ref ?? node.args.circuit?.ref;
    if (!ref) return 'unknown';
    const source = def.nodes.find(candidate => candidate.id === ref);
    const metadata = source ? primitiveMetadata(this.primitives, source.command) : null;
    const group = source?.args?.group;
    if (metadata?.selectsGroup && typeof group === 'string') return this.#groupEffect(group, stack);
    return 'unknown';
  }

  circuitEffect(name, stack = new Set()) {
    if (this.memo.has(name)) return this.memo.get(name);
    if (stack.has(name)) return 'pure';
    const def = this.circuits.get(name);
    if (!def) return this.primitiveEffect(name);

    const next = new Set(stack); next.add(name);
    let effect = 'pure';
    for (const node of def.nodes) {
      let nodeEffect;
      if (STRUCTURAL_CALLS.has(node.command)) {
        const literal = node.args.circuit;
        if (typeof literal === 'string') nodeEffect = this.circuitEffect(literal, next);
        else nodeEffect = this.#dynamicTargetEffect(def, node, next);
      } else if (this.circuits.has(node.command)) nodeEffect = this.circuitEffect(node.command, next);
      else nodeEffect = this.primitiveEffect(node.command);
      effect = maxEffect(effect, nodeEffect);
    }
    this.memo.set(name, effect);
    return effect;
  }

  isSpeculativelySafe(name) { return ['pure','read'].includes(this.circuitEffect(name)); }
}
