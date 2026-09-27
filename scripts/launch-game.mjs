// Dependency-free local launcher for the production build.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';

const project = resolve(process.argv[2]);
const root = resolve(project, 'dist');
const identity = createHash('sha256').update(project.toLowerCase()).digest('hex');
const noBrowser = process.argv.includes('--no-browser');
await stat(resolve(root, 'index.html'));
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json',
  '.wasm': 'application/wasm', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.hdr': 'application/octet-stream', '.env': 'application/octet-stream',
  '.woff2': 'font/woff2', '.md': 'text/plain; charset=utf-8',
};
function openGame(url) {
  console.log(`Game: ${url}`);
  if (!noBrowser) {
    execFile('rundll32.exe', ['url.dll,FileProtocolHandler', url], error => {
      if (error) console.error(`Could not open the browser automatically. Open ${url} manually.`);
    });
  }
}
async function isOurServer(port) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/_ashfall/health`, { signal: AbortSignal.timeout(500) });
    return response.headers.get('x-ashfall-launcher') === identity;
  } catch { return false; }
}
function createGameServer() {
  return createServer(async (request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname === '/_ashfall/health') {
        response.writeHead(200, { 'x-ashfall-launcher': identity, 'cache-control': 'no-store' }); response.end('ASHFALL'); return;
      }
      const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      const within = relative(root, file);
      if (within.startsWith('..') || isAbsolute(within) || within.split(/[\\/]/).some(part => part.startsWith('.'))) {
        response.writeHead(403); response.end('Forbidden'); return;
      }
      const info = await stat(file);
      if (!info.isFile()) { response.writeHead(404); response.end('Not found'); return; }
      response.writeHead(200, {
        'content-type': types[extname(file).toLowerCase()] || 'application/octet-stream',
        'content-length': info.size, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : await readFile(file));
    } catch (error) {
      if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : 400);
      response.end('Not found');
    }
  });
}
let started = false;
for (let port = 5180; port < 5200; port++) {
  if (await isOurServer(port)) {
    console.log('The game server is already running. Reusing it.'); openGame(`http://127.0.0.1:${port}/`); started = true; break;
  }
  const server = createGameServer();
  try {
    await new Promise((success, failure) => {
      server.once('error', failure);
      server.listen(port, '127.0.0.1', () => { server.removeListener('error', failure); success(); });
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') continue;
    throw error;
  }
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  console.log('Server started. Press Ctrl+C or close this window to stop.');
  openGame(`http://127.0.0.1:${port}/`);
  process.on('SIGINT', () => { server.close(); server.closeAllConnections(); });
  process.on('SIGTERM', () => { server.close(); server.closeAllConnections(); });
  started = true; break;
}
if (!started) throw new Error('No free port between 5180 and 5199. Close an old game server and try again.');
