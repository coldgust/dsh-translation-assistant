// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
export function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/** MIME type of a Word document: OOXML inside a ZIP container. */
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
/** Larger files are rejected up front: one pass cannot translate them anyway. */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
/** Extensions treated as plain UTF-8 text. */
export const TEXT_FILE_EXTENSIONS = ['txt', 'text', 'md', 'markdown', 'log'];
/** Extensions parsed as HTML before translating. */
export const HTML_FILE_EXTENSIONS = ['html', 'htm', 'xhtml'];
/** Named entities left in prose; numeric ones are resolved separately. */
export const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  laquo: '«',
  raquo: '»',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
  middot: '·',
  bull: '•',
  deg: '°',
  shy: '',
  zwj: '',
  zwnj: '',
};

/**
 * Lowercased extension of a file name, without the dot.
 * @param {string} name - file name.
 * @returns {string} extension or an empty string.
 */
export function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

/**
 * Decode the entities Word leaves in `document.xml` and the named/numeric
 * entities found in HTML. One pass, so `&amp;lt;` decodes to `&lt;` rather
 * than being decoded twice.
 * @param {string} text - escaped text.
 * @returns {string} decoded text.
 */
export function decodeXmlEntities(text) {
  const codePoint = (raw, radix, fallback) => {
    const value = Number.parseInt(raw, radix);
    if (!Number.isFinite(value) || value <= 0 || value > 0x10ffff) return fallback;
    return String.fromCodePoint(value);
  };
  return String(text).replace(/&#x([0-9a-f]+);|&#(\d+);|&([a-z][a-z0-9]*);/gi, (whole, hex, decimal, name) => {
    if (hex !== undefined) return codePoint(hex, 16, whole);
    if (decimal !== undefined) return codePoint(decimal, 10, whole);
    const key = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, key) ? HTML_ENTITIES[key] : whole;
  });
}

/**
 * Turn the body XML of a Word document into plain paragraphs.
 * Tabs become `\t`, soft breaks stay line breaks, and each `</w:p>` closes a
 * paragraph so the existing blank-line splitter sees real blocks.
 * @param {string} xml - `word/document.xml` contents.
 * @returns {string} plain text.
 */
export function docxXmlToText(xml) {
  const text = String(xml || '')
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<w:cr\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:p>/g, '\n\n')
    .replace(/<[^>]*>/g, '');
  return decodeXmlEntities(text);
}

/**
 * Reduce an HTML document to readable blocks. Scripts, styles, and the head
 * are dropped, block-level closes become paragraph breaks, and the remaining
 * tags are stripped, so the page's own paragraph splitter sees real blocks.
 * @param {string} html - HTML source.
 * @returns {string} plain text.
 */
export function htmlToText(html) {
  const source = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    // Attributes are irrelevant to the text, but a self-closing <br> is a break.
    .replace(/<br\b[^>]*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|main|aside|nav|figure|figcaption|blockquote|pre|h[1-6]|li|tr|table|ul|ol|dl|dd|dt)\s*>/gi, '\n\n')
    .replace(/<\/(td|th)\s*>/gi, '\t')
    .replace(/<[^>]*>/g, '');
  return decodeXmlEntities(source);
}

/**
 * Tell whether a file should be parsed as HTML.
 * @param {{ name?: string, type?: string }} file - picked file.
 * @returns {boolean} true for HTML.
 */
export function isHtmlImport(file) {
  if (HTML_FILE_EXTENSIONS.includes(fileExtension(file && file.name))) return true;
  return String((file && file.type) || '').toLowerCase() === 'text/html';
}

/**
 * Escape text for an HTML document body.
 * @param {string} text - plain text.
 * @returns {string} escaped text with line breaks preserved.
 */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

/**
 * Locate one entry inside a ZIP archive by walking its central directory.
 * @param {Uint8Array} bytes - whole archive.
 * @param {string} wanted - exact entry name.
 * @returns {{ method: number, data: Uint8Array } | null} raw entry, or null.
 */
export function findZipEntry(bytes, wanted) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 22) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record sits within the last 64 KiB plus its
  // own 22-byte body; scanning backwards finds it even with a ZIP comment.
  let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65558); at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) return null;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === wanted) {
      if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) return null;
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const end = start + compressedSize;
      if (end > bytes.length || compressedSize === 0) return null;
      return { method, data: bytes.subarray(start, end) };
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

/**
 * Inflate a raw-deflate entry with the platform's own decompressor.
 * @param {Uint8Array} data - deflated bytes.
 * @returns {Promise<Uint8Array>} inflated bytes.
 */
export async function inflateRaw(data) {
  if (typeof DecompressionStream !== 'function') {
    const error = new Error('deflate-raw is unavailable');
    error.code = 'DOCX_UNSUPPORTED';
    throw error;
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Read the text of a `.docx` file without any third-party library.
 * @param {ArrayBuffer} buffer - whole file.
 * @returns {Promise<string>} plain text, paragraphs separated by blank lines.
 */
export async function readDocxText(buffer) {
  const entry = findZipEntry(new Uint8Array(buffer), 'word/document.xml');
  if (!entry) {
    const error = new Error('word/document.xml is missing');
    error.code = 'DOCX_INVALID';
    throw error;
  }
  let xml;
  if (entry.method === 0) xml = entry.data;
  else if (entry.method === 8) xml = await inflateRaw(entry.data);
  else {
    const error = new Error(`unsupported zip method ${entry.method}`);
    error.code = 'DOCX_UNSUPPORTED';
    throw error;
  }
  return docxXmlToText(new TextDecoder('utf-8').decode(xml));
}

/**
 * Normalize imported text so blank-line paragraph splitting behaves.
 * @param {string} raw - decoded file contents.
 * @returns {string} cleaned text.
 */
export function normalizeImportedText(raw) {
  return String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function decodeBase64Bytes(base64) {
  const binary = atob(String(base64 ?? ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function isTextImport(file) {
  if (TEXT_FILE_EXTENSIONS.includes(fileExtension(file && file.name))) return true;
  if (isHtmlImport(file)) return true;
  const type = String((file && file.type) || '');
  return type.startsWith('text/') || type === 'application/json';
}

/**
 * Extract plain text from a text file, an HTML page, or a Word document.
 * @param {{ name?: string, type?: string, text?: Function, arrayBuffer?: Function }} file - picked file.
 * @returns {Promise<string>} normalized text.
 */
export async function extractImportText(file) {
  const extension = fileExtension(file && file.name);
  if (extension === 'doc' || (file && file.type === 'application/msword')) {
    const error = new Error('legacy .doc is unsupported');
    error.code = 'FILE_LEGACY_DOC';
    throw error;
  }
  if (extension === 'docx' || (file && file.type === DOCX_MIME)) {
    return normalizeImportedText(await readDocxText(await file.arrayBuffer()));
  }
  if (isHtmlImport(file)) return normalizeImportedText(htmlToText(await file.text()));
  return normalizeImportedText(await file.text());
}

/**
 * Translation paragraphs in document order, preferring paragraphs over the
 * sentence fallback.
 * @param {object | null} doc - current document.
 * @returns {string[]} translated blocks.
 */
export function exportParagraphs(doc) {
  const paragraphs = doc && Array.isArray(doc.paragraphs) ? doc.paragraphs : [];
  const usable = paragraphs.some((item) => item.translation.trim())
    ? paragraphs
    : (doc && Array.isArray(doc.sentences) ? doc.sentences : []);
  return usable.map((item) => item.translation.trim()).filter(Boolean);
}

/**
 * Rebuild an imported HTML file around the translated paragraphs. Inline
 * markup is not preserved: the page translates text, so the export keeps the
 * block structure and drops styling rather than shipping broken tags.
 * @param {object} doc - current document.
 * @param {string} name - download name, used for the title.
 * @returns {string} HTML document.
 */
export function buildHtmlExport(doc, name) {
  const title = name.replace(/\.[a-z0-9]+$/i, '');
  const lines = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
  ];
  for (const text of exportParagraphs(doc)) lines.push(`<p>${escapeHtml(text)}</p>`);
  lines.push('</body>', '</html>', '');
  return lines.join('\n');
}

/**
 * Name a downloaded translation after the imported file, when there is one.
 * @param {object | null} doc - current document.
 * @returns {string} file name ending in `.md`, `.html`, or `.txt`.
 */
export function downloadFileName(doc) {
  const original = doc && typeof doc.fileName === 'string' ? doc.fileName : '';
  const base = original
    .replace(/\.[^./\\]+$/, '')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const extension = /\.(md|markdown)$/i.test(original)
    ? 'md'
    : /\.(html?|xhtml)$/i.test(original)
      ? 'html'
      : 'txt';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${(base || `translation-${stamp}`).slice(0, 80)}.${extension}`;
}
