import { primitiveMetadata } from '../kernel/primitive-registry.mjs';
import { buildRequestObservations } from './activation-observations.mjs';

export class CandidateSelector {
  constructor({ circuits, primitives, datalog, trace }) {
    this.circuits = circuits;
    this.primitives = primitives;
    this.datalog = datalog;
    this.trace = trace;
    this.requestNo = 0;
    this.activationIndexByGroup = new Map();
    this.rulesByGroup = this.#compile();
  }

  refresh() {
    this.activationIndexByGroup = new Map();
    this.rulesByGroup = this.#compile();
  }

  #compile() {
    const { rule, lit, variable: v, constant: c } = this.datalog;
    const rulesByGroup = new Map();
    const metaByGroup = new Map();

    for (const def of this.circuits.values()) {
      const request = v('request');
      let score = 0;
      let constrained = false;
      const requiredKeys = [];
      const tests = [];

      for (const node of def.nodes) {
        const activation = primitiveMetadata(this.primitives, node.command)?.activation;
        if (!activation) continue;
        const compiled = activation({ node, circuit: def });
        if (!compiled) continue;

        score += Number(compiled.weight ?? 0);
        const keys = compiled.requiredKeys ?? [];
        if (keys.length) {
          requiredKeys.push(...keys);
          constrained = true;
        }
        if (typeof compiled.test === 'function') {
          tests.push(compiled.test);
          constrained = true;
        }
        score += Number(compiled.score ?? ((keys.length || compiled.test) ? 1 : 0));
      }

      const uniqueKeys = [...new Set(requiredKeys)];
      const body = [lit('request', request), ...uniqueKeys.map(key => lit('observation', request, c(key)))];
      const compiledRule = rule('candidate', [request, c(def.group), c(def.name), c(score)], body);

      if (!rulesByGroup.has(def.group)) rulesByGroup.set(def.group, []);
      if (!metaByGroup.has(def.group)) metaByGroup.set(def.group, []);
      rulesByGroup.get(def.group).push(compiledRule);
      metaByGroup.get(def.group).push({ circuit: def.name, rule: compiledRule, requiredKeys: uniqueKeys, tests });
    }

    for (const [group, metas] of metaByGroup) {
      const frequency = new Map();
      for (const meta of metas) for (const key of meta.requiredKeys) frequency.set(key, (frequency.get(key) ?? 0) + 1);

      const byPrimaryKey = new Map();
      const wildcard = [];
      for (const meta of metas) {
        const primaryKey = [...meta.requiredKeys].sort((a, b) =>
          (frequency.get(a) ?? Infinity) - (frequency.get(b) ?? Infinity) || a.localeCompare(b)
        )[0];
        if (!primaryKey) wildcard.push(meta);
        else {
          if (!byPrimaryKey.has(primaryKey)) byPrimaryKey.set(primaryKey, []);
          byPrimaryKey.get(primaryKey).push(meta);
        }
      }
      this.activationIndexByGroup.set(group, { metas, byPrimaryKey, wildcard });
    }

    return rulesByGroup;
  }

  #prefilter(group, request, observations) {
    const index = this.activationIndexByGroup.get(group);
    if (!index) return { metas: [], indexedPool: 0 };

    const pool = new Map(index.wildcard.map(meta => [meta.circuit, meta]));
    for (const key of observations) {
      for (const meta of index.byPrimaryKey.get(key) ?? []) pool.set(meta.circuit, meta);
    }

    const metas = [...pool.values()].filter(meta =>
      meta.requiredKeys.every(key => observations.has(key)) && meta.tests.every(test => test(request))
    );
    return { metas, indexedPool: pool.size };
  }

  #databaseFor(observations) {
    const { Database } = this.datalog;
    const db = new Database();
    const id = `r${++this.requestNo}`;
    db.add('request', [id]);
    for (const key of observations) db.add('observation', [id, key]);
    return { db, id };
  }

  selectAll(group, request) {
    const observations = buildRequestObservations(request);
    const totalRules = (this.rulesByGroup.get(group) ?? []).length;
    const { metas, indexedPool } = this.#prefilter(group, request, observations);
    const rules = metas.map(meta => meta.rule);
    this.trace?.push({ type: 'activation-prune', group, totalRules, indexedPool, evaluatedRules: rules.length });

    const { evaluate } = this.datalog;
    const { db, id } = this.#databaseFor(observations);
    evaluate(db, rules);
    const candidates = db.facts('candidate')
      .filter(([requestId, candidateGroup]) => requestId === id && candidateGroup === group)
      .map(([, , circuit, score]) => ({ circuit, score: Number(score) }))
      .sort((a, b) => b.score - a.score || a.circuit.localeCompare(b.circuit));

    this.trace?.push({ type: 'select', group, candidates: candidates.slice(0, 64), totalCandidates: candidates.length });
    return candidates;
  }

  async select(group, request) {
    const candidates = this.selectAll(group, request);
    if (!candidates.length) {
      const error = new Error(`No candidate circuit in group ${group}`);
      error.name = 'NoMatchError';
      throw error;
    }
    return candidates[0];
  }
}
