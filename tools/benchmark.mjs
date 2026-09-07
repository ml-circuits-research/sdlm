import fs from 'node:fs/promises';
import { runBenchmark, formatBenchmark } from '../src/evaluation/benchmark.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('sdlm benchmark: --split dev|eval|all --backend bundled|external --output report.json --json --no-foundation');
  process.exit(0);
}
let split = 'eval', backend = 'bundled', output = null, json = false, foundation = true;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--split') split = args[++i];
  else if (args[i] === '--backend') backend = args[++i];
  else if (args[i] === '--output') output = args[++i];
  else if (args[i] === '--json') json = true;
  else if (args[i] === '--no-foundation') foundation = false;
  else throw new Error(`Unknown benchmark option: ${args[i]}`);
}
const report = await runBenchmark({ split, options: { backend, foundation }, onCase: (_row, index, total) => {
  if (!json && index % 10 === 0) console.error(`Evaluated ${index}/${total}`);
} });
if (output) await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(json ? JSON.stringify(report, null, 2) : formatBenchmark(report));
if (report.summary.passed !== report.summary.total) process.exitCode = 1;
