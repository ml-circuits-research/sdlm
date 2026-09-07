import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const roots = ['kernel', 'datalog', 'primitives'].map(x => path.join(src, x));
async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else if (p.endsWith('.mjs')) out.push(p);
  }
  return out;
}

test('JavaScript kernel contains no CNL vocabulary/domain predicates', async () => {
  const files = [...(await Promise.all(roots.map(walk))).flat(), path.join(src, 'sd_lm.mjs')];
  const text = (await Promise.all(files.map(f => fs.readFile(f, 'utf8')))).join('\n').toLowerCase();
  for (const forbidden of ['every human', 'mortal', 'ancestor', 'parent of', 'who is', 'likes bob', 'philosopher', 'admires', 'english.', 'englishlanguage']) {
    assert.equal(text.includes(forbidden), false, `kernel leaks language/domain phrase: ${forbidden}`);
  }
});
