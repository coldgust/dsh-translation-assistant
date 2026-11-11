const WS_READ_EXTENSIONS = /* @__PURE__ */ new Set([
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".log",
  ".html",
  ".htm",
  ".xhtml",
  ".docx"
]);
const WS_WRITE_EXTENSIONS = /* @__PURE__ */ new Set([
  ".txt",
  ".text",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".xhtml"
]);
const WS_MAX_LIST_ENTRIES = 500;
const WS_MAX_DEPTH = 6;
const WS_MAX_READ_BYTES = 8 * 1024 * 1024;
const WS_MAX_DOCX_BYTES = 12 * 1024 * 1024;
const WS_MAX_WRITE_CHARS = 8 * 1024 * 1024;
const SPEC_DIRECTORY = ".translation-spec";
const SPEC_MAX_FILE_BYTES = 64 * 1024;
const SPEC_MAX_TOTAL_BYTES = 256 * 1024;
const SPEC_MAX_FILES = 20;
const SKIPPED_DIRECTORIES = /* @__PURE__ */ new Set(["node_modules"]);
function workspaceError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}
function readableExtension(extension) {
  return WS_READ_EXTENSIONS.has(extension.toLowerCase());
}
function writableExtension(extension) {
  return WS_WRITE_EXTENSIONS.has(extension.toLowerCase());
}
function resolveInside(path, root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  const rel = path.relative(path.resolve(root), absolute);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    throw workspaceError(400, "The path escapes the workspace root.", "PATH_ESCAPES");
  }
  return absolute;
}
function createWorkspaceService(fs, path) {
  async function list(root) {
    const base = path.resolve(String(root ?? "").trim());
    if (!base) throw workspaceError(400, '"root" is required.');
    let stat;
    try {
      stat = await fs.stat(base);
    } catch {
      throw workspaceError(400, "The workspace folder does not exist.", "ROOT_MISSING");
    }
    if (!stat.isDirectory()) {
      throw workspaceError(400, "The workspace root must be a folder.", "ROOT_NOT_FOLDER");
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
        if (name.startsWith(".") || SKIPPED_DIRECTORIES.has(name)) continue;
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
          mtimeMs: info.mtimeMs
        });
      }
    };
    await walk(base, "", 1);
    entries.sort((a, b) => a.relPath < b.relPath ? -1 : a.relPath > b.relPath ? 1 : 0);
    return { root: base, entries };
  }
  async function read(root, relativePath) {
    const base = path.resolve(String(root ?? "").trim());
    const rel = String(relativePath ?? "").trim();
    if (!base || !rel) throw workspaceError(400, '"root" and "relPath" are required.');
    const absolute = resolveInside(path, base, rel);
    const extension = path.extname(absolute).toLowerCase();
    if (!readableExtension(extension)) {
      throw workspaceError(400, "This file type cannot be opened in the workspace.", "EXTENSION");
    }
    let stat;
    try {
      stat = await fs.stat(absolute);
    } catch {
      throw workspaceError(404, "The file does not exist.", "FILE_MISSING");
    }
    if (!stat.isFile()) throw workspaceError(400, "The path is not a file.", "NOT_FILE");
    const cap = extension === ".docx" ? WS_MAX_DOCX_BYTES : WS_MAX_READ_BYTES;
    if (stat.size > cap) {
      throw workspaceError(413, `The file exceeds the ${Math.round(cap / 1024 / 1024)} MB limit.`, "TOO_LARGE");
    }
    if (extension === ".docx") {
      const buffer = await fs.readFile(absolute);
      return {
        content: buffer.toString("base64"),
        encoding: "base64",
        name: path.basename(absolute),
        ext: "docx",
        size: stat.size
      };
    }
    const content = await fs.readFile(absolute, "utf8");
    return { content, encoding: "text", name: path.basename(absolute), ext: extension.slice(1), size: stat.size };
  }
  async function write(root, relativePath, content, overwrite = false) {
    const base = path.resolve(String(root ?? "").trim());
    const rel = String(relativePath ?? "").trim();
    const text = typeof content === "string" ? content : "";
    if (!base || !rel) throw workspaceError(400, '"root" and "relPath" are required.');
    if (text.length > WS_MAX_WRITE_CHARS) {
      throw workspaceError(413, `The content exceeds the ${Math.round(WS_MAX_WRITE_CHARS / 1024 / 1024)} MB limit.`, "TOO_LARGE");
    }
    const extension = path.extname(rel).toLowerCase();
    if (!writableExtension(extension)) {
      throw workspaceError(400, "Only plain-text files can be written back.", "EXTENSION");
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
      throw workspaceError(409, "The target file already exists.", "EXISTS");
    }
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, text, "utf8");
    return { relPath: rel, bytes: Buffer.byteLength(text, "utf8"), existed: exists };
  }
  async function readSpec(root) {
    const base = path.resolve(String(root ?? "").trim());
    if (!base) throw workspaceError(400, '"root" is required.');
    const dir = path.join(base, SPEC_DIRECTORY);
    let names;
    try {
      names = await fs.readdir(dir);
    } catch {
      return { available: true, docs: [], skipped: [] };
    }
    const candidates = [];
    for (const name of names) {
      if (!name.toLowerCase().endsWith(".md")) continue;
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
    candidates.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    const docs = [];
    const skipped = [];
    let total = 0;
    for (const file of candidates) {
      if (docs.length >= SPEC_MAX_FILES) {
        skipped.push({ name: file.name, reason: "too_many" });
        continue;
      }
      if (file.size > SPEC_MAX_FILE_BYTES) {
        skipped.push({ name: file.name, reason: "too_large" });
        continue;
      }
      if (total + file.size > SPEC_MAX_TOTAL_BYTES) {
        skipped.push({ name: file.name, reason: "total_limit" });
        continue;
      }
      try {
        const text = await fs.readFile(file.absolute, "utf8");
        docs.push({ name: file.name, bytes: file.size, text });
        total += file.size;
      } catch {
        skipped.push({ name: file.name, reason: "unreadable" });
      }
    }
    return { available: true, docs, skipped };
  }
  function specName(name) {
    const file = String(name ?? "").trim();
    if (!file || file.includes("/") || file.includes("\\") || !file.toLowerCase().endsWith(".md")) {
      throw workspaceError(400, "Not a valid guideline file name.", "SPEC_NAME");
    }
    return file;
  }
  async function deleteSpec(root, name) {
    const base = path.resolve(String(root ?? "").trim());
    if (!base) throw workspaceError(400, '"root" is required.');
    const file = specName(name);
    const absolute = resolveInside(path, base, path.join(SPEC_DIRECTORY, file));
    try {
      await fs.unlink(absolute);
    } catch {
      throw workspaceError(404, "The file does not exist.", "FILE_MISSING");
    }
    return { name: file };
  }
  return { list, read, write, readSpec, deleteSpec };
}
export {
  SPEC_DIRECTORY,
  SPEC_MAX_FILES,
  SPEC_MAX_FILE_BYTES,
  SPEC_MAX_TOTAL_BYTES,
  WS_MAX_DEPTH,
  WS_MAX_DOCX_BYTES,
  WS_MAX_LIST_ENTRIES,
  WS_MAX_READ_BYTES,
  WS_MAX_WRITE_CHARS,
  WS_READ_EXTENSIONS,
  WS_WRITE_EXTENSIONS,
  createWorkspaceService
};
