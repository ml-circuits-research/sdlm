import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
export async function evaluationFingerprint() {
  const hash = createHash('sha256');
  const walk = async relative => {
    const entries = await fs.readdir(new URL(relative + '/', root), { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const name = relative + '/' + entry.name;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) hash.update(name).update(await fs.readFile(new URL(name, root)));
    }
  };
  for (const directory of ['src', 'circuits']) await walk(directory);
  hash.update('package-lock.json').update(await fs.readFile(fileURLToPath(new URL('package-lock.json', root))));
  return hash.digest('hex');
}
