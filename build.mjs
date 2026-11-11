import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = path.resolve(root, process.env.DSH_OUT_DIR || 'lib');
const CLIENT_ID = 'dsh-translation-assistant';

await mkdir(outDir, { recursive: true });

// Browser half: one lazy-CJS file for the host's module loader. The wrapper is
// generated here instead of living in the source, so src/client can be split
// into ordinary TypeScript modules in later phases.
await build({
  entryPoints: [path.join(root, 'src/client/index.ts')],
  outfile: path.join(outDir, 'client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react', 'react/jsx-runtime'],
  loader: { '.css': 'text' },
  logLevel: 'warning',
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(CLIENT_ID)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
  },
  footer: { js: 'return module.exports; } });' },
});

// Host half: ESM files copied through esbuild so src/ remains the only source
// of truth and relative imports keep working in the published package.
await build({
  entryPoints: ['index', 'engine', 'workspace'].map((name) => path.join(root, 'src/host', `${name}.ts`)),
  outdir: path.join(outDir, 'host'),
  bundle: false,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  logLevel: 'warning',
});

await writeFile(path.join(outDir, 'index.js'), "export * from './host/index.js';\n", 'utf8');

console.error(`built ${path.relative(root, outDir)}`);
