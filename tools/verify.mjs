import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { walk, sourceFingerprint } from './docs-build.mjs';

function run(args, env = {}, { quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; if (!quiet) process.stdout.write(chunk); });
    child.stderr.on('data', chunk => { output += chunk; if (!quiet) process.stderr.write(chunk); });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) { if (quiet) process.stderr.write(output); reject(new Error(`${args.join(' ')} exited ${code}`)); }
      else resolve(output);
    });
  });
}

const mode = process.argv[2] ?? 'all';
if (mode === 'all' || mode === 'syntax') {
  for (const file of [...await walk('src'), ...await walk('test'), ...await walk('tools'), 'docs/partials-loader.js']) {
    if (/\.(mjs|js)$/.test(file)) await run(['--check', file], {}, { quiet: true });
  }
  console.log('JavaScript syntax checks passed.');
}
if (['all', 'backends', 'record'].includes(mode)) {
  const backends = [];
  for (const backend of ['bundled', 'external']) {
    console.log(`Running complete ${backend} suite...`);
    const output = await run(['--test', '--test-concurrency=2', '--test-reporter=tap'], { SD_LM_DATALOG_BACKEND: backend }, { quiet: true });
    const tests = Number(output.match(/^# pass (\d+)$/m)?.[1]);
    if (!tests || !/^# fail 0$/m.test(output)) throw new Error(`Missing successful test summary for ${backend}`);
    console.log(`${backend}: ${tests} tests passed.`);
    let examples = null, evaluation = null;
    if (mode !== 'backends') {
      console.log(`Running ${backend} example catalog...`);
      const reports = JSON.parse(await run(['src/cli.mjs', '--run', 'all', '--backend', backend, '--json'], {}, { quiet: true }));
      if (!reports.every(report => report.pass)) throw new Error(`Example failure with ${backend}`);
      examples = reports.length;
      console.log(`${backend}: ${examples} examples passed.`);
    }
    if (mode !== 'backends') {
      console.log(`Running ${backend} elementary evaluation split...`);
      const report = JSON.parse(await run(['tools/benchmark.mjs', '--split', 'eval', '--backend', backend, '--json'], {}, { quiet: true }));
      if (report.summary.passed !== report.summary.total) throw new Error(`Evaluation failure with ${backend}`);
      evaluation = `${report.summary.passed}/${report.summary.total}`;
      console.log(`${backend}: ${evaluation} evaluation cases passed.`);
    }
    backends.push({ backend, tests, examples, evaluation });
  }
  if (mode === 'record' || process.argv.includes('--record')) {
    const report = { checkedAt: new Date().toISOString(), node: process.version, sourceHash: await sourceFingerprint(), backends };
    await fs.writeFile('docs/assets/validation.json', JSON.stringify(report, null, 2) + '\n');
    console.log('Saved actual validation results in docs/assets/validation.json. Rebuild the documentation.');
  }
}
if (mode === 'all') {
  if (process.argv.includes('--record')) await run(['tools/docs-build.mjs']);
  await run(['tools/docs-check.mjs']);
}
if (!['all', 'backends', 'record', 'syntax'].includes(mode)) throw new Error(`Unknown verification mode ${mode}`);
