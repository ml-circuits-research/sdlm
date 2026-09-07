export class Trace {
  constructor(enabled = false, { maxEvents = 10000 } = {}) {
    if (!Number.isSafeInteger(maxEvents) || maxEvents < 0) throw new Error('Invalid trace retention limit');
    this.enabled = enabled;
    this.maxEvents = maxEvents;
    this.droppedEvents = 0;
    this.events = [];
    this.audit = null;
  }
  push(event) {
    if (this.maxEvents > 0) {
      if (this.events.length >= this.maxEvents) {
        const count = Math.max(1, Math.ceil(this.maxEvents / 4));
        this.events.splice(0, count);
        this.droppedEvents += count;
      }
      this.events.push(event);
    } else this.droppedEvents++;
    if (this.audit) {
      const counters = { epoch: 'epochs', expand: 'expansions', reduce: 'reductions', rewrite: 'rewrites', select: 'selections' };
      if (counters[event.type]) this.audit[counters[event.type]]++;
      if (event.type === 'expand') this.audit.circuits.add(event.circuit);
      if (event.type === 'select' && this.audit.candidateSelections.length < 64) {
        this.audit.candidateSelections.push({ group: event.group, candidates: event.candidates });
      }
    }
    if (this.enabled) console.error(this.format(event));
  }
  startAudit() {
    this.audit = {
      kind: 'introspection', status: 'true', epochs: 0, expansions: 0, reductions: 0,
      rewrites: 0, selections: 0, circuits: new Set(), candidateSelections: []
    };
  }
  finishAudit() {
    const result = this.audit && { ...this.audit, circuits: [...this.audit.circuits] };
    this.audit = null;
    return result;
  }
  format(e) {
    if (e.type === 'epoch') return `[epoch ${e.epoch}] ${e.message}`;
    if (e.type === 'expand') return `[expand] ${e.node} :: ${e.circuit} (${e.before} -> ${e.after} active nodes)`;
    if (e.type === 'reduce') return `[reduce] ${e.node} <= ${e.circuit} (${e.before} -> ${e.after} active nodes)`;
    if (e.type === 'execute') return `[exec] ${e.node} :: ${e.command}`;
    if (e.type === 'select') return `[datalog-select] ${e.group}: ${e.candidates.map(x => `${x.circuit}:${x.score}`).join(', ') || '<none>'}`;
    if (e.type === 'activation-prune') return `[activation-index] ${e.group}: ${e.totalRules} stored guard rules -> ${e.evaluatedRules} sent to Datalog`;
    if (e.type === 'rewrite') return `[rewrite] ${e.node}: ${e.from} -> ${e.to} (${e.reason})`;
    if (e.type === 'chart-forest') return `[chart-forest] ${e.root}: ${e.parses} parses, ${e.spanCount} spans; top ${e.productions.join(', ')}`;
    if (e.type === 'hypothesis-frontier') return `[hypothesis-frontier] ${e.group}: ${e.beam.map(x => `${x.production}/${x.circuit}:${x.score}`).join(', ')}`;
    if (e.type === 'hypothesis-merge') return `[hypothesis-merge] ${e.group}: ${e.successes} successes, ${e.distinct} distinct; selected ${e.selected}; margin ${e.margin}`;
    if (e.type === 'parallel-start') return `[parallel-start] ${e.node}: ${e.candidates.length} candidates; safe ${e.safe}; skipped ${e.sequentialFallback}`;
    if (e.type === 'parallel-branch') return `[parallel-branch] ${e.circuit}:${e.score} ${e.status}`;
    if (e.type === 'parallel-merge') return `[parallel-merge] ${e.node}: ${e.successes} successes, ${e.distinct} distinct; selected ${e.selected}; ambiguous=${e.ambiguous}`;
    if (e.type === 'datalog') return `[datalog] ${e.message}`;
    return JSON.stringify(e);
  }
  text() { return this.events.map(e => this.format(e)).join('\n'); }
}
