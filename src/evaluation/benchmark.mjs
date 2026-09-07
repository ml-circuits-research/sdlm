import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { evaluationFingerprint } from './source-fingerprint.mjs';
import { createSDLM } from '../sd_lm.mjs';

const datasetURL = new URL('../../benchmarks/early-school/v1.json', import.meta.url);
export async function benchmarkDataset() { return JSON.parse(await fs.readFile(datasetURL, 'utf8')); }

export function scoreAnswer(answer, expected) {
  if (!answer) return false;
  if (expected.kind === 'boolean') return answer.kind === 'boolean' && answer.status === expected.status;
  if (expected.kind === 'number') return ['number', 'value'].includes(answer.kind) && answer.value === expected.value;
  if (expected.kind === 'bindings') {
    if (!['bindings', 'value'].includes(answer.kind)) return false;
    const values = answer.kind === 'value' ? [answer.value] : answer.values;
    return Array.isArray(values) && JSON.stringify([...values].sort()) === JSON.stringify([...expected.values].sort());
  }
  throw new Error(`Unknown scoring contract: ${expected.kind}`);
}

export async function runBenchmark({ split = 'eval', options = {}, onCase = () => {} } = {}) {
  if (!['dev', 'eval', 'all'].includes(split)) throw new Error('Use dev, eval or all for the benchmark split');
  const dataset = await benchmarkDataset();
  const cases = dataset.cases.filter(item => split === 'all' || item.split === split);
  const results = [];
  let actualBackend = null;
  for (const item of cases) {
    const started = performance.now();
    const runtime = await createSDLM({ ...options, extensions: [], learnedRoots: [] });
    actualBackend = runtime.engine;
    let result = null, error = null;
    try { result = (await runtime.respondDetailed([...item.context, item.question])).at(-1); }
    catch (failure) { error = failure.message; }
    const pass = scoreAnswer(result?.answer, item.expected);
    const answered = Boolean(result?.answer && result.status !== 'unresolved');
    const assertedWrong = !pass && answered && !['unknown', 'ambiguous'].includes(result.answer.status);
    const row = { ...item, pass, answered, assertedWrong, actual: result?.answer ?? null,
      assumptions: result?.assumptions ?? [], text: result?.text ?? null, error,
      durationMs: Math.round(performance.now() - started) };
    results.push(row);
    await onCase(row, results.length, cases.length);
  }
  const summarize = rows => ({ total: rows.length, passed: rows.filter(row => row.pass).length,
    answered: rows.filter(row => row.answered).length, assertedWrong: rows.filter(row => row.assertedWrong).length,
    withAssumptions: rows.filter(row => row.assumptions.length).length,
    accuracy: rows.filter(row => row.pass).length / rows.length });
  return { name: dataset.name, version: dataset.version, split, language: dataset.language,
    checkedAt: new Date().toISOString(), datasetHash: createHash('sha256').update(JSON.stringify(dataset)).digest('hex'),
    sourceHash: await evaluationFingerprint(), model: 'sdlm', engine: actualBackend,
    backend: options.backend ?? 'auto', foundation: options.foundation ?? true,
    summary: summarize(results), domains: Object.fromEntries([...new Set(cases.map(item => item.domain))]
      .map(domain => [domain, summarize(results.filter(row => row.domain === domain))])), results };
}

export function formatBenchmark(report) {
  const { summary } = report;
  return `${report.name} v${report.version} (${report.split}): ${summary.passed}/${summary.total} correct; ` +
    `${summary.assertedWrong} incorrect assertions; ${summary.answered}/${summary.total} understood; ${summary.withAssumptions} with assumptions.\n` +
    Object.entries(report.domains).map(([name, result]) => `${name}: ${result.passed}/${result.total}`).join('\n') +
    '\n' + report.results.filter(row => !row.pass).map(row =>
      `FAIL ${row.id}: ${row.question}\nExpected: ${JSON.stringify(row.expected)}\nActual: ${row.error ?? row.text}`).join('\n');
}
