import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { extendHistory, EMPTY_HISTORY } from './history.mjs';
import lockfile from 'proper-lockfile';
import { createSDLM } from '../sd_lm.mjs';
import { SerialQueue } from '../kernel/serial-queue.mjs';

export function sessionId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
    throw new Error('Session ID must contain 1 to 64 letters, digits, underscores or hyphens');
  }
  return value;
}

export class SessionStore {
  constructor({ root = 'sessions', runtimeOptions = {} } = {}) {
    this.root = path.resolve(root);
    this.runtimeOptions = { ...runtimeOptions, learnedRoots: [] };
    this.queue = new SerialQueue();
  }

  async list() {
    await fs.mkdir(this.root, { recursive: true });
    const result = [];
    for (const entry of await fs.readdir(this.root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[A-Za-z0-9_-]{1,64}$/.test(entry.name)) continue;
      try { result.push(await this.read(entry.name)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    return result.sort((a, b) => b.updated.localeCompare(a.updated));
  }

  async read(id) {
    const record = JSON.parse(await fs.readFile(path.join(this.root, sessionId(id), 'session.json'), 'utf8'));
    if (record.version !== 1 || record.id !== id || !/^revision-[a-f0-9-]+$/.test(record.revision)) {
      throw new Error('Invalid session record');
    }
    record.historyCount ??= record.messages.length;
    record.historyHash ??= extendHistory(EMPTY_HISTORY, record.messages);
    return record;
  }

  #locked(id, operation) {
    return this.queue.enqueue(async () => {
      const directory = path.join(this.root, sessionId(id));
      const release = await lockfile.lock(directory, {
        realpath: false, stale: 60000, update: 10000,
        retries: { retries: 8, minTimeout: 50, maxTimeout: 250 }
      });
      try { return await operation(directory); }
      finally { await release().catch(() => {}); }
    });
  }

  runtime(id) {
    return this.#locked(id, async () => {
      const record = await this.read(id);
      const runtime = await createSDLM({ ...this.runtimeOptions, extensions: [],
        sessionRoot: path.join(this.root, id, record.revision), previousAudit: record.audit ?? null });
      runtime.trace.events = runtime.trace.maxEvents ? (record.trace ?? []).slice(-runtime.trace.maxEvents) : [];
      return runtime;
    });
  }

  create(id = randomUUID(), initialRuntime = null) {
    return this.queue.enqueue(async () => {
      const directory = path.join(this.root, sessionId(id));
      await fs.mkdir(this.root, { recursive: true });
      await fs.mkdir(directory);
      try {
        const runtime = initialRuntime ?? await createSDLM(this.runtimeOptions);
        const now = new Date().toISOString();
        const record = { version: 1, id, created: now, updated: now, messages: [], turns: 0, historyCount: 0, historyHash: EMPTY_HISTORY,
          audit: runtime.inspect().lastAudit, trace: runtime.trace.events.slice(-500) };
        record.valueSequence = Math.max(0, ...Object.keys(runtime.values()).map(name => {
          const value = Number(name.match(/^turn_(\d+)$/)?.[1] ?? 0);
          return Number.isSafeInteger(value) ? value : 0;
        }));
        await this.#commit(directory, runtime, record);
        return record;
      } catch (error) {
        await fs.rm(directory, { recursive: true, force: true });
        throw error;
      }
    });
  }

  transact(id, operation) {
    return this.#locked(id, async directory => {
      const record = await this.read(id);
      const runtime = await createSDLM({
        ...this.runtimeOptions, extensions: [], sessionRoot: path.join(directory, record.revision), previousAudit: record.audit ?? null
      });
      const retained = record.messages.length;
      const result = await operation(runtime, record);
      const appended = record.messages.slice(retained);
      record.historyHash = extendHistory(record.historyHash, appended);
      record.historyCount += appended.length;
      record.audit = runtime.inspect().lastAudit;
      record.trace = runtime.trace.events.slice(-500);
      record.updated = new Date().toISOString();
      record.messages = record.messages.slice(-200);
      await this.#commit(directory, runtime, record);
      return result;
    });
  }

  async #commit(directory, runtime, record) {
    const revision = `revision-${randomUUID()}`;
    const target = path.join(directory, revision);
    const temp = path.join(directory, `.session-${randomUUID()}.json`);
    let published = false;
    try {
      await runtime.saveSessionPack(target);
      const next = { ...record, revision };
      await fs.writeFile(temp, JSON.stringify(next, null, 2) + '\n', { flag: 'wx' });
      await fs.rename(temp, path.join(directory, 'session.json'));
      published = true;
      Object.assign(record, next);
    } finally {
      if (!published) await fs.rm(target, { recursive: true, force: true });
      await fs.rm(temp, { force: true }).catch(() => {});
    }
    // Retain the immediately previous revision for inspection and remove older snapshots.
    await this.#prune(directory, revision).catch(() => {});
  }

  async #prune(directory, revision) {
    const old = (await fs.readdir(directory, { withFileTypes: true }))
      .filter(entry => entry.isDirectory() && entry.name.startsWith('revision-') && entry.name !== revision);
    const dated = await Promise.all(old.map(async entry => ({ name: entry.name,
      time: (await fs.stat(path.join(directory, entry.name))).mtimeMs })));
    dated.sort((a, b) => b.time - a.time);
    for (const entry of dated.slice(1)) {
      await fs.rm(path.join(directory, entry.name), { recursive: true, force: true }).catch(() => {});
    }
  }
}
