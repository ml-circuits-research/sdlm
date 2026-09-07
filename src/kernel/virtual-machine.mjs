let globalRun = 0;

const refDeps = (args) => Object.values(args).filter(v => v && typeof v === 'object' && v.node).map(v => v.node);

export class VirtualMachine {
  constructor({ circuits, primitives, trace, transactions = null, effectAnalyzer = null, budget = null }) {
    this.circuits = circuits;
    this.primitives = primitives;
    this.trace = trace;
    this.transactions = transactions;
    this.effectAnalyzer = effectAnalyzer;
    this.budget = budget;
    this.nodes = new Map();
    this.frames = new Map();
    this.frameNo = 0;
    this.epoch = 0;
  }

  #resolveArg(spec) {
    if (spec && typeof spec === 'object' && spec.node) {
      const n = this.nodes.get(spec.node);
      if (!n || n.status !== 'done') throw new Error(`wire ${spec.node} is not ready`);
      return n.value;
    }
    if (spec && typeof spec === 'object' && Object.hasOwn(spec, 'value')) return spec.value;
    return spec;
  }

  #resolvedArgs(node) {
    return Object.fromEntries(Object.entries(node.args).map(([k, v]) => [k, this.#resolveArg(v)]));
  }

  #ready(node) {
    return node.status === 'pending' && refDeps(node.args).every(uid => this.nodes.get(uid)?.status === 'done');
  }

  #topologicalPending() {
    const pending = [...this.nodes.values()].filter(n => n.status === 'pending');
    const pendingSet = new Set(pending.map(n => n.uid));
    const indegree = new Map(pending.map(n => [n.uid, 0]));
    const edges = new Map(pending.map(n => [n.uid, []]));
    for (const n of pending) {
      for (const d of refDeps(n.args)) {
        if (!pendingSet.has(d)) continue;
        indegree.set(n.uid, indegree.get(n.uid) + 1);
        edges.get(d).push(n.uid);
      }
    }
    const queue = pending.filter(n => indegree.get(n.uid) === 0).sort((a,b) => a.order - b.order);
    const out = [];
    while (queue.length) {
      const n = queue.shift(); out.push(n);
      for (const to of edges.get(n.uid)) {
        indegree.set(to, indegree.get(to) - 1);
        if (indegree.get(to) === 0) {
          queue.push(this.nodes.get(to)); queue.sort((a,b) => a.order - b.order);
        }
      }
    }
    if (out.length !== pending.length) throw new Error('Cycle detected in active SOP circuit');
    return out;
  }

  #materializeSpec(value, localMap, inputs) {
    if (value && typeof value === 'object' && value.ref) {
      if (Object.hasOwn(inputs, value.ref)) return { value: inputs[value.ref] };
      const uid = localMap.get(value.ref);
      if (!uid) throw new Error(`unresolved local wire $${value.ref}`);
      return { node: uid };
    }
    return { value };
  }

  #expand(parentNode, circuitName, inputs) {
    const def = this.circuits.get(circuitName);
    if (!def) throw new Error(`Unknown circuit ${circuitName}`);
    for (const required of def.inputs) if (!Object.hasOwn(inputs, required)) throw new Error(`${circuitName}: missing input ${required}`);

    const before = this.nodes.size;
    this.budget?.check(before + def.nodes.length);
    const frameId = `f${++this.frameNo}:${circuitName}`;
    const localMap = new Map();
    def.nodes.forEach(n => localMap.set(n.id, `${frameId}/${n.id}`));
    const frameNodes = new Set();
    def.nodes.forEach((n, i) => {
      const uid = localMap.get(n.id);
      const args = Object.fromEntries(Object.entries(n.args).map(([k,v]) => [k, this.#materializeSpec(v, localMap, inputs)]));
      this.nodes.set(uid, {
        uid, label: `${circuitName}.${n.id}`, command: n.command, args,
        status: 'pending', value: undefined, childFrame: null, frameId, order: i,
        candidates: null, candidateIndex: 0, candidateInputs: null, transactionId: null
      });
      frameNodes.add(uid);
    });
    const outputs = new Map();
    for (const [name, ref] of def.outputs) {
      if (Object.hasOwn(inputs, ref)) outputs.set(name, { value: inputs[ref] });
      else outputs.set(name, { node: localMap.get(ref) });
    }
    this.frames.set(frameId, { id: frameId, circuitName, parentNode: parentNode.uid, nodes: frameNodes, outputs });
    parentNode.status = 'expanded'; parentNode.childFrame = frameId;
    this.trace?.push({ type: 'expand', epoch: this.epoch, node: parentNode.label, circuit: circuitName, before, after: this.nodes.size });
  }

  #frameOutput(frame) {
    const obj = {};
    for (const [name, spec] of frame.outputs) obj[name] = this.#resolveArg(spec);
    const values = Object.values(obj);
    return values.length === 1 ? values[0] : obj;
  }

  #reduceOne() {
    const frames = [...this.frames.values()].reverse();
    for (const frame of frames) {
      const nodes = [...frame.nodes].map(uid => this.nodes.get(uid)).filter(Boolean);
      if (!nodes.every(n => n.status === 'done')) continue;
      const parent = this.nodes.get(frame.parentNode);
      const before = this.nodes.size;
      const value = this.#frameOutput(frame);
      for (const uid of frame.nodes) this.nodes.delete(uid);
      this.frames.delete(frame.id);
      parent.status = 'done'; parent.value = value; parent.childFrame = null;
      if (parent.transactionId) {
        this.transactions?.commit(parent.transactionId);
        parent.transactionId = null;
      }
      this.trace?.push({ type: 'reduce', epoch: this.epoch, node: parent.label, circuit: frame.circuitName, before, after: this.nodes.size });
      return true;
    }
    return false;
  }

  #deleteFrameTree(frameId) {
    const frame = this.frames.get(frameId);
    if (!frame) return;
    for (const uid of [...frame.nodes]) {
      const n = this.nodes.get(uid);
      if (n?.childFrame) this.#deleteFrameTree(n.childFrame);
      this.nodes.delete(uid);
    }
    this.frames.delete(frameId);
  }

  #rewriteOnNoMatch(failingNode, error) {
    let frame = failingNode.frameId ? this.frames.get(failingNode.frameId) : null;
    while (frame) {
      const parent = this.nodes.get(frame.parentNode);
      if (parent?.candidates?.length) {
        const next = parent.candidateIndex + 1;
        if (next < parent.candidates.length) {
          const old = parent.candidates[parent.candidateIndex];
          const replacement = parent.candidates[next];
          if (parent.transactionId) {
            this.transactions?.rollback(parent.transactionId, `rewrite ${old} -> ${replacement}`);
            parent.transactionId = null;
          }
          this.#deleteFrameTree(frame.id);
          parent.status = 'pending';
          parent.childFrame = null;
          parent.candidateIndex = next;
          parent.transactionId = this.transactions?.begin(`candidate ${parent.label} :: ${replacement}`) ?? null;
          this.trace?.push({
            type: 'rewrite', epoch: this.epoch, node: parent.label,
            from: old, to: replacement, reason: error.message
          });
          return true;
        }
      }
      frame = parent?.frameId ? this.frames.get(parent.frameId) : null;
    }
    return false;
  }

  async #stepNode(node) {
    const args = this.#resolvedArgs(node);
    if (node.command === 'callCircuit') {
      const circuit = args.circuit;
      const inputs = { ...args }; delete inputs.circuit;
      this.#expand(node, circuit, inputs);
      return 'structural';
    }
    if (node.command === 'callCandidates') {
      if (!node.candidates) {
        const raw = args.candidates ?? [];
        node.candidates = raw.map(x => typeof x === 'string' ? x : x.circuit);
        node.candidateInputs = { ...args }; delete node.candidateInputs.candidates;
        node.candidateIndex = 0;
        node.transactionId = this.transactions?.begin(`candidate ${node.label} :: ${node.candidates[0] ?? 'none'}`) ?? null;
      }
      if (!node.candidates.length) {
        const error = new Error(`No candidates supplied at ${node.label}`);
        error.name = 'NoMatchError';
        throw error;
      }
      this.#expand(node, node.candidates[node.candidateIndex], node.candidateInputs);
      return 'structural';
    }
    if (node.command === 'callParallelCandidates') {
      const raw = args.candidates ?? [];
      const beam = Math.max(1, Number(args.beam ?? 8));
      const margin = Number(args.ambiguityMargin ?? 0);
      const candidates = raw.slice(0, beam).map((x, i) => typeof x === 'string' ? { circuit: x, score: Math.max(0, beam - i) } : x);
      if (!candidates.length) { const e = new Error(`No candidates supplied at ${node.label}`); e.name = 'NoMatchError'; throw e; }
      const inputs = { ...args }; delete inputs.candidates; delete inputs.beam; delete inputs.ambiguityMargin;
      const safe = candidates.filter(c => this.effectAnalyzer?.isSpeculativelySafe(c.circuit) ?? false);
      const unsafe = candidates.filter(c => !safe.includes(c));
      this.trace?.push({ type: 'parallel-start', epoch: this.epoch, node: node.label, candidates: candidates.map(c => c.circuit), safe: safe.length, sequentialFallback: unsafe.length });
      const runOne = async (c) => {
        const vm = new VirtualMachine({
          circuits: this.circuits, primitives: this.primitives, trace: this.trace,
          transactions: this.transactions, effectAnalyzer: this.effectAnalyzer, budget: this.budget
        });
        try {
          const value = await vm.run(c.circuit, inputs);
          this.trace?.push({ type: 'parallel-branch', epoch: this.epoch, node: node.label, circuit: c.circuit, score: Number(c.score ?? 0), status: 'success' });
          return { ...c, value, ok: true };
        } catch (error) {
          if (error?.name === 'NoMatchError') {
            this.trace?.push({ type: 'parallel-branch', epoch: this.epoch, node: node.label, circuit: c.circuit, score: Number(c.score ?? 0), status: 'nomatch' });
            return { ...c, error, ok: false };
          }
          throw error;
        }
      };
      const outcomes = await Promise.all(safe.map(runOne));
      for (const c of unsafe) {
        this.trace?.push({ type: 'parallel-branch', epoch: this.epoch, node: node.label, circuit: c.circuit, score: Number(c.score ?? 0), status: 'unsafe-skipped' });
        outcomes.push({ ...c, ok: false, unsafe: true });
      }
      const successes = outcomes.filter(x => x.ok).sort((a,b) => Number(b.score ?? 0) - Number(a.score ?? 0) || a.circuit.localeCompare(b.circuit));
      if (!successes.length) { const e = new Error(`No parallel candidate matched at ${node.label}`); e.name = 'NoMatchError'; throw e; }
      const canonical = (x) => {
        if (Array.isArray(x)) return x.map(canonical);
        if (x && typeof x === 'object') return Object.fromEntries(Object.keys(x).sort().map(k => [k, canonical(x[k])]));
        return x;
      };
      const stable = (x) => JSON.stringify(canonical(x));
      const unique = [];
      for (const x of successes) if (!unique.some(u => stable(u.value) === stable(x.value))) unique.push(x);
      const top = unique[0];
      const second = unique[1];
      if (second && Number(top.score ?? 0) - Number(second.score ?? 0) <= margin) {
        node.value = { kind: 'ambiguity', status: 'ambiguous', alternatives: unique.slice(0,4).map(x => ({ circuit: x.circuit, score: Number(x.score ?? 0), value: x.value })) };
      } else node.value = top.value;
      node.status = 'done';
      this.trace?.push({ type: 'parallel-merge', epoch: this.epoch, node: node.label, successes: successes.length, distinct: unique.length, selected: top.circuit, ambiguous: node.value?.kind === 'ambiguity' });
      return 'executed';
    }
    if (this.circuits.has(node.command)) {
      this.#expand(node, node.command, args);
      return 'structural';
    }
    const primitive = this.primitives.get(node.command);
    if (!primitive) throw new Error(`Unknown command/primitive ${node.command} at ${node.label}`);
    this.trace?.push({ type: 'execute', epoch: this.epoch, node: node.label, command: node.command });
    node.value = await primitive(args);
    node.status = 'done';
    return 'executed';
  }

  async run(circuitName, inputs = {}) {
    globalRun++;
    this.nodes.clear(); this.frames.clear(); this.frameNo = 0; this.epoch = 0;
    const root = {
      uid: `run${globalRun}/root`, label: `ROOT:${circuitName}`, command: circuitName,
      args: Object.fromEntries(Object.entries(inputs).map(([k,v]) => [k,{value:v}])),
      status: 'pending', value: undefined, childFrame: null, frameId: null, order: -1,
      candidates: null, candidateIndex: 0, candidateInputs: null, transactionId: null
    };
    this.nodes.set(root.uid, root);

    while (root.status !== 'done') {
      this.budget?.check(this.nodes.size);
      this.trace?.push({ type: 'epoch', epoch: this.epoch, message: `${this.nodes.size} active nodes; topo-sort / execute / expand / reduce / rewrite` });

      if (this.#reduceOne()) { this.epoch++; continue; }

      const order = this.#topologicalPending();
      let progress = false;
      let structural = false;
      for (const node of order) {
        this.budget?.check(this.nodes.size);
        if (!this.#ready(node)) continue;
        try {
          const result = await this.#stepNode(node);
          progress = true;
          if (result === 'structural') { structural = true; this.epoch++; break; }
        } catch (error) {
          if (error?.name === 'NoMatchError' && this.#rewriteOnNoMatch(node, error)) {
            progress = true; structural = true; this.epoch++; break;
          }
          throw error;
        }
      }
      if (root.status === 'done') break;
      if (structural || progress) continue;
      if (this.#reduceOne()) { this.epoch++; continue; }
      const blocked = [...this.nodes.values()].filter(n => n.status !== 'done').map(n => `${n.label}:${n.status}`);
      throw new Error(`Virtual circuit is stuck: ${blocked.join(', ')}`);
    }
    return root.value;
  }
}
