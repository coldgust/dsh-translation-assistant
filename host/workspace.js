/**
 * Workspace file service for the Host half.
 *
 * It exposes three operations over a folder on disk — list, read, and write —
 * with the guards a plugin needs before touching the user's files:
 *  - every path is resolved against the workspace root and rejected when it
 *    escapes it (symlinks resolve too, so an escaped target is caught);
 *  - extensions are whitelisted, tighter for writes than reads: `.docx` can
 *    be imported but never written back, because no docx writer exists here;
 *  - sizes and list results are capped.
 *
 * The `fs` adapter is injected so tests can point the service at a temporary
 * directory (or a fake) without mocking module imports.
 */

/** Extensions the workspace can open; `.docx` rides in as base64. */
export const WS_READ_EXTENSIONS = new Set([
  '.txt', '.text', '.md', '.markdown', '.log', '.html', '.htm', '.xhtml', '.docx',
]);
/** Extensions the workspace can write back — text only. */
export const WS_WRITE_EXTENSIONS = new Set([
  '.txt', '.text', '.md', '.markdown', '.html', '.htm', '.xhtml',
]);
/** Flat cap on one listing, so a huge tree cannot flood the page. */
export const WS_MAX_LIST_ENTRIES = 500;
/** How deep the listing walks before it stops descending. */
export const WS_MAX_DEPTH = 6;
/** Largest plain-text file the read endpoint returns. */
export const WS_MAX_READ_BYTES = 8 * 1024 * 1024;
/** Largest `.docx` package the read endpoint returns as base64. */
export const WS_MAX_DOCX_BYTES = 12 * 1024 * 1024;
/** Largest string the write endpoint accepts. */
export const WS_MAX_WRITE_CHARS = 8 * 1024 * 1024;
/** Fixed folder (inside the workspace root) holding the guideline documents. */
export const SPEC_DIRECTORY = '.translation-spec';
/** Largest single guideline document the spec endpoint returns. */
export const SPEC_MAX_FILE_BYTES = 64 * 1024;
/** Largest combined size of all guideline documents returned. */
export const SPEC_MAX_TOTAL_BYTES = 256 * 1024;
/** Most guideline documents the spec endpoint returns. */
export const SPEC_MAX_FILES = 20;
/** Directories the listing never descends into. */
const SKIPPED_DIRECTORIES = new Set(['node_modules']);

/**
 * Build an error that carries an HTTP status and a stable code.
 * @param {number} status - HTTP status code.
 * @param {string} message - human-readable reason.
 * @param {string} [code] - machine-readable code.
 * @returns {Error} the error.
 */
function workspaceError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

/**
 * @param {string} extension - suffix with the leading dot.
 * @returns {boolean} true when the file can be opened.
 */
function readableExtension(extension) {
  return WS_READ_EXTENSIONS.has(extension.toLowerCase());
}

/**
 * @param {string} extension - suffix with the leading dot.
 * @returns {boolean} true when the file can be written back.
 */
function writableExtension(extension) {
  return WS_WRITE_EXTENSIONS.has(extension.toLowerCase());
}

/**
 * Resolve one workspace-relative path and make sure it stays inside the root.
 * @param {object} path - `node:path`-like module (posix or platform).
 * @param {string} root - absolute workspace root.
 * @param {string} relativePath - workspace-relative file path.
 * @returns {string} absolute file path.
 */
function resolveInside(path, root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  const rel = path.relative(path.resolve(root), absolute);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw workspaceError(400, 'The path escapes the workspace root.', 'PATH_ESCAPES');
  }
  return absolute;
}

/**
 * Create the workspace service over an injected filesystem.
 * @param {object} fs - `node:fs/promises`-like module.
 * @param {object} path - `node:path`-like module.
 * @returns {object} service with `list`, `read`, and `write`.
 */
export function createWorkspaceService(fs, path) {
  /**
   * Walk the folder once and collect the files the page can open.
   * @param {string} root - absolute workspace root.
   * @returns {Promise<{ root: string, entries: object[] }>} listing.
   */
  async function list(root) {
    const base = path.resolve(String(root ?? '').trim());
    if (!base) throw workspaceError(400, '"root" is required.');
    let stat;
    try {
      stat = await fs.stat(base);
    } catch {
      throw workspaceError(400, 'The workspace folder does not exist.', 'ROOT_MISSING');
    }
    if (!stat.isDirectory()) {
      throw workspaceError(400, 'The workspace root must be a folder.', 'ROOT_NOT_FOLDER');
    }
    const entries = [];
    const walk = async (dir, prefix, depth) => {
      if (depth > WS_MAX_DEPTH || entries.length >= WS_MAX_LIST_ENTRIES) return;
      let names;
      try {
        names = await fs.readdir(dir);
      } catch {
        return;
      }
      for (const name of names) {
        if (entries.length >= WS_MAX_LIST_ENTRIES) return;
        if (name.startsWith('.') || SKIPPED_DIRECTORIES.has(name)) continue;
        const absolute = path.join(dir, name);
        const relPath = prefix ? `${prefix}/${name}` : name;
        let info;
        try {
          info = await fs.stat(absolute);
        } catch {
          continue;
        }
        if (info.isDirectory()) {
          await walk(absolute, relPath, depth + 1);
          continue;
        }
        if (!info.isFile()) continue;
        const extension = path.extname(name);
        if (!readableExtension(extension)) continue;
        entries.push({
          relPath,
          name,
          ext: extension.toLowerCase().slice(1),
          size: info.size,
          mtimeMs: info.mtimeMs,
        });
      }
    };
    await walk(base, '', 1);
    entries.sort((a, b) => (a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0));
    return { root: base, entries };
  }

  /**
   * Read one file: plain text comes back as a string, `.docx` as base64 for
   * the page to unpack.
   * @param {string} root - absolute workspace root.
   * @param {string} relativePath - workspace-relative file path.
   * @returns {Promise<object>} `{ content, encoding, name, ext, size }`.
   */
  async function read(root, relativePath) {
    const base = path.resolve(String(root ?? '').trim());
    const rel = String(relativePath ?? '').trim();
    if (!base || !rel) throw workspaceError(400, '"root" and "relPath" are required.');
    const absolute = resolveInside(path, base, rel);
    const extension = path.extname(absolute).toLowerCase();
    if (!readableExtension(extension)) {
      throw workspaceError(400, 'This file type cannot be opened in the workspace.', 'EXTENSION');
    }
    let stat;
    try {
      stat = await fs.stat(absolute);
    } catch {
      throw workspaceError(404, 'The file does not exist.', 'FILE_MISSING');
    }
    if (!stat.isFile()) throw workspaceError(400, 'The path is not a file.', 'NOT_FILE');
    const cap = extension === '.docx' ? WS_MAX_DOCX_BYTES : WS_MAX_READ_BYTES;
    if (stat.size > cap) {
      throw workspaceError(413, `The file exceeds the ${Math.round(cap / 1024 / 1024)} MB limit.`, 'TOO_LARGE');
    }
    if (extension === '.docx') {
      const buffer = await fs.readFile(absolute);
      return {
        content: buffer.toString('base64'),
        encoding: 'base64',
        name: path.basename(absolute),
        ext: 'docx',
        size: stat.size,
      };
    }
    const content = await fs.readFile(absolute, 'utf8');
    return { content, encoding: 'text', name: path.basename(absolute), ext: extension.slice(1), size: stat.size };
  }

  /**
   * Write one text file, creating parent folders as needed. Existing files
   * are only replaced when the caller explicitly asks for it.
   * @param {string} root - absolute workspace root.
   * @param {string} relativePath - workspace-relative file path.
   * @param {string} content - full file content.
   * @param {boolean} [overwrite] - replace an existing file.
   * @returns {Promise<object>} `{ relPath, bytes }`.
   */
  async function write(root, relativePath, content, overwrite = false) {
    const base = path.resolve(String(root ?? '').trim());
    const rel = String(relativePath ?? '').trim();
    const text = typeof content === 'string' ? content : '';
    if (!base || !rel) throw workspaceError(400, '"root" and "relPath" are required.');
    if (text.length > WS_MAX_WRITE_CHARS) {
      throw workspaceError(413, `The content exceeds the ${Math.round(WS_MAX_WRITE_CHARS / 1024 / 1024)} MB limit.`, 'TOO_LARGE');
    }
    const extension = path.extname(rel).toLowerCase();
    if (!writableExtension(extension)) {
      throw workspaceError(400, 'Only plain-text files can be written back.', 'EXTENSION');
    }
    const absolute = resolveInside(path, base, rel);
    let exists = false;
    try {
      await fs.stat(absolute);
      exists = true;
    } catch {
      exists = false;
    }
    if (exists && !overwrite) {
      throw workspaceError(409, 'The target file already exists.', 'EXISTS');
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, text, 'utf8');
    return { relPath: rel, bytes: Buffer.byteLength(text, 'utf8'), existed: exists };
  }

  /**
   * Read every guideline document from `<root>/.translation-spec/*.md`,
   * sorted by file name. Oversized or excess files are reported in
   * `skipped` instead of failing the whole call; a missing folder simply
   * means the workspace has no guidelines.
   * @param {string} root - absolute workspace root.
   * @returns {Promise<object>} `{ available, docs, skipped }`.
   */
  async function readSpec(root) {
    const base = path.resolve(String(root ?? '').trim());
    if (!base) throw workspaceError(400, '"root" is required.');
    const dir = path.join(base, SPEC_DIRECTORY);
    let names;
    try {
      names = await fs.readdir(dir);
    } catch {
      // No folder yet is not an error: the section stays visible so the
      // first document can be created from the page.
      return { available: true, docs: [], skipped: [] };
    }
    const candidates = [];
    for (const name of names) {
      if (!name.toLowerCase().endsWith('.md')) continue;
      const absolute = path.join(dir, name);
      let info;
      try {
        info = await fs.stat(absolute);
      } catch {
        continue;
      }
      if (!info.isFile()) continue;
      candidates.push({ name, absolute, size: info.size });
    }
    candidates.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const docs = [];
    const skipped = [];
    let total = 0;
    for (const file of candidates) {
      if (docs.length >= SPEC_MAX_FILES) {
        skipped.push({ name: file.name, reason: 'too_many' });
        continue;
      }
      if (file.size > SPEC_MAX_FILE_BYTES) {
        skipped.push({ name: file.name, reason: 'too_large' });
        continue;
      }
      if (total + file.size > SPEC_MAX_TOTAL_BYTES) {
        skipped.push({ name: file.name, reason: 'total_limit' });
        continue;
      }
      try {
        const text = await fs.readFile(file.absolute, 'utf8');
        docs.push({ name: file.name, bytes: file.size, text });
        total += file.size;
      } catch {
        skipped.push({ name: file.name, reason: 'unreadable' });
      }
    }
    return { available: true, docs, skipped };
  }

  /**
   * Validate one guideline file name: a single `.md` path segment, nothing
   * that could wander out of the spec folder.
   * @param {string} name - raw file name.
   * @returns {string} the validated name.
   */
  function specName(name) {
    const file = String(name ?? '').trim();
    if (!file || file.includes('/') || file.includes('\\') || !file.toLowerCase().endsWith('.md')) {
      throw workspaceError(400, 'Not a valid guideline file name.', 'SPEC_NAME');
    }
    return file;
  }

  /**
   * Delete one guideline document from `<root>/.translation-spec`.
   * @param {string} root - absolute workspace root.
   * @param {string} name - file name with the `.md` suffix.
   * @returns {Promise<object>} `{ name }` of the deleted file.
   */
  async function deleteSpec(root, name) {
    const base = path.resolve(String(root ?? '').trim());
    if (!base) throw workspaceError(400, '"root" is required.');
    const file = specName(name);
    const absolute = resolveInside(path, base, path.join(SPEC_DIRECTORY, file));
    try {
      await fs.unlink(absolute);
    } catch {
      throw workspaceError(404, 'The file does not exist.', 'FILE_MISSING');
    }
    return { name: file };
  }

  return { list, read, write, readSpec, deleteSpec };
}
