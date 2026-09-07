import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { NAV, TERMS } from './docs-data.mjs';

const build = spawnSync(process.execPath, ['tools/docs-build.mjs', '--check'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status ?? 1);
const files = (await fs.readdir('docs')).filter(name => name.endsWith('.html'));
const texts = new Map(await Promise.all(files.map(async name => [name, await fs.readFile(`docs/${name}`, 'utf8')])));
const anchors = new Map([...texts].map(([name, text]) => [name, new Set([...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))]));
let count = 0;
for (const [file, text] of [...texts, ['header.html', await fs.readFile('docs/partials/header.html', 'utf8')]]) {
  const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `Duplicate anchors in ${file}`);
  for (const [, encoded] of text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').matchAll(/(?:href|src|data-include)="([^"]+)"/g)) {
    const href = encoded.replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|data:)/.test(href)) continue;
    const url = new URL(href, `http://local/${file}`);
    const target = decodeURIComponent(url.pathname).slice(1);
    await fs.access(path.join('docs', target));
    if (url.searchParams.has('spec')) {
      const spec = url.searchParams.get('spec');
      assert.match(spec, /^(matrix|DS\d{3}-[a-z0-9-]+)\.md$/);
      await fs.access(path.join('docs/specs', spec));
    }
    if (url.hash && anchors.has(target)) assert(anchors.get(target).has(decodeURIComponent(url.hash.slice(1))), `${file}: missing ${href}`);
    count++;
  }
  if (file !== 'header.html') {
    assert(text.includes('partials/header.html') && text.includes('partials/footer.html'), `Missing shared navigation in ${file}`);
    assert(!/<h\d[^>]*>[^<]*<a[^>]+definition-/i.test(text), `Definition link in heading ${file}`);
  }
}
const header = await fs.readFile('docs/partials/header.html', 'utf8');
assert.deepEqual([...header.matchAll(/<button[^>]*>([^<]+)<\/button>/g)].map(m => m[1]), NAV.map(([name]) => name));
const map = texts.get('index.html').match(/<table class="doc-map">([\s\S]*?)<\/table>/)?.[1];
assert(map, 'Missing documentation map');
assert.deepEqual([...map.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map(m => m[1]), NAV.map(([name]) => name));
const rows = [...map.matchAll(/<tbody>([\s\S]*)<\/tbody>/g)][0][1];
const columns = NAV.map(() => []);
for (const [, row] of rows.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
  [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].forEach(([, cell], i) => {
    if (!cell) return;
    const links = [...cell.matchAll(/<a href="([^"]+)">([^<]+)<\/a>/g)];
    assert.equal(links.length, 1);
    assert.match(cell, /<p>[^<]+<\/p>/);
    columns[i].push([links[0][2], links[0][1]]);
  });
}
assert.deepEqual(columns, NAV.map(([, links]) => links.map(([label, href]) => [label, href])));
for (const [id] of TERMS) assert(anchors.get('wiki.html').has(`definition-${id}`));
for (const name of await fs.readdir('docs/specs')) {
  if (!name.startsWith('DS')) continue;
  const text = await fs.readFile(`docs/specs/${name}`, 'utf8');
  for (const [, anchor] of text.matchAll(/\.\.\/wiki.html#(definition-[a-z0-9-]+)/g)) assert(anchors.get('wiki.html').has(anchor));
  assert(!/^#+ (Conclusion|Status|Owner|Definitions)$/m.test(text), `Invalid section in ${name}`);
}
console.log(`Verified ${files.length} HTML pages, ${count} local links/assets, navigation map and ${TERMS.length} glossary anchors.`);

const dom = spawnSync(process.execPath, ['tools/docs-dom-check.mjs'], { stdio: 'inherit' });
if (dom.status !== 0) process.exit(dom.status ?? 1);
