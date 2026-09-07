import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('docs');
const port = Number(process.env.SD_LM_DOCS_PORT ?? 8080);
const types = { '.html':'text/html', '.md':'text/plain', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml' };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://local').pathname);
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!target.startsWith(root + path.sep)) throw new Error('Invalid path');
    const content = await fs.readFile(target);
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control':'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type':'text/plain' });
    response.end('Not found');
  }
}).on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Set SD_LM_DOCS_PORT to an available port.` : error.message);
  process.exitCode = 1;
}).listen(port, '127.0.0.1', () => console.log(`Documentation: http://127.0.0.1:${port}`));
