// Google Drive can reject npm's many concurrent writes. Keep dependencies on
// the local disk and mirror only project files, including edits made during dev.
import { createServer } from 'vite';
import { readdir, stat, copyFile, mkdir, unlink } from 'node:fs/promises';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';

const sourceRoot = resolve(process.argv[2]);
const runtimeRoot = resolve(process.cwd());
if (sourceRoot === runtimeRoot) throw new Error('Source and runtime must differ.');
const tracked = new Map();
const roots = ['src', 'public', 'tests', 'index.html', 'tsconfig.json', 'tsconfig.test.json'];
async function syncPath(name, seen) {
  const source = join(sourceRoot, name);
  let info;
  try { info = await stat(source); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  if (info.isDirectory()) {
    for (const entry of await readdir(source)) await syncPath(join(name, entry), seen);
    return;
  }
  seen.add(name);
  const signature = `${info.mtimeMs}:${info.size}`;
  if (tracked.get(name) === signature) return;
  const destination = resolve(runtimeRoot, name);
  const within = relative(runtimeRoot, destination);
  if (within.startsWith('..') || isAbsolute(within)) throw new Error('Mirror path escaped runtime.');
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination); tracked.set(name, signature);
}
async function sync() {
  const seen = new Set();
  for (const name of roots) await syncPath(name, seen);
  for (const name of tracked.keys()) {
    if (seen.has(name)) continue;
    const destination = resolve(runtimeRoot, name);
    const within = relative(runtimeRoot, destination);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error('Unsafe mirror deletion.');
    await unlink(destination).catch(error => { if (error.code !== 'ENOENT') throw error; });
    tracked.delete(name);
  }
}
await sync();
const server = await createServer({ root: runtimeRoot, server: { host: '127.0.0.1' } });
await server.listen(); server.printUrls();
let busy = false;
const timer = setInterval(async () => {
  if (busy) return;
  busy = true;
  try { await sync(); } catch (error) { console.error('Source sync failed:', error.message); }
  finally { busy = false; }
}, 1000);
async function stop() { clearInterval(timer); await server.close(); process.exit(0); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
