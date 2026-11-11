// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
import { zh } from '../locales.ts';
export function readWsSettings(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    output: raw.output === 'suffix' || raw.output === 'overwrite' || raw.output === 'preview'
      ? raw.output
      : 'subfolder',
    suffix: typeof raw.suffix === 'string' && raw.suffix.trim()
      ? raw.suffix.trim().replace(/^[.\\/]+/, '').replace(/[\\/]/g, '')
      : 'zh',
    autoSave: raw.autoSave === true,
    // Guidelines attach by default; the user can switch them off per install.
    useSpec: raw.useSpec !== false,
  };
}

export function wsFormatSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Turn the flat workspace file list into a directory tree for the sidebar.
 * Folders sort before their files; siblings sort by name, case-insensitively.
 * @param {Array<{relPath: string}>} files - workspace entries with slash paths.
 * @returns {Array<object>} nodes: `{ kind:'dir', name, path, count, children }`
 *   or `{ kind:'file', name, entry }`.
 */
export function buildWsTree(files) {
  const root = { dirs: new Map(), files: [] };
  for (const entry of files) {
    const parts = String(entry.relPath).split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const seg = parts[i];
      if (!node.dirs.has(seg)) node.dirs.set(seg, { dirs: new Map(), files: [] });
      node = node.dirs.get(seg);
    }
    node.files.push(entry);
  }
  const walk = (node, prefix) => {
    const children = [];
    for (const [name, child] of [...node.dirs].sort((a, b) => a[0].localeCompare(b[0]))) {
      const path = prefix ? `${prefix}/${name}` : name;
      const nested = walk(child, path);
      children.push({
        kind: 'dir',
        name,
        path,
        count: nested.reduce((sum, item) => sum + (item.kind === 'dir' ? item.count : 1), 0),
        children: nested,
      });
    }
    for (const entry of node.files.slice().sort((a, b) => a.relPath.localeCompare(b.relPath))) {
      children.push({ kind: 'file', name: entry.relPath.split('/').pop(), entry });
    }
    return children;
  };
  return walk(root, '');
}

export function sameRoute(left, right) {
  return Boolean(left && right && left.provider === right.provider && left.model === right.model);
}

/**
 * The identity a model picker option carries: `provider/model`.
 * @param {{ provider: string, model: string }} entry - model entry.
 * @returns {string} option value.
 */
export function routeId(entry) {
  return `${entry.provider}/${entry.model}`;
}

/**
 * Read the stored model preference, dropping anything malformed so a broken
 * `prefs` value cannot make every request fail.
 * @param {unknown} value - stored value.
 * @returns {{ provider: string, model: string } | null} route or null.
 */
export function storedRoutePreference(value) {
  if (!value || typeof value !== 'object') return null;
  const provider = typeof value.provider === 'string' ? value.provider.trim() : '';
  const model = typeof value.model === 'string' ? value.model.trim() : '';
  return provider && model ? { provider, model } : null;
}
