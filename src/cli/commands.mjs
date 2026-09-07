import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from '../sd_lm.mjs';
import { SessionStore } from '../sessions/session-store.mjs';
import { CliState, appendHistory } from './state.mjs';
import { EXAMPLES } from './examples.mjs';
import { runExamples } from './example-runner.mjs';
import { benchmarkDataset, runBenchmark, formatBenchmark } from '../evaluation/benchmark.mjs';

export const COMMANDS = [
  ['/help', 'Show commands and the controlled-language input rules.'],
  ['/examples [number|all]', 'List examples or show their instructions and expected results without executing.'],
  ['/example <number|all>', 'Execute examples in isolated temporary sessions and compare expected with actual results.'],
  ['/benchmarks [case-id]', 'Show the early-school evaluation questions and expected answers without executing.'],
  ['/benchmark [dev|eval|all]', 'Evaluate fresh isolated sessions and report accuracy, gaps and incorrect assertions. Default: eval.'],
  ['/capabilities', 'Show the supported capability families and their limits.'],
  ['/status', 'Show backend, session, circuit/fact/rule counts, limits and the last execution summary.'],
  ['/vars', 'Inspect reusable values saved in the current session.'],
  ['/verbosity [answer|explain]', 'Show only answers or restore explanations and assumptions. Saved per session; /assumptions always shows audit data.'],
  ['/mode [assist|strict]', 'Choose assumption-guided conversation or exact controlled-language execution.'],
  ['/assumptions', 'Show actual interpretation decisions and the knowledge that depends on them.'],
  ['/reject <id> [reason]', 'Reject an assumption, retract unsupported knowledge, and retain correction feedback.'],
  ['/feedback [new file.json]', 'Show or export assumptions, rejected decisions and unresolved inputs for circuit improvement.'],
  ['/run <circuit> <JSON inputs>', 'Execute a circuit; inputs may contain {\"$ref\":\"saved.path\"}. Save its result as last_task.'],
  ['/kb', 'Inspect committed facts and rules as JSON.'],
  ['/parse <sentence>', 'Inspect a semantic command without asserting its knowledge.'],
  ['/trace [on|off|last]', 'Control terminal tracing or inspect the retained execution events.'],
  ['/forget <fact or rule>', 'Retract an assertion and recompute dependent facts.'],
  ['/save <new directory>', 'Export asserted knowledge and rules as an installable SOP pack.'],
  ['/load <pack directory>', 'Validate and install a circuit pack in this session.'],
  ['/learn <examples.json>', 'Train surface/canonical pairs and publish validated circuits.'],
  ['/session new [name]', 'Start an independent durable session.'],
  ['/session use <name>', 'Resume a durable session, including its learned circuits.'],
  ['/session save <name>', 'Save or fork the selected session into a new durable session.'],
  ['/session list', 'List saved sessions.'],
  ['/history commands', 'Show submitted CLI input, including slash commands, for this session.'],
  ['/history', 'Show the retained conversation for the selected durable session.'],
  ['/reset', 'Start a new durable session interactively, or clean temporary state in batch use. Saved sessions remain available.'],
  ['/quit', 'Exit. Durable session changes have already been saved.']
];

export class CommandLine {
  constructor({ options = {}, sessions = 'sessions', write = console.log, remember = false } = {}) {
    this.options = options;
    this.store = new SessionStore({ root: sessions, runtimeOptions: options });
    this.write = write;
    this.remember = remember;
    this.local = new CliState(this.store.root);
    this.inputHistory = [];
    this.session = null;
    this.closed = false;
    this.mode = 'assist';
  }

  async start(id = null, { resume = false } = {}) {
    if (!id && resume) {
      id = await this.local.lastSession();
      if (id) {
        try { await this.store.read(id); }
        catch (error) {
          if (error.code !== 'ENOENT') throw error;
          this.write(`Previous session ${id} is missing. Selecting another saved session.`);
          id = null;
        }
      }
      id ??= (await this.store.list())[0]?.id;
      id ??= (await this.store.create()).id;
    }
    const runtime = id ? await this.store.runtime(id) : await createSDLM(this.options);
    const history = id ? await this.local.history(id,
      (await this.store.read(id)).messages.filter(message => message.role === 'user').map(message => message.content)) : [];
    if (this.remember && id) await this.local.rememberSession(id);
    this.runtime = runtime;
    this.session = id;
    this.inputHistory = history;
    return this;
  }

  async mutate(operation, input = null) {
    if (!this.session) return operation(this.runtime);
    let used;
    const result = await this.store.transact(this.session, async (runtime, record) => {
      used = runtime;
      const output = await operation(runtime);
      if (input) {
        record.messages.push({ role: 'user', content: input }, { role: 'assistant', content: String(output) });
        record.turns++;
      }
      return output;
    });
    this.runtime = used;
    return result;
  }

  async handle(line) {
    const text = line.trim();
    if (!text || text.startsWith('#')) return true;
    if (this.remember && text !== '/quit') {
      this.inputHistory = this.session ? await this.local.append(this.session, text, this.inputHistory) :
        appendHistory(this.inputHistory, text);
    }
    if (!text.startsWith('/')) {
      this.write(`> ${text}\n${await this.mutate(runtime =>
        this.mode === 'strict' ? runtime.process(text) : runtime.respond(text), text)}`);
      return true;
    }
    const space = text.indexOf(' ');
    const command = space < 0 ? text : text.slice(0, space);
    const argument = space < 0 ? '' : text.slice(space + 1).trim();
    const required = () => { if (!argument) throw new Error(`${command} requires an argument. See /help.`); return argument; };
    switch (command) {
      case '/help':
        this.write('Say hello, introduce yourself with "My name is Jhon.", or ask "What can you do?". Enter several English sentences on one line. /examples 21 shows a conversation; /example 21 runs it. /verbosity answer hides explanations; /verbosity explain restores them. Use /mode strict for exact parsing.');
        this.write(COMMANDS.map(([name, description]) => `${name}\n  ${description}`).join('\n'));
        break;
      case '/examples': {
        if (!argument) { this.write(EXAMPLES.map(e => `${e.id}. ${e.name}\n   ${e.limitation}`).join('\n')); break; }
        const examples = argument === 'all' ? EXAMPLES : EXAMPLES.filter(e => String(e.id) === argument);
        if (!examples.length) throw new Error(`Unknown example ${argument}. Use /examples to list available examples.`);
        for (const example of examples) {
          this.write(`${example.id}. ${example.name}\nMode: ${example.assist ? 'assist' : 'strict'}\nLimit: ${example.limitation}`);
          if (example.pack) this.write(`Pack: ${example.pack}`);
          if (example.training) this.write(`Training pairs: ${JSON.stringify(example.training, null, 2)}`);
          for (const step of example.steps) this.write(`> ${step.label ?? step.input ?? '/forget ' + step.forget}\nExpected: ${JSON.stringify(step.expected ?? { error: step.error })}`);
          this.write(`Run with /example ${example.id}. Nothing was executed.`);
        }
        break;
      }
      case '/example': {
        const reports = await runExamples(required(), this.options);
        for (const report of reports) {
          this.write(`\n${report.pass ? 'PASS' : 'FAIL'} ${report.id}. ${report.name} [${report.engine}, ${report.durationMs} ms]`);
          for (const step of report.results) {
            this.write(`> ${step.input ?? '/forget ' + step.forget}\nExpected: ${JSON.stringify(step.expected ?? { error: step.error })}\nActual: ${step.actual}\n${step.pass ? 'PASS' : 'FAIL'}`);
          }
          this.write(`Limit: ${report.limitation}`);
        }
        return reports.every(report => report.pass);
      }
      case '/benchmarks': {
        const dataset = await benchmarkDataset();
        const cases = argument ? dataset.cases.filter(item => item.id === argument) : dataset.cases;
        if (!cases.length) throw new Error('Unknown benchmark case. Use /benchmarks to list case IDs.');
        for (const item of cases) this.write(`${item.id} [${item.split}] ${item.question}` +
          (argument ? `\nContext: ${item.context.join(' ')}\nExpected: ${JSON.stringify(item.expected)}` : ''));
        break;
      }
      case '/benchmark': {
        const report = await runBenchmark({ split: argument || 'eval', options: this.options,
          onCase: (_row, index, total) => { if (index % 10 === 0) this.write(`Evaluated ${index}/${total}`); } });
        this.write(formatBenchmark(report));
        return report.summary.passed === report.summary.total;
      }
      case '/capabilities': this.write(EXAMPLES.map(e => `${e.name}: ${e.limitation}`).join('\n')); break;
      case '/status': this.write(JSON.stringify({ session: this.session ?? 'temporary', ...this.runtime.inspect() }, null, 2)); break;
      case '/vars': this.write(JSON.stringify(this.runtime.values(), null, 2)); break;
      case '/mode':
        if (argument && !['assist', 'strict'].includes(argument)) throw new Error('Use /mode assist or /mode strict');
        if (argument) this.mode = argument;
        this.write(`Input mode: ${this.mode}`);
        break;
      case '/verbosity':
        if (argument) await this.mutate(runtime => runtime.setResponseStyle(argument));
        this.write(`Response style: ${this.runtime.preferences().response_style}.`);
        break;
      case '/assumptions': this.write(JSON.stringify(this.runtime.assumptions(), null, 2)); break;
      case '/reject': {
        const [id, ...reason] = required().split(/\s+/);
        this.write(JSON.stringify(await this.mutate(runtime => runtime.rejectAssumption(id, reason.join(' '))), null, 2));
        break;
      }
      case '/feedback': {
        const report = this.runtime.assumptions();
        if (argument) {
          await fs.writeFile(argument, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
          this.write(`Saved feedback to ${argument}. Use it to create and validate a corrective SOP pack.`);
        } else this.write(JSON.stringify(report, null, 2));
        break;
      }
      case '/run': {
        const split = required().indexOf(' ');
        const name = split < 0 ? argument : argument.slice(0, split);
        const inputs = split < 0 ? {} : JSON.parse(argument.slice(split + 1));
        this.write(JSON.stringify(await this.mutate(runtime => runtime.runTask(name, inputs)), null, 2));
        break;
      }
      case '/kb': this.write(JSON.stringify(this.runtime.snapshot(), null, 2)); break;
      case '/parse': this.write(JSON.stringify(await this.runtime.parseCommand(required()), null, 2)); break;
      case '/trace':
        if (!argument || argument === 'last') this.write(this.runtime.trace.text() || 'No retained events.');
        else if (argument === 'on' || argument === 'off') {
          this.runtime.trace.enabled = argument === 'on';
          this.options.trace = argument === 'on';
          this.store.runtimeOptions.trace = this.options.trace;
          this.write(`Trace output ${argument}; retention is bounded.`);
        } else throw new Error('Use /trace on, /trace off or /trace last');
        break;
      case '/forget': this.write(JSON.stringify(await this.mutate(runtime => runtime.forget(required())))); break;
      case '/save': this.write(JSON.stringify(await this.runtime.saveCircuitPack(required()), null, 2)); break;
      case '/load': this.write(JSON.stringify(await this.mutate(runtime => runtime.installCircuitPack(required())), null, 2)); break;
      case '/learn': {
        const examples = JSON.parse(await fs.readFile(required(), 'utf8'));
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-training-'));
        try {
          const result = await this.mutate(runtime => runtime.learnParaphrase(examples, { learnedRoot: root }));
          this.write(`Learned ${result.productions.length} grammar production(s). ${this.session ? 'Saved in the durable session.' : 'Use /session save <name> to persist competence.'}`);
        } finally { await fs.rm(root, { recursive: true, force: true }); }
        break;
      }
      case '/session': {
        const [action, id, extra] = argument.split(/\s+/);
        if (extra) throw new Error('Session names cannot contain spaces');
        if (action === 'new') {
          const record = await this.store.create(id);
          await this.start(record.id);
          this.write(`Session ${record.id}. Changes are saved automatically.`);
        } else if (action === 'save' && id) {
          await this.store.create(id, this.runtime);
          await this.start(id);
          this.write(`Saved session ${id}, including its circuits.`);
        } else if (action === 'use' && id) {
          await this.start(id);
          this.write(`Resumed session ${id}.`);
        } else if (action === 'list' && !id) {
          this.write((await this.store.list()).map(record => `${record.id}  ${record.turns} turns  ${record.updated}`).join('\n') || 'No saved sessions.');
        } else throw new Error('Use /session new [name], /session use <name>, /session save <name>, or /session list');
        break;
      }
      case '/history':
        if (argument && argument !== 'commands') throw new Error('Use /history or /history commands');
        if (argument === 'commands') this.write(this.inputHistory.join('\n') || 'No submitted CLI input.');
        else this.write(this.session ? JSON.stringify((await this.store.read(this.session)).messages, null, 2) :
          'Temporary session. Use /session new <name> for retained history.');
        break;
      case '/reset':
        if (this.remember) {
          const record = await this.store.create();
          await this.start(record.id);
          this.write(`Session ${record.id}. Changes are saved automatically.`);
        } else { await this.start(); this.write('Started a clean temporary session.'); }
        break;
      case '/quit': this.closed = true; break;
      default: throw new Error(`Unknown command ${command}. Use /help.`);
    }
    return true;
  }
}
