import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Use pnpm throughout. corepack is a fallback for shells where the pnpm shim
// is not on PATH (the packageManager field still pins the same version).
function pnpm(args) {
  try {
    return execFileSync('pnpm', args, { encoding: 'utf8' });
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return execFileSync('corepack', ['pnpm', ...args], { encoding: 'utf8' });
  }
}

// pnpm pack has no --dry-run, so pack into a temporary directory, read the
// JSON manifest, then remove the tarball.
const destination = await mkdtemp(path.join(tmpdir(), 'dsh-pack-'));
try {
  const output = pnpm(['pack', '--json', '--pack-destination', destination]);
  const pack = JSON.parse(output.slice(output.indexOf('{')));
  for (const file of pack.files) console.log(file.path);
} finally {
  await rm(destination, { recursive: true, force: true });
}
