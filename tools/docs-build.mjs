import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import { COMMANDS } from '../src/cli/commands.mjs';
import { EXAMPLES } from '../src/cli/examples.mjs';
import { DEFAULT_LIMITS } from '../src/kernel/execution-budget.mjs';
import { NAV, TERMS } from './docs-data.mjs';

const check = process.argv.includes('--check');
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const slug = text => text.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapeRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const aliases = TERMS.flatMap(([id, names]) => names.map(name => ({ id, name }))).sort((a, b) => b.name.length - a.name.length);
const termsByName = new Map(aliases.map(({ id, name }) => [name.toLowerCase(), id]));
const termPattern = new RegExp(`(?<![A-Za-z0-9_-])(${aliases.map(({ name }) => escapeRegex(name)).join('|')})(?![A-Za-z0-9_-])`, 'gi');

export async function walk(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else if (entry.isFile()) files.push(file);
  }
  return files;
}

export async function sourceFingerprint() {
  const files = [...await walk('src'), ...await walk('test'), ...await walk('circuits'), ...await walk('extensions'), 'benchmarks/early-school/v1.json'];
  const digest = createHash('sha256');
  for (const file of files.sort()) digest.update(file).update(await fs.readFile(file));
  return digest.digest('hex');
}

function linkMarkdown(source, prefix) {
  let fence = false, frontmatter = source.startsWith('---\n');
  return source.split('\n').map((line, i) => {
    if (frontmatter) { if (i > 0 && line === '---') frontmatter = false; return line; }
    if (/^```/.test(line)) { fence = !fence; return line; }
    if (fence || /^#{1,6}\s/.test(line) || /^\s*</.test(line)) return line;
    return line.split(/(\[[^\]]*\]\([^)]*\)|`[^`]*`|<[^>]*>)/g).map((part, index) => index % 2 ? part :
      part.replace(termPattern, name => `[${name}](${prefix}wiki.html#definition-${termsByName.get(name.toLowerCase())})`)).join('');
  }).join('\n');
}

function linkHTML(html) {
  const stack = [];
  const protectedTags = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'pre', 'code', 'script', 'style', 'nav', 'button']);
  return html.split(/(<[^>]*>)/g).map(part => {
    if (part.startsWith('<')) {
      const tag = part.match(/^<\/?([a-z0-9]+)/i)?.[1]?.toLowerCase();
      if (protectedTags.has(tag) || (tag === 'table' && (part.includes('class="doc-map"') || stack.at(-1) === 'table'))) {
        if (part.startsWith('</')) stack.pop();
        else if (!part.endsWith('/>')) stack.push(tag);
      }
      return part;
    }
    return stack.length ? part : part.replace(termPattern, name => `<a class="definition-link" href="wiki.html#definition-${termsByName.get(name.toLowerCase())}">${name}</a>`);
  }).join('');
}

function render(source) {
  const ids = new Map();
  const renderer = new marked.Renderer();
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const base = slug(text), number = ids.get(base) ?? 0;
    ids.set(base, number + 1);
    return `<h${depth} id="${base}${number ? '-' + number : ''}">${text}</h${depth}>\n`;
  };
  renderer.image = ({ href, text }) => `<img src="${escape(href)}" alt="${escape(text)}" loading="lazy">`;
  let html = marked.parse(source, { renderer });
  html = html.replace(/<p>(<img [^>]*alt="([^"]*)"[^>]*>)<\/p>/g, '<figure>$1<figcaption>$2</figcaption></figure>');
  return linkHTML(html);
}

function page(title, content) {
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${escape(title)} | sdlm</title>\n<link rel="stylesheet" href="styles.css">\n<script type="module">\nimport mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';\nmermaid.initialize({ startOnLoad: true, theme: 'neutral' });\n</script>\n</head>\n<body>\n<div data-include="partials/header.html"></div>\n<main class="page"><article class="page__panel">\n${content}\n</article></main>\n<div data-include="partials/footer.html"></div>\n<script src="partials-loader.js"></script>\n</body>\n</html>\n`;
}

async function generate() {
  if (process.argv.includes('--link-sources')) {
    for (const [files, prefix] of [
      [(await walk('docs/specs')).filter(file => /DS\d{3}-/.test(file)), '../'],
      [['README.md', 'AGENTS.md'], 'docs/']
    ]) for (const file of files) await fs.writeFile(file, linkMarkdown(await fs.readFile(file, 'utf8'), prefix));
  }
  const generated = new Map();
  const sopFiles = [...await walk('circuits'), ...await walk('extensions')].filter(file => file.endsWith('.sop'));
  const sourceFiles = (await walk('src')).filter(file => file.endsWith('.mjs'));
  const inventory = {
    version: JSON.parse(await fs.readFile('package.json')).version,
    circuits: sopFiles.length, microCircuits: sopFiles.filter(file => file.includes('/english/microSentence/')).length,
    sopLines: (await Promise.all(sopFiles.map(async file => (await fs.readFile(file, 'utf8')).trimEnd().split('\n').length))).reduce((a, b) => a + b, 0),
    runtimeModules: sourceFiles.length,
    runtimeLines: (await Promise.all(sourceFiles.map(async file => (await fs.readFile(file, 'utf8')).trimEnd().split('\n').length))).reduce((a, b) => a + b, 0),
    sourceHash: await sourceFingerprint()
  };
  const inventoryTable = `| Source inventory, version ${inventory.version} | Count |\n| --- | --- |\n| Base and extension SOP files | ${inventory.circuits} |\n| Generated micro-circuits | ${inventory.microCircuits} |\n| SOP source lines | ${inventory.sopLines} |\n| Runtime modules | ${inventory.runtimeModules} |\n| Runtime JavaScript lines | ${inventory.runtimeLines} |`;
  const commandTable = '| Command | Purpose |\n| --- | --- |\n' + COMMANDS.map(([name, description]) => `| \`${name.replaceAll('|', '&#124;')}\` | ${description} |`).join('\n');
  const exampleTable = '| Number | Capability | Boundary |\n| --- | --- | --- |\n' + EXAMPLES.map(example => `| \`/example ${example.id}\` | ${example.name} | ${example.limitation} |`).join('\n');
  const limitsTable = '| Runtime option | Default |\n| --- | --- |\n' + Object.entries(DEFAULT_LIMITS).map(([name, value]) => `| \`${name}\` | ${value} |`).join('\n');
  const map = `<table class="doc-map"><thead><tr>${NAV.map(([name]) => `<th scope="col">${name}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: Math.max(...NAV.map(([, links]) => links.length)) }, (_, i) => `<tr>${NAV.map(([, links]) => links[i] ? `<td><a href="${links[i][1]}">${links[i][0]}</a><p>${links[i][2]}</p></td>` : '<td></td>').join('')}</tr>`).join('\n')}</tbody></table>`;
  let validation = 'No recorded validation report is included. Run `npm run verify:record` to record fresh results, then rebuild the documentation.';
  try {
    const report = JSON.parse(await fs.readFile('docs/assets/validation.json', 'utf8'));
    validation = `Recorded with Node.js ${report.node} on ${report.checkedAt}. ${report.sourceHash === inventory.sourceHash ? 'The runtime source fingerprint matches this build.' : 'The recorded source fingerprint differs; repeat verification before relying on these results.'}\n\n| Backend | Tests passed | Examples passed | Evaluation passed |\n| --- | --- | --- | --- |\n` + report.backends.map(result => `| ${result.backend} | ${result.tests} | ${result.examples} | ${result.evaluation ?? "unrecorded"} |`).join('\n');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let benchmark = '';
  const baseline = JSON.parse(await fs.readFile('benchmarks/early-school/reports/baseline.json', 'utf8'));
  const reports = [];
  for (const name of ['current-bundled', 'current-external']) {
    try {
      const report = JSON.parse(await fs.readFile(`benchmarks/early-school/reports/${name}.json`, 'utf8'));
      reports.push([name, report]);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  benchmark = '| Measurement | Correct | Understood | Incorrect assertions | Cases with assumptions |\n| --- | --- | --- | --- | --- |\n' +
    `| Before elementary circuits | ${baseline.summary.passed}/${baseline.summary.total} | ${baseline.summary.answered}/${baseline.summary.total} | ${baseline.summary.assertedWrong} | ${baseline.summary.withAssumptions} |\n` +
    reports.flatMap(([, report]) => ['dev', 'eval'].map(split => {
      const rows = report.results.filter(row => row.split === split);
      return `| ${report.backend}, ${split} | ${rows.filter(row => row.pass).length}/${rows.length} | ${rows.filter(row => row.answered).length}/${rows.length} | ${rows.filter(row => row.assertedWrong).length} | ${rows.filter(row => row.assumptions.length).length} |`;
    })).join('\n');
  benchmark += '\n\n[Baseline report](assets/benchmarks/baseline.json). ' + reports.map(([name, report]) =>
    `[${report.backend} report](assets/benchmarks/${name}.json), measured ${report.checkedAt}.`).join(' ');
  const bundled = reports.find(([, report]) => report.backend === 'bundled')?.[1];
  if (bundled) benchmark += '\n\n| Domain | Before elementary circuits | Bundled, all cases |\n| --- | --- | --- |\n' +
    Object.entries(bundled.domains).map(([name, value]) =>
      `| ${name} | ${baseline.domains[name].passed}/${baseline.domains[name].total} | ${value.passed}/${value.total} |`).join('\n');
  generated.set('docs/assets/benchmarks/v1.json', await fs.readFile('benchmarks/early-school/v1.json', 'utf8'));
  for (const name of ['baseline', ...reports.map(([name]) => name)]) generated.set(`docs/assets/benchmarks/${name}.json`,
    await fs.readFile(`benchmarks/early-school/reports/${name}.json`, 'utf8'));
  const replace = source => source.replaceAll('{{DOC_MAP}}', map).replaceAll('{{COMMANDS}}', commandTable)
    .replaceAll('{{EXAMPLES}}', exampleTable).replaceAll('{{INVENTORY}}', inventoryTable)
    .replaceAll('{{LIMITS}}', limitsTable).replaceAll('{{VALIDATION}}', validation).replaceAll('{{BENCHMARK}}', benchmark);
  const sources = new Map();
  for (const file of await walk('docs/content')) {
    if (!file.endsWith('.md')) continue;
    const name = path.basename(file, '.md'), source = replace(await fs.readFile(file, 'utf8'));
    sources.set(name, source);
    generated.set(`docs/${name}.html`, page(source.match(/^# (.+)/)?.[1] ?? name, render(source)));
  }
  const wiki = '<h1 id="wiki">Wiki</h1>\n<p>These entries define project terms used throughout the guides, book and specifications.</p>\n' + TERMS.map(([id, names, body]) => `<section class="definition" id="definition-${id}"><h2>${escape(names[0])}</h2>${render(body)}</section>`).join('\n');
  generated.set('docs/wiki.html', page('Wiki', wiki));
  let book = await fs.readFile('docs/initial_specs/sd_lm_book.md', 'utf8');
  book = replace(book.replace(/^---\n[\s\S]*?\n---\n/, '').replaceAll('(assets/', '(assets/book/'));
  book = '# Semantic circuits as a symbolic language model\n\n' + book.replace(/^(#{1,5}) /gm, '$1# ');
  for (const [i, name] of ['cli', 'api', 'sessions', 'learning', 'validation', 'assumptions', 'foundation', 'benchmark', 'response-style', 'conversation'].entries()) {
    book += '\n\n' + sources.get(name).replace(/^# (.+)/, `# ${28 + i}. $1`).replace(/^(#{1,5}) /gm, '$1# ');
  }
  let bookHTML = render(book);
  const chapters = [...bookHTML.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const toc = `<details class="book-toc"><summary>Chapter index · ${chapters.length} sections</summary><ul>${chapters.map(([, id, title]) => `<li><a href="#${id}">${title}</a></li>`).join('')}</ul></details>`;
  bookHTML = bookHTML.replace('</h1>', '</h1>\n' + toc);
  generated.set('docs/book.html', page('The book', bookHTML));
  const specs = (await walk('docs/specs')).filter(file => /\/DS\d{3}-[^/]+\.md$/.test(file)).sort();
  const rows = [];
  for (const [i, file] of specs.entries()) {
    const stem = path.basename(file, '.md'), source = await fs.readFile(file, 'utf8');
    const match = source.match(/^---\ntitle: ([^\n]+)\nsummary: ([^\n]+)\n---\n/);
    if (!match || match[1] !== stem || !stem.startsWith(`DS${String(i).padStart(3, '0')}-`)) throw new Error(`Invalid DS metadata or sequence: ${file}`);
    if (JSON.stringify([...source.matchAll(/^## (.+)$/gm)].map(m => m[1])) !== JSON.stringify(['Introduction', 'Core Content'])) throw new Error(`Invalid DS sections: ${file}`);
    rows.push(`| [${stem}](specsLoader.html?spec=${stem}.md) | ${match[2]} |`);
  }
  if (!specs.includes('docs/specs/DS003-main-behavior.md')) throw new Error('DS003 is missing');
  generated.set('docs/specs/matrix.md', '# Specification matrix\n\nThese contracts define the runtime and its circuit product. Imported development instructions are outside this specification set.\n\n| Name | Description |\n| --- | --- |\n' + rows.join('\n') + '\n');
  generated.set('docs/partials/header.html', `<header class="site-header"><span class="brand">sdlm</span><nav class="primary-nav" aria-label="Primary navigation">${NAV.map(([name, links], i) => `<div class="menu"><button type="button" aria-expanded="false" aria-controls="menu-${i}">${name}</button><div class="menu-panel" id="menu-${i}" hidden>${links.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</div></div>`).join('')}</nav></header>\n`);
  generated.set('docs/partials/footer.html', '<footer class="site-footer">sdlm · Executable circuits, explicit knowledge, continuing sessions.</footer>\n');
  generated.set('docs/assets/inventory.json', JSON.stringify(inventory, null, 2) + '\n');
  for (const file of await walk('docs/initial_specs/assets')) {
    generated.set(`docs/assets/book/${path.basename(file)}`, await fs.readFile(file));
  }
  const buildInputs = ['README.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'docs/styles.css', 'docs/partials-loader.js',
    'docs/initial_specs/sd_lm_book.md', ...await walk('docs/initial_specs/assets'), ...await walk('docs/content'), ...specs, ...await walk('tools')];
  const digest = createHash('sha256').update(inventory.sourceHash);
  for (const file of buildInputs.sort()) digest.update(file).update(await fs.readFile(file));
  generated.set('docs/assets/build.json', JSON.stringify({ sourceHash: inventory.sourceHash, documentationHash: digest.digest('hex') }, null, 2) + '\n');
  for (const name of ['specsLoader.html', '.nojekyll']) generated.set(`docs/${name}`, await fs.readFile(`.agents/skills/gamp-specs/assets/${name}`, 'utf8'));
  const stale = [];
  for (const [file, content] of generated) {
    if (check) {
      let existing;
      try { existing = await fs.readFile(file, Buffer.isBuffer(content) ? undefined : 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (Buffer.isBuffer(content) ? !existing?.equals(content) : existing !== content) stale.push(file);
    } else {
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, content);
    }
  }
  if (stale.length) throw new Error(`Stale documentation. Run npm run docs:build.\n${stale.join('\n')}`);
  console.log(`${check ? 'Checked' : 'Built'} ${generated.size} documentation artifacts, ${specs.length} specifications and the complete book.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('tools/docs-build.mjs')) await generate();
