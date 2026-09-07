import { primitiveMetadata } from './primitive-registry.mjs';

const ORDER = new Map([['pure', 0], ['read', 1], ['write', 2], ['external', 3], ['unknown', 4]]);
const STRUCTURAL_CALLS = new Set(['callCircuit', 'callCandidates', 'callParallelCandidates']);
const maxEffect = (a, b) => ORDER.get(a) >= ORDER.get(b) ? a : b;

export class EffectAnalyzer {
  constructor({ circuits, primitives }) {
    this.circuits = circuits;
    this.primitives = primitives;
    this.refresh();
  }

  refresh() {
    this.memo = new Map();
    this.groups = new Map();
    for (const def of this.circuits.values()) {
      if (!this.groups.has(def.group)) this.groups.set(def.group, []);
      this.groups.get(def.group).push(def.name);
    }
  }

  primitiveEffect(name) {
    const effect = primitiveMetadata(this.primitives, name)?.effect;
    return ORDER.has(effect) ? effect : 'unknown';
  }

  #targets(def, node) {
    if (typeof node.args.circuit === 'string') return [node.args.circuit];
    const ref = node.args.candidates?.ref ?? node.args.circuit?.ref;
    const source = def.nodes.find(candidate => candidate.id === ref);
    const metadata = source && primitiveMetadata(this.primitives, source.command);
    return metadata?.selectsGroup && typeof source.args.group === 'string'
      ? this.groups.get(source.args.group) ?? [] : [];
  }

  circuitEffect(name) {
    if (this.memo.has(name)) return this.memo.get(name);
    const pending = [name];
    const visited = new Set();
    let effect = 'pure';
    while (pending.length) {
      const target = pending.pop();
      if (visited.has(target)) continue;
      visited.add(target);
      const def = this.circuits.get(target);
      if (!def) {
        effect = maxEffect(effect, this.primitiveEffect(target));
        continue;
      }
      for (const node of def.nodes) {
        if (STRUCTURAL_CALLS.has(node.command)) {
          const targets = this.#targets(def, node);
          if (!targets.length) effect = 'unknown';
          pending.push(...targets);
        } else pending.push(node.command);
      }
    }
    // Cache only the root after visiting all reachable dependencies, including cycles.
    this.memo.set(name, effect);
    return effect;
  }

  isSpeculativelySafe(name) { return ['pure', 'read'].includes(this.circuitEffect(name)); }
}
