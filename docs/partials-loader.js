(async () => {
  for (const target of document.querySelectorAll('[data-include]')) {
    try {
      const response = await fetch(target.dataset.include);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      target.innerHTML = await response.text();
    } catch (error) {
      target.textContent = `Navigation could not load. Serve the docs with npm run docs:serve. ${error.message}`;
    }
  }
  const closeMenus = () => document.querySelectorAll('.menu button').forEach(button => {
    button.setAttribute('aria-expanded', 'false');
    document.getElementById(button.getAttribute('aria-controls')).hidden = true;
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('.menu button');
    if (!button) { if (!event.target.closest('.menu-panel')) closeMenus(); return; }
    const open = button.getAttribute('aria-expanded') === 'true';
    closeMenus();
    button.setAttribute('aria-expanded', String(!open));
    document.getElementById(button.getAttribute('aria-controls')).hidden = open;
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenus(); });
  const current = location.pathname.split('/').at(-1) || 'index.html';
  document.querySelectorAll('.primary-nav a').forEach(link => {
    if (link.getAttribute('href').split('?')[0] === current) link.setAttribute('aria-current', 'page');
  });
  // Adapt shared viewer content to repository-relative DS links after asynchronous loading.
  const content = document.getElementById('content');
  if (current === 'specsLoader.html' && content) {
    const adapt = () => {
      content.querySelectorAll('a[href^="../"]').forEach(link => {
        link.setAttribute('href', link.getAttribute('href').slice(3));
      });
      content.querySelectorAll('h1,h2,h3,h4').forEach(heading => {
        if (!heading.id) heading.id = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      });
      document.title = `${document.getElementById('spec-title').textContent} | sdlm`;
    };
    new MutationObserver(adapt).observe(content, { childList: true, subtree: true });
    adapt();
  }
})();
