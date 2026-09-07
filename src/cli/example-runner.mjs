import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSDLM } from '../sd_lm.mjs';
import { EXAMPLES } from './examples.mjs';

export function matches(actual, expected) {
  if (typeof expected === 'string') return actual === expected;
  if (expected?.startsWith != null) return actual.startsWith(expected.startsWith);
  if (expected?.includes != null) return actual.toLowerCase().includes(expected.includes.toLowerCase());
  return false;
}

export async function runExample(example, options = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sdlm-example-'));
  const started = performance.now();
  try {
    let runtime = await createSDLM({ ...options, extensions: [], learnedRoots: [], foundation: example.foundation ?? false });
    if (example.pack) await runtime.installCircuitPack(example.pack);
    if (example.training) await runtime.learnParaphrase(example.training, { learnedRoot: root });
    const results = [];
    for (const step of example.steps) {
      try {
        let actual;
        if (step.restart) {
          const snapshot = path.join(root, 'saved-session');
          await runtime.saveSessionPack(snapshot);
          runtime = await createSDLM({ ...options, extensions: [], learnedRoots: [], foundation: example.foundation ?? false, sessionRoot: snapshot });
          actual = 'Session restored from SOP.';
        } else if (step.run) {
          actual = JSON.stringify(await runtime.runTask(step.run.circuit, step.run.inputs, step.run.saveAs));
        } else if (step.reject) actual = JSON.stringify(await runtime.rejectAssumption(step.reject));
        else actual = step.forget ? JSON.stringify(await runtime.forget(step.forget)) :
          await (example.assist ? runtime.respond(step.input) : runtime.process(step.input));
        results.push({ ...step, input: step.label ?? step.input, actual, pass: !step.error && matches(actual, step.expected) });
      } catch (error) {
        results.push({ ...step, input: step.label ?? step.input, actual: error.message, pass: Boolean(step.error) &&
          (step.error === true || error.message.includes(step.error)) });
      }
    }
    if (example.expectedFacts != null) {
      results.push({ input: 'Inspect committed fact count', expected: String(example.expectedFacts),
        actual: String(runtime.inspect().facts), pass: runtime.inspect().facts === example.expectedFacts });
    }
    return { id: example.id, name: example.name, limitation: example.limitation, engine: runtime.engine,
      pass: results.every(result => result.pass), durationMs: Math.round(performance.now() - started), results };
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}

export async function runExamples(selection = 'all', options = {}) {
  const examples = selection === 'all' ? EXAMPLES : EXAMPLES.filter(example => String(example.id) === String(selection));
  if (!examples.length) throw new Error(`Unknown example ${selection}. Use /examples to list available examples.`);
  const reports = [];
  for (const example of examples) reports.push(await runExample(example, options));
  return reports;
}
