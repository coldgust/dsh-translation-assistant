import { readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = path.join(root, '.build-check');
const artifacts = [
  'client.js',
  'index.js',
  'host/index.js',
  'host/engine.js',
  'host/workspace.js',
];

process.env.DSH_OUT_DIR = '.build-check';
await rm(temp, { recursive: true, force: true });
await import('../build.mjs');

let stale = false;
for (const rel of artifacts) {
  let committed;
  let rebuilt;
  try {
    committed = await readFile(path.join(root, 'lib', rel), 'utf8');
  } catch {
    console.error(`missing build artifact: lib/${rel} (run pnpm build)`);
    stale = true;
    continue;
  }
  rebuilt = await readFile(path.join(temp, rel), 'utf8');
  if (committed !== rebuilt) {
    console.error(`stale build artifact: lib/${rel} (run pnpm build)`);
    stale = true;
  }
}

await rm(temp, { recursive: true, force: true });
if (stale) process.exit(1);
console.log(`build artifacts are up to date (${artifacts.length} files)`);
