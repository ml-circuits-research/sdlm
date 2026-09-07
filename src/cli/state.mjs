import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import lockfile from 'proper-lockfile';
import { sessionId } from '../sessions/session-store.mjs';
import { SerialQueue } from '../kernel/serial-queue.mjs';

export const HISTORY_LIMIT = 1000;
const LINE_LIMIT = 8192;
const historyLine = line => typeof line === 'string' && line.trim() &&
  line.length <= LINE_LIMIT && !line.trim().startsWith('#') && line.trim() !== '/quit';

export function appendHistory(lines, line) {
  if (!historyLine(line)) return [...lines];
  const text = line.trim();
  return (lines.at(-1) === text ? [...lines] : [...lines, text]).slice(-HISTORY_LIMIT);
}

// CLI transport metadata is independent of SOP state and API history matching.
export class CliState {
  constructor(root) {
    this.root = path.resolve(root);
    this.queue = new SerialQueue();
  }

  async #read(file) {
    try { return JSON.parse(await fs.readFile(file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }

  async lastSession() {
    const state = await this.#read(path.join(this.root, '.cli-state.json'));
    if (!state) return null;
    if (state.version !== 1) throw new Error('Invalid CLI state. Use --session <name> to select a session explicitly.');
    return sessionId(state.lastSession);
  }

  #update(file, operation) {
    return this.queue.enqueue(async () => {
      await fs.mkdir(path.dirname(file), { recursive: true });
      const release = await lockfile.lock(file, { realpath: false, stale: 60000, update: 10000,
        retries: { retries: 8, minTimeout: 50, maxTimeout: 250 } });
      const temporary = path.join(path.dirname(file), `.cli-${randomUUID()}.json`);
      try {
        const value = await operation();
        await fs.writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
        await fs.rename(temporary, file);
        return value;
      } finally {
        await fs.rm(temporary, { force: true }).catch(() => {});
        await release().catch(() => {});
      }
    });
  }

  rememberSession(id) {
    sessionId(id);
    return this.#update(path.join(this.root, '.cli-state.json'), () => ({ version: 1, lastSession: id }));
  }

  async history(id, fallback = []) {
    const file = path.join(this.root, sessionId(id), 'cli-history.json');
    const state = await this.#read(file);
    if (state && (state.version !== 1 || !Array.isArray(state.lines) || !state.lines.every(historyLine))) {
      throw new Error(`Invalid CLI history for session ${id}`);
    }
    return (state?.lines ?? fallback).reduce(appendHistory, []);
  }

  async append(id, line, fallback = []) {
    const file = path.join(this.root, sessionId(id), 'cli-history.json');
    const state = await this.#update(file, async () => ({ version: 1,
      lines: appendHistory(await this.history(id, fallback), line) }));
    return state.lines;
  }
}
