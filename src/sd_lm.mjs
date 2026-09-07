import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCircuits } from './kernel/sop-loader.mjs';
import { validateCircuits } from './kernel/circuit-validation.mjs';
import { learnedCircuitRoots, publishPack } from './kernel/pack-storage.mjs';
import { VirtualMachine } from './kernel/virtual-machine.mjs';
import { Trace } from './kernel/trace.mjs';
import { ExecutionBudget } from './kernel/execution-budget.mjs';
import { valuesSource, valueName, resolveInputs, resolveValue } from './sessions/values.mjs';
import { SerialQueue } from './kernel/serial-queue.mjs';
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
import { saveKnowledgePack, knowledgeSource } from './datalog/knowledge-pack.mjs';
import { InterpretationEvidence } from './interpretation/evidence.mjs';
import { createResponder } from './interpretation/respond.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultCircuits = path.resolve(here, '..', 'circuits');
const defaultLearned = path.resolve(here, '..', 'learned');

export async function createSDLM({
  circuitRoots = [defaultCircuits], extensions = [], learnedRoots = [defaultLearned],
  trace = false, maxTraceEvents = 10000, backend, limits = {}, sessionRoot = null, previousAudit = null,
  foundation = true
} = {}) {
  const configuration = new ExecutionBudget(limits).limits;
  const roots = [...circuitRoots, ...extensions.map(root => path.resolve(root, 'circuits'))];
  for (const root of learnedRoots) roots.push(...await learnedCircuitRoots(root));
  if (sessionRoot) roots.push(path.resolve(sessionRoot, 'circuits'));
  const tracer = trace instanceof Trace ? trace : new Trace(Boolean(trace), { maxEvents: maxTraceEvents });
  const engine = await loadDatalog({ trace: tracer, backend });
  let budget = null;
  const datalog = {
    ...engine,
    evaluate(db, rules) {
      budget?.check();
      const result = engine.evaluate(db, rules);
      budget?.check();
      return result;
    }
  };
  const circuits = await loadCircuits(roots);
  const language = new LanguageStore();
  const kb = new KnowledgeBase({ datalog, trace: tracer });
  const evidence = new InterpretationEvidence(kb);
  let values = {};
  let settings = {};
  const grammar = new GrammarStore();
  const chartParser = new ChartParser({ grammar, datalog, trace: tracer });
  const transactions = new TransactionManager({ trace: tracer, participants: [
    { snapshot: () => structuredClone(values), restore: state => { values = state; } },
    { snapshot: () => structuredClone(settings), restore: state => { settings = state; } },
    { snapshot: () => evidence.snapshot(), restore: state => evidence.restore(state) },
    { snapshot: () => kb.exportState(), restore: state => kb.importState(state) },
    { snapshot: () => language.snapshot(), restore: state => language.restore(state) },
    { snapshot: () => grammar.snapshot(), restore: state => grammar.restore(state) }
  ] });
  const context = { circuits, datalog, language, kb, evidence, grammar, chartParser, transactions, foundation, trace: tracer, lastAudit: null };
  context.settings = {
    read: name => structuredClone(settings[name]),
    write(name, value) {
      valueName(name);
      if (!Object.hasOwn(settings, name) && Object.keys(settings).length >= 64) throw new Error('Session setting limit exceeded');
      valuesSource({ [name]: value });
      settings[name] = structuredClone(value);
      return structuredClone(value);
    }
  };
  const primitives = createPrimitives(context);
  validateCircuits(circuits, primitives);
  const selector = new CandidateSelector({ circuits, primitives, datalog, trace: tracer });
  const effectAnalyzer = new EffectAnalyzer({ circuits, primitives });
  Object.assign(context, { selector, effectAnalyzer });
  const run = (name, inputs = {}) => new VirtualMachine({
    circuits, primitives, trace: tracer, transactions, effectAnalyzer, budget
  }).run(name, inputs);
  context.run = run;
  context.checkBudget = () => budget?.check();
  context.checkText = text => {
    if (typeof text !== 'string') throw new Error('Input must be a string');
    if (text.length > configuration.maxInputLength) throw new Error('Input length limit exceeded');
  };
  context.checkTokens = tokens => {
    if (tokens.length > configuration.maxTokens) throw new Error('Input token limit exceeded');
    return tokens;
  };

  let committed = kb.snapshot();
  const atomic = async (label, operation, { registry = false } = {}) => {
    budget = new ExecutionBudget(configuration);
    tracer.startAudit();
    const previousCircuits = registry ? new Map(circuits) : null;
    const id = transactions.begin(label);
    try {
      const result = await operation();
      transactions.commitScope(id);
      committed = kb.snapshot();
      const audit = tracer.finishAudit();
      if (!label.startsWith('save-') && label !== 'bind-value') context.lastAudit = audit;
      return result;
    } catch (error) {
      // Restoration must remain possible after exhausting the request budget.
      budget = null;
      transactions.rollbackScope(id, error.message);
      if (previousCircuits) {
        circuits.clear();
        for (const [name, def] of previousCircuits) circuits.set(name, def);
        selector.refresh();
        effectAnalyzer.refresh();
      }
      tracer.finishAudit();
      throw error;
    } finally { budget = null; }
  };

  const bootstrap = async definitions => {
    const names = [...definitions.values()]
      .filter(def => def.group === 'bootstrap' || def.group.endsWith('.bootstrap'))
      .filter(def => foundation || def.group !== 'foundation.bootstrap')
      .map(def => def.name).sort((a, b) => a.localeCompare(b));
    for (const name of names) await run(name);
    return names;
  };
  await atomic('bootstrap', () => bootstrap(circuits));
  if (sessionRoot) {
    if (circuits.get('SessionSnapshot')?.group !== 'session.snapshot') throw new Error('Session snapshot is missing');
    await atomic('restore-session', async () => {
      kb.importState({ baseFacts: [], rules: [] });
      await run('SessionSnapshot');
    });
    if (circuits.has('SessionValues')) values = await atomic('restore-values', () => run('SessionValues'));
    if (circuits.has('SessionInterpretation')) {
      evidence.restore(await atomic('restore-interpretation', () => run('SessionInterpretation')));
    }
    if (circuits.has('SessionSettings')) settings = await atomic('restore-settings', () => run('SessionSettings'));
    circuits.delete('SessionSettings');
    circuits.delete('SessionInterpretation');
    circuits.delete('SessionValues');
    circuits.delete('SessionSnapshot');
    selector.refresh();
    effectAnalyzer.refresh();
  }
  context.lastAudit = structuredClone(previousAudit);
  const queue = new SerialQueue();
  const perform = (label, operation, options) => queue.enqueue(() => atomic(label, operation, options));
  const parse = text => { context.checkText(text); return run('ParseText', { text }); };
  const respond = createResponder(context);
  let inductionSequence = Math.max(0, ...[...circuits.keys()].map(name =>
    Number(name.match(/^InducedSemantic(\d+)(?:_\d+)?$/)?.[1] ?? 0)
  ));

  return {
    respond(text, options = {}) {
      return perform('respond', async () => (await respond([text], options)).map(result => result.text).filter(Boolean).join('\n'));
    },
    respondDetailed(texts, options = {}) { return perform('respond-detailed', () => respond(texts, options)); },
    preferences() { return structuredClone(settings); },
    setResponseStyle(style) { return perform('set-response-style', () => run('SetResponseStyle', { style })); },
    assumptions() { return evidence.snapshot(); },
    rejectAssumption(id, note = '') {
      return perform('reject-assumption', () => ({ ...evidence.reject(id, note),
        invalidated_values: evidence.invalidateValues(values, id) }));
    },
    process(text) {
      return perform('process', () => { context.checkText(text); return run('ProcessText', { text }); });
    },
    processBatch(texts) {
      return perform('process-batch', async () => {
        if (!Array.isArray(texts) || !texts.length || texts.length > 128) throw new Error('Expected 1 to 128 input lines');
        const results = [];
        for (const text of texts) {
          context.checkText(text);
          results.push(await run('ProcessText', { text }));
        }
        return results;
      });
    },
    processDetailed(texts) {
      return perform('process-detailed', async () => {
        if (!Array.isArray(texts) || !texts.length || texts.length > 128) throw new Error('Expected 1 to 128 input lines');
        const results = [];
        for (const text of texts) {
          context.checkText(text);
          results.push(await run('ProcessTextResult', { text }));
        }
        return results;
      });
    },
    bind(name, value) {
      return perform('bind-value', () => {
        valueName(name);
        valuesSource({ [name]: value });
        values[name] = structuredClone(value);
        evidence.bind(name, value);
        while (Object.keys(values).length > 200) delete values[Object.keys(values)[0]];
        evidence.pruneValues(values);
        return { name, value: structuredClone(value) };
      });
    },
    values() { return structuredClone(values); },
    resolve(reference) { return resolveValue(evidence.usableValues(values), reference); },
    runTask(name, inputs = {}, saveAs = 'last_task') {
      return perform('run-task', async () => {
        valueName(saveAs);
        const resolved = resolveInputs(evidence.usableValues(values), inputs);
        evidence.active = evidence.references(inputs);
        let result;
        try { result = await run(name, resolved); }
        finally { evidence.active = []; }
        valuesSource({ [saveAs]: result });
        values[saveAs] = structuredClone(result);
        evidence.bind(saveAs, result, inputs);
        while (Object.keys(values).length > 200) delete values[Object.keys(values)[0]];
        evidence.pruneValues(values);
        return { name: saveAs, value: result };
      });
    },
    parseCommand(text) { return perform('parse-command', () => parse(text)); },
    learnParaphrase(examples, { learnedRoot = defaultLearned } = {}) {
      return perform('learn', () => induceParaphrase({
        examples, language, circuits, selector, effectAnalyzer, run, learnedRoot,
        parseCanonical: parse, sequence: ++inductionSequence
      }), { registry: true });
    },
    run(name, inputs = {}) { return perform('run', () => run(name, inputs)); },
    installCircuitPack(packRoot) {
      return perform('install-pack', async () => {
        const incoming = await loadCircuits([path.resolve(packRoot, 'circuits')]);
        if (!incoming.size) throw new Error('Circuit pack contains no SOP circuits');
        for (const name of incoming.keys()) {
          if (circuits.has(name)) throw new Error(`Circuit pack duplicates existing circuit: ${name}`);
        }
        const combined = new Map([...circuits, ...incoming]);
        validateCircuits(combined, primitives);
        for (const [name, def] of incoming) circuits.set(name, def);
        selector.refresh();
        effectAnalyzer.refresh();
        const bootstraps = await bootstrap(incoming);
        const result = { root: path.resolve(packRoot), circuits: [...incoming.keys()], bootstraps };
        tracer.push({ type: 'circuit-pack-installed', ...result });
        return result;
      }, { registry: true });
    },
    saveCircuitPack(root) {
      return perform('save-pack', () => {
        const tentative = evidence.state.sources.some(source => evidence.sourceIds(source.kind, source.value).length);
        if (tentative) throw new Error('Knowledge has assumption dependencies. Save a full session to preserve them.');
        return saveKnowledgePack(root, kb.exportState());
      });
    },
    saveSessionPack(root) {
      return perform('save-session', () => {
        const entries = [...circuits.values()].filter(def => !circuitRoots.some(base => {
          const relative = path.relative(path.resolve(base), path.resolve(def.file));
          return !relative.startsWith('..') && !path.isAbsolute(relative);
        })).map(def => ({ name: def.name, group: def.group, source: def.source }));
        if (entries.some(entry => ['SessionSnapshot', 'SessionValues', 'SessionInterpretation', 'SessionSettings'].includes(entry.name))) throw new Error('SessionSnapshot is a reserved name');
        entries.push({ name: 'SessionSettings', group: 'session.settings', source: valuesSource(settings) });
        entries.push({ name: 'SessionInterpretation', group: 'session.interpretation', source: valuesSource(evidence.snapshot()) });
        entries.push({ name: 'SessionValues', group: 'session.values', source: valuesSource(values) });
        entries.push({ name: 'SessionSnapshot', group: 'session.snapshot', source: knowledgeSource(kb.exportState()) });
        return publishPack(root, entries);
      });
    },
    forget(text) {
      return perform('forget', async () => {
        const command = await parse(text);
        const result = kb.forget(command);
        evidence.forget(command);
        return result;
      });
    },
    snapshot() { return structuredClone(committed); },
    inspect() {
      return {
        engine: datalog.engineName, foundation, preferences: structuredClone(settings), circuits: circuits.size, grammarRules: grammar.rules.length,
        facts: committed.unary.length + committed.binary.length, rules: committed.rules.length,
        traceEvents: tracer.events.length, droppedTraceEvents: tracer.droppedEvents,
        limits: { ...configuration }, lastAudit: structuredClone(context.lastAudit)
      };
    },
    trace: tracer, engine: datalog.engineName,
    circuits, grammar, selector, transactions, language, effectAnalyzer
  };
}
