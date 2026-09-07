import fs from 'node:fs/promises';
import path from 'node:path';

export async function learnedCircuitRoots(root) {
  const roots = [];
  try { await fs.access(path.join(root, 'circuits')); roots.push(path.join(root, 'circuits')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  try {
    const entries = await fs.readdir(path.join(root, 'packs'), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        roots.push(path.join(root, 'packs', entry.name, 'circuits'));
      }
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return roots;
}

export async function publishPack(root, entries) {
  root = path.resolve(root);
  const parent = path.dirname(root);
  await fs.mkdir(parent, { recursive: true });
  const lockPath = path.join(parent, `.${path.basename(root)}.lock`);
  const lock = await fs.open(lockPath, 'wx');
  let staging, published = false;
  try {
    try {
      await fs.lstat(root);
      throw new Error(`Circuit pack destination already exists: ${root}`);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    staging = await fs.mkdtemp(path.join(parent, '.sop-stage-'));
    for (const entry of entries) {
      const relative = path.join('circuits', ...entry.group.split('.'), `${entry.name}.sop`);
      const file = path.join(staging, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, entry.source, { flag: 'wx' });
    }
    await fs.rename(staging, root);
    staging = null;
    published = true;
    return entries.map(entry => path.join(root, 'circuits', ...entry.group.split('.'), `${entry.name}.sop`));
  } finally {
    const cleanup = async () => {
      if (staging) await fs.rm(staging, { recursive: true, force: true });
      await lock.close();
      await fs.unlink(lockPath);
    };
    // Cleanup failure after rename cannot turn a published pack into an uncommitted operation.
    if (published) await cleanup().catch(() => {});
    else await cleanup();
  }
}
