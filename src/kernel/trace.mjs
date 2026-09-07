export class Trace {
  constructor(enabled = false) {
    this.enabled = enabled;
    this.events = [];
  }
  push(event) {
    this.events.push(event);
    if (this.enabled) console.error(this.format(event));
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
