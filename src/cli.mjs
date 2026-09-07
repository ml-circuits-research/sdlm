#!/usr/bin/env node
import fs from 'node:fs/promises';
import readline from 'node:readline';
import { HISTORY_LIMIT } from './cli/state.mjs';
import { CommandLine } from './cli/commands.mjs';
import { EXAMPLES } from './cli/examples.mjs';
import { runExamples } from './cli/example-runner.mjs';

const usage = `sdlm command line
Usage: npm start -- [options] [input.sopnl]
  --help                  Show this help
  --examples              List capability examples
  --run <number|all>       Execute isolated examples and compare expected results
  --json                  Emit example reports as JSON, with --run
  --backend <name>        auto, bundled or external
  --extension <directory> Load a circuit pack; repeat to load more packs
  --session <name>        Resume a particular saved session
  --temporary             Start interactive temporary work without automatic continuation
  --sessions <directory>  Session storage; default ./sessions
  --trace                 Print runtime events
Interactive startup resumes the last session, or creates one automatically.
Enter /help or /session new [name] in the CLI.`;

async function main() {
  const args = process.argv.slice(2);
  const options = { extensions: [], learnedRoots: [] };
  let file, selection, session, sessions = 'sessions', json = false, temporary = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const value = () => {
      const next = args[++index];
      if (!next || next.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      return next;
    };
    if (arg === '--help' || arg === '-h') { console.log(usage); return; }
    if (arg === '--examples') { console.log(EXAMPLES.map(e => `${e.id}. ${e.name}`).join('\n')); return; }
    if (arg === '--backend') options.backend = value();
    else if (arg === '--extension') options.extensions.push(value());
    else if (arg === '--temporary') temporary = true;
    else if (arg === '--session') session = value();
    else if (arg === '--sessions') sessions = value();
    else if (arg === '--trace') options.trace = true;
    else if (arg === '--run') selection = value();
    else if (arg === '--json') json = true;
    else if (arg.startsWith('-')) throw new Error(`Unknown option ${arg}`);
    else if (file) throw new Error('Only one input file is accepted');
    else file = arg;
  }
  if (temporary && (session || selection)) throw new Error('--temporary cannot be combined with --session or --run');
  if (json && !selection) throw new Error('--json requires --run');
  if (selection) {
    if (file || session) throw new Error('--run uses isolated sessions and cannot take an input file or --session');
    if (json) {
      const reports = await runExamples(selection, options);
      console.log(JSON.stringify(reports, null, 2));
      if (!reports.every(report => report.pass)) process.exitCode = 1;
    } else {
      const cli = await new CommandLine({ options, sessions }).start();
      if (!await cli.handle(`/example ${selection}`)) process.exitCode = 1;
    }
    return;
  }
  const interactive = Boolean(process.stdin.isTTY && !file);
  let rl;
  const write = message => {
    if (interactive && rl) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
    console.log(message);
  };
  const cli = await new CommandLine({ options, sessions, write, remember: interactive })
    .start(session, { resume: interactive && !temporary });
  if (interactive) {
    const selection = cli.session ? `Session ${cli.session}. Changes are saved automatically.` :
      'Temporary session. Use /session save <name> to keep this work.';
    console.log(`sdlm | ${cli.runtime.engine}\n${selection}\nType /help, /examples or /session new [name].`);
  }
  const handle = async line => {
    try { if (!await cli.handle(line) && !interactive) process.exitCode = 1; }
    catch (error) {
      if (interactive) write(`ERROR: ${error.message}`);
      else { console.error(`ERROR: ${error.message}`); process.exitCode = 1; }
    }
  };
  if (file) {
    for (const line of (await fs.readFile(file, 'utf8')).split(/\r?\n/)) {
      await handle(line);
      if (cli.closed) break;
    }
  } else {
    rl = readline.createInterface({
      input: process.stdin, output: process.stdout, terminal: interactive, prompt: 'sdlm> ',
      historySize: HISTORY_LIMIT, history: [...cli.inputHistory].reverse()
    });
    try {
      if (interactive) rl.prompt();
      for await (const line of rl) {
        await handle(line);
        if (interactive) rl.history = [...cli.inputHistory].reverse();
        if (cli.closed) break;
        // Pasted lines may already have left the next, incomplete command in the editor.
        if (interactive && !rl.closed) rl.prompt(true);
      }
    } finally { rl.close(); }
  }
}

main().catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
