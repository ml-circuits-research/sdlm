#!/usr/bin/env node
import { createApiServer } from './api/server.mjs';

async function main() {
  const args = process.argv.slice(2);
  let host = '127.0.0.1', port = 3000, sessions = 'sessions', backend;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === '--help') {
      console.log('npm run server -- [--host 127.0.0.1] [--port 3000] [--sessions sessions] [--backend auto|bundled|external]\nSet SD_LM_API_KEY for bearer authentication. Required for non-loopback hosts.');
      return;
    }
    if (!['--host', '--port', '--sessions', '--backend'].includes(argument)) throw new Error(`Unknown option ${argument}`);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
    if (argument === '--host') host = value;
    if (argument === '--port') port = Number(value);
    if (argument === '--sessions') sessions = value;
    if (argument === '--backend') backend = value;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be between 1 and 65535');
  const apiKey = process.env.SD_LM_API_KEY ?? '';
  if (!['127.0.0.1', '::1', 'localhost'].includes(host) && !apiKey) throw new Error('Set SD_LM_API_KEY before binding a non-loopback host');
  if (backend && !['auto', 'bundled', 'external'].includes(backend)) throw new Error('Invalid backend');
  const server = createApiServer({ sessions, runtimeOptions: { backend }, apiKey });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  console.log(`sdlm API at http://${host.includes(':') ? '[' + host + ']' : host}:${port}/v1\nSession storage: ${sessions}\nModel: sdlm`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
