import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadCircuits } from './kernel/sop-loader.mjs';
import { VirtualMachine } from './kernel/virtual-machine.mjs';
import { Trace } from './kernel/trace.mjs';
import { loadDatalog } from './datalog/api.mjs';
import { CandidateSelector } from './datalog/candidate-selector.mjs';
import { KnowledgeBase } from './datalog/knowledge-base.mjs';
import { LanguageStore } from './primitives/language-store.mjs';
import { createPrimitives } from './primitives/core-primitives.mjs';
import { GrammarStore } from './parsing/grammar-store.mjs';
import { ChartParser } from './parsing/chart-parser.mjs';
import { TransactionManager } from './kernel/transaction-manager.mjs';
import { induceParaphrase } from './learning/circuit-inducer.mjs';
import { EffectAnalyzer } from './kernel/effect-analyzer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultCircuits = path.resolve(here, '..', 'circuits');
const defaultLearned = path.resolve(here, '..', 'learned');

function audit(events) {
  const circuits = events.filter(e => e.type === 'expand').map(e => e.circuit);
  return {
    kind: 'introspection', status: 'true',
    epochs: events.filter(e => e.type === 'epoch').length,
    expansions: events.filter(e => e.type === 'expand').length,
    reductions: events.filter(e => e.type === 'reduce').length,
    rewrites: events.filter(e => e.type === 'rewrite').length,
    selections: events.filter(e => e.type === 'select').length,
    circuits: [...new Set(circuits)],
    candidateSelections: events.filter(e => e.type === 'select').map(e => ({ group: e.group, candidates: e.candidates }))
  };
}

export async function createSLLM({ circuitRoots = [defaultCircuits], extensions = [], learnedRoots = [defaultLearned], trace = false } = {}) {
  const roots = [...circuitRoots, ...extensions.map(x => path.resolve(x, 'circuits'))];
  for (const lr of learnedRoots) {
    const candidate = path.resolve(lr, 'circuits');
    try { await fs.access(candidate); roots.push(candidate); } catch {}
  }
  const tracer = trace instanceof Trace ? trace : new Trace(Boolean(trace));
  const datalog = await loadDatalog({ trace: tracer });
  const circuits = await loadCircuits(roots);
  const language = new LanguageStore();
  const kb = new KnowledgeBase({ datalog, trace: tracer });
  const grammar = new GrammarStore();
  const chartParser = new ChartParser({ grammar, datalog, trace: tracer });
  const transactions = new TransactionManager({ trace: tracer, participants: [
    { snapshot: () => kb.exportState(), restore: state => kb.importState(state) },
    { snapshot: () => language.snapshot(), restore: state => language.restore(state) },
    { snapshot: () => grammar.snapshot(), restore: state => grammar.restore(state) }
  ] });
  const context = { circuits, datalog, language, selector: null, kb, grammar, chartParser, transactions, trace: tracer, lastAudit: null };
  const primitives = createPrimitives(context);
  const selector = new CandidateSelector({ circuits, primitives, datalog, trace: tracer });
  context.selector = selector;
  const effectAnalyzer = new EffectAnalyzer({ circuits, primitives });
  context.effectAnalyzer = effectAnalyzer;

  const run = async (circuitName, inputs = {}) => {
    const vm = new VirtualMachine({ circuits, primitives, trace: tracer, transactions, effectAnalyzer });
    return vm.run(circuitName, inputs);
  };
  context.run = run;

  const installCircuitPack = async (packRoot) => {
    const circuitRoot = path.resolve(packRoot, 'circuits');
    const incoming = await loadCircuits([circuitRoot]);
    const names = [...incoming.keys()];
    const duplicates = names.filter(name => circuits.has(name));
    if (duplicates.length) throw new Error(`Circuit pack duplicates existing circuits: ${duplicates.join(', ')}`);

    const transactionId = transactions.begin(`install circuit pack ${path.basename(path.resolve(packRoot))}`);
    try {
      for (const [name, def] of incoming) circuits.set(name, def);
      selector.refresh();
      effectAnalyzer.refresh();

      const packBootstraps = [...incoming.values()]
        .filter(c => c.group === 'bootstrap' || c.group.endsWith('.bootstrap'))
        .map(c => c.name)
        .sort((a,b) => a.localeCompare(b));
      for (const bootstrap of packBootstraps) await run(bootstrap, {});

      transactions.commit(transactionId);
      tracer.push({ type: 'circuit-pack-installed', root: path.resolve(packRoot), circuits: names.length, bootstraps: packBootstraps });
      return { root: path.resolve(packRoot), circuits: names, bootstraps: packBootstraps };
    } catch (error) {
      transactions.rollback(transactionId, `circuit pack install failed: ${error.message}`);
      for (const name of names) circuits.delete(name);
      selector.refresh();
      effectAnalyzer.refresh();
      throw error;
    }
  };

  const bootstraps = [...circuits.values()]
    .filter(c => c.group === 'bootstrap' || c.group.endsWith('.bootstrap'))
    .map(c => c.name)
    .sort((a,b) => a.localeCompare(b));
  for (const bootstrap of bootstraps) await run(bootstrap, {});

  const processAtomic = async (text) => {
    const outer = transactions.begin('process');
    const start = tracer.events.length;
    try {
      const result = await run('ProcessText', { text });
      transactions.commit(outer);
      const events = tracer.events.slice(start);
      context.lastAudit = audit(events);
      return result;
    } catch (error) {
      transactions.rollbackAll(error.message);
      throw error;
    }
  };

  const parseCommandAtomic = async (text) => {
    const outer = transactions.begin('parse-command');
    try {
      const command = await run('ParseText', { text });
      transactions.commit(outer);
      return command;
    } catch (error) {
      transactions.rollbackAll(error.message);
      throw error;
    }
  };

  let inductionSequence = Math.max(0, ...[...circuits.keys()].map(name => Number(name.match(/^InducedSemantic(\d+)$/)?.[1] ?? 0)));

  return {
    async process(text) { return processAtomic(text); },
    async parseCommand(text) { return parseCommandAtomic(text); },
    async learnParaphrase(examples, { learnedRoot = defaultLearned } = {}) {
      return induceParaphrase({
        examples, language, circuits, selector, run, learnedRoot,
        parseCanonical: parseCommandAtomic, sequence: ++inductionSequence
      });
    },
    async run(circuitName, inputs = {}) { return run(circuitName, inputs); },
    async installCircuitPack(packRoot) { return installCircuitPack(packRoot); },
    snapshot() { return kb.snapshot(); },
    trace: tracer,
    engine: datalog.engineName,
    circuits, grammar, selector, transactions, language, effectAnalyzer
  };
}
