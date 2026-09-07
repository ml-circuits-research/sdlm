import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { JSDOM, VirtualConsole } from 'jsdom';

// Execute the site's own scripts in a DOM, with local fetch and no network or visual-browser dependency.
const pages = (await fs.readdir('docs')).filter(name => name.endsWith('.html'));
for (const name of pages) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const html = await fs.readFile(`docs/${name}`, 'utf8');
  const url = `http://docs.local/${name}${name === 'specsLoader.html' ? '?spec=DS008-sessions.md' : ''}`;
  const dom = new JSDOM(html, { url, runScripts: 'outside-only', virtualConsole });
  const { window } = dom;
  window.fetch = async relative => {
    const target = new URL(relative, window.location.href);
    assert.equal(target.origin, 'http://docs.local');
    try { return { ok: true, text: async () => fs.readFile(path.join('docs', target.pathname), 'utf8') }; }
    catch { return { ok: false, status: 404 }; }
  };
  for (const script of window.document.querySelectorAll('script:not([type=module])')) {
    const source = script.src ? await fs.readFile(path.join('docs', new URL(script.src).pathname), 'utf8') : script.textContent;
    await window.eval(source);
  }
  for (let i = 0; i < 100 && !window.document.querySelector('.primary-nav'); i++) await new Promise(resolve => setTimeout(resolve, 5));
  const buttons = [...window.document.querySelectorAll('.menu button')];
  assert.equal(buttons.length, 3, `${name}: shared header`);
  for (const button of buttons) {
    const panel = window.document.getElementById(button.getAttribute('aria-controls'));
    button.click();
    assert.equal(panel.hidden, false, `${name}: menu opens`);
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    window.document.querySelector('main').click();
    assert.equal(panel.hidden, true, `${name}: outside click closes`);
    button.click();
    window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(panel.hidden, true, `${name}: Escape closes`);
  }
  if (name === 'specsLoader.html') {
    for (let i = 0; i < 100 && window.document.getElementById('current-spec').textContent === 'Loading...'; i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.match(window.document.getElementById('content').textContent, /atomically replacing/);
    assert.match(window.document.title, /DS008-sessions.*sdlm/);
    assert.equal(window.document.querySelector('#content a[href^="../"]'), null);
    assert(window.document.getElementById('core-content'));
  }
  if (name === 'book.html') {
    assert(window.document.querySelectorAll('.book-toc a').length > 30);
    assert(window.document.body.textContent.includes('Reuse values in new tasks'));
    assert.equal(window.document.querySelectorAll('figure img').length, 8);
  }
  for (const snippet of window.document.querySelectorAll('code.language-json')) JSON.parse(snippet.textContent);
  assert.equal(errors.length, 0, `${name}: ${errors.map(error => error.message).join('; ')}`);
  window.close();
}
console.log(`DOM checks passed for ${pages.length} pages: shared menus, outside click, Escape, specification loading, book chapters and JSON snippets.`);
