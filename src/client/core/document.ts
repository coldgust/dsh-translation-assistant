// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
    export function splitParagraphs(text) {
      const normalized = String(text).replace(/\r\n?/g, '\n');
      const parts = normalized
        .split(/\n\s*\n+/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length > 1 || !normalized.includes('\n')) return parts;
      const lines = normalized
        .split('\n')
        .map((part) => part.trim())
        .filter(Boolean);
      return lines.length > 1 ? lines : parts;
    }

    /**
     * Split one Latin-script chunk on sentence-ending punctuation followed by a
     * capital letter or digit.
     * @param {string} chunk - text chunk.
     * @returns {string[]} sentence pieces.
     */
    export function splitLatinSentences(chunk) {
      const pieces = [];
      const boundary = /([.!?]+["'”’)\]]*)\s+(?=[A-Z0-9"'“(\[])/g;
      let start = 0;
      let match;
      while ((match = boundary.exec(chunk)) !== null) {
        pieces.push(chunk.slice(start, match.index + match[1].length));
        start = boundary.lastIndex;
      }
      pieces.push(chunk.slice(start));
      return pieces;
    }

    /**
     * Split text into sentences, handling CJK and Latin punctuation.
     * @param {string} text - source text.
     * @returns {string[]} trimmed sentences.
     */
    export function splitSentences(text) {
      const normalized = String(text).replace(/\r\n?/g, '\n').trim();
      if (!normalized) return [];
      const units = [];
      const pattern = /[^。！？!?…\n]+[。！？!?…]+[”’"'）)】]*|[^。！？!?…\n]+/g;
      let match;
      while ((match = pattern.exec(normalized)) !== null) {
        if (!match[0]) continue;
        units.push(...splitLatinSentences(match[0]));
      }
      return units.map((part) => part.trim()).filter(Boolean);
    }

    /**
     * Normalize a stored document into the current shape.
     * @param {unknown} value - stored value.
     * @returns {object | null} normalized document.
     */
    export function normalizeDoc(value) {
      if (!value || typeof value !== 'object') return null;
      const mapItems = (items, prefix) => {
        if (!Array.isArray(items)) return [];
        return items
          .filter((item) => item && typeof item.source === 'string')
          .map((item, index) => ({
            id: typeof item.id === 'string' ? item.id : `${prefix}${index}`,
            source: item.source,
            translation: typeof item.translation === 'string' ? item.translation : '',
            score: item.score && Number.isFinite(Number(item.score.value))
              ? {
                value: Math.round(Number(item.score.value)),
                comment: typeof item.score.comment === 'string' ? item.score.comment : '',
              }
              : null,
          }));
      };
      const doc = {
        sourceText: typeof value.sourceText === 'string' ? value.sourceText : '',
        // Only set when the text came from an imported file; drives the
        // download name and is harmless for typed or OCR'd documents.
        fileName: typeof value.fileName === 'string' ? value.fileName : '',
        sourceLanguage: typeof value.sourceLanguage === 'string' ? value.sourceLanguage : 'auto',
        targetLanguage: typeof value.targetLanguage === 'string' ? value.targetLanguage : '中文',
        documentScore: value.documentScore && Number.isFinite(Number(value.documentScore.value))
          ? {
            value: Math.round(Number(value.documentScore.value)),
            comment: typeof value.documentScore.comment === 'string' ? value.documentScore.comment : '',
          }
          : null,
        sentences: mapItems(value.sentences, 's'),
        paragraphs: mapItems(value.paragraphs, 'p'),
      };
      if (!doc.sourceText && doc.sentences.length === 0 && doc.paragraphs.length === 0) return null;
      return doc;
    }

    /** Build a short, collision-resistant id for a history entry. */

export function buildFullTranslation(doc) {
  if (!doc) return '';
  const source = doc.paragraphs.some((item) => item.translation.trim()) ? doc.paragraphs : doc.sentences;
  return source
    .map((item) => item.translation.trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Group sentence segments under the paragraph whose source contains them, in
 * document order. Both lists are split from the same source text, so a
 * monotonic scan is enough; a sentence only falls back to a full rescan when
 * the cursor has already passed the paragraph it belongs to.
 * @param {object} doc - current document.
 * @returns {object[][]} one array of sentence segments per paragraph.
 */
export function groupSentencesByParagraph(doc) {
  const paragraphs = doc.paragraphs || [];
  const groups = paragraphs.map(() => []);
  let cursor = 0;
  const locate = (text, from) => {
    for (let index = from; index < paragraphs.length; index += 1) {
      if (String(paragraphs[index].source || '').includes(text)) return index;
    }
    return -1;
  };
  (doc.sentences || []).forEach((sentence) => {
    const text = String(sentence.source || '').trim();
    if (!text) return;
    let index = locate(text, cursor);
    if (index < 0) index = locate(text, 0);
    if (index < 0) return;
    cursor = index;
    groups[index].push(sentence);
  });
  return groups;
}

// Characters that need no space around them when two sentences are joined.
export const CJK_EDGE = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/;

/**
 * Join sentence translations the way the paragraph they came from is typeset:
 * a space between Latin neighbours, nothing next to CJK text or full-width
 * punctuation.
 * @param {string[]} list - sentence translations in order.
 * @returns {string} joined paragraph translation.
 */
export function joinSentenceTranslations(list) {
  let out = '';
  list.forEach((value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (!out) {
      out = text;
      return;
    }
    const needsSpace = !CJK_EDGE.test(out.slice(-1)) && !CJK_EDGE.test(text.slice(0, 1));
    out += `${needsSpace ? ' ' : ''}${text}`;
  });
  return out;
}

/**
 * Rebuild the paragraph a sentence belongs to from that paragraph's sentence
 * translations, so an edit made in the sentence view also shows up in the
 * paragraph view and in the full text. The paragraph score is dropped because
 * its text changed.
 * @param {object | null} doc - current document, already carrying the edit.
 * @param {string} sentenceId - id of the sentence that was just edited.
 * @returns {object | null} updated document, or the same object when nothing
 *   needs rebuilding.
 */
export function syncSentenceToParagraph(doc, sentenceId) {
  if (!doc || !doc.paragraphs?.length || !doc.sentences?.length) return doc;
  const groups = groupSentencesByParagraph(doc);
  const index = groups.findIndex((group) => group.some((item) => item.id === sentenceId));
  if (index < 0) return doc;
  const translation = joinSentenceTranslations(groups[index].map((item) => item.translation));
  const paragraph = doc.paragraphs[index];
  if (paragraph.translation === translation) return doc;
  const paragraphs = doc.paragraphs.slice();
  paragraphs[index] = { ...paragraph, translation, score: null };
  return { ...doc, documentScore: null, paragraphs };
}

/**
 * Distribute a paragraph translation over the sentences that paragraph was
 * split into. When the edited text has a different number of sentence breaks
 * than the paragraph has sentences, neighbouring pieces are merged, and any
 * remaining sentence gets an empty box rather than a mid-word cut.
 * @param {string} text - paragraph translation.
 * @param {number} count - number of sentences in the paragraph.
 * @returns {string[]} exactly `count` pieces, in order.
 */
export function splitTranslationPieces(text, count) {
  const source = String(text || '').trim();
  if (count <= 0) return [];
  if (!source) return new Array(count).fill('');
  if (count === 1) return [source];
  let pieces = splitSentences(source);
  if (pieces.length === 0) pieces = [source];
  if (pieces.length > count) {
    const base = Math.floor(pieces.length / count);
    const extra = pieces.length % count;
    const merged = [];
    let cursor = 0;
    for (let index = 0; index < count; index += 1) {
      const size = base + (index < extra ? 1 : 0);
      merged.push(joinSentenceTranslations(pieces.slice(cursor, cursor + size)));
      cursor += size;
    }
    pieces = merged;
  }
  while (pieces.length < count) {
    if (!splitLongestPiece(pieces)) break;
  }
  while (pieces.length < count) pieces.push('');
  return pieces.slice(0, count);
}

/**
 * Cut the longest piece near its middle, preferring a clause punctuation mark.
 * @param {string[]} pieces - pieces to modify in place.
 * @returns {boolean} whether a piece could be split.
 */
export function splitLongestPiece(pieces) {
  let index = 0;
  for (let at = 1; at < pieces.length; at += 1) {
    if (pieces[at].length > pieces[index].length) index = at;
  }
  const text = pieces[index];
  const cut = middleCut(text);
  if (cut <= 0) return false;
  const left = text.slice(0, cut).trim();
  const right = text.slice(cut).trim();
  if (!left || !right) return false;
  pieces.splice(index, 1, left, right);
  return true;
}

// Punctuation an over-long piece can be cut on when a paragraph is spread over
// more sentences than its translation has sentence breaks.
export const CLAUSE_BREAK = /[，,；;、：:]/;

/**
 * Pick a cut index near the middle of a text, but only at a natural boundary:
 * after a clause punctuation mark, or at a space. A text without either is left
 * whole, so a sentence box never shows a chopped-up word.
 * @param {string} text - text to cut.
 * @returns {number} cut index, or -1 when there is no natural boundary.
 */
export function middleCut(text) {
  if (text.length < 2) return -1;
  const middle = text.length / 2;
  let best = -1;
  const closer = (candidate) => best < 0 || Math.abs(candidate - middle) < Math.abs(best - middle);
  for (let index = 1; index < text.length; index += 1) {
    if (CLAUSE_BREAK.test(text[index - 1]) && closer(index)) best = index;
  }
  if (best > 0) return best;
  for (let index = 1; index < text.length; index += 1) {
    if ((text[index - 1] === ' ' || text[index] === ' ') && closer(index)) best = index;
  }
  return best;
}

/**
 * Spread an edited paragraph translation over the sentences that paragraph was
 * split into, so an edit made in the paragraph view (or in the full-text box)
 * also shows up in the sentence view. Sentence scores are dropped because their
 * text changed.
 * @param {object | null} doc - current document, already carrying the edit.
 * @param {string} paragraphId - id of the paragraph that was just edited.
 * @returns {object | null} updated document, or the same object when nothing
 *   needs updating.
 */
export function syncParagraphToSentences(doc, paragraphId) {
  if (!doc || !doc.paragraphs?.length || !doc.sentences?.length) return doc;
  const index = doc.paragraphs.findIndex((item) => item.id === paragraphId);
  if (index < 0) return doc;
  const group = groupSentencesByParagraph(doc)[index];
  if (!group.length) return doc;
  const paragraph = doc.paragraphs[index];
  const pieces = splitTranslationPieces(paragraph.translation, group.length);
  const byId = new Map(group.map((item, order) => [item.id, pieces[order] ?? '']));
  let changed = false;
  const sentences = doc.sentences.map((item) => {
    if (!byId.has(item.id)) return item;
    const translation = byId.get(item.id);
    if (translation === item.translation) return item;
    changed = true;
    return { ...item, translation, score: null };
  });
  if (!changed) return doc;
  return { ...doc, documentScore: null, sentences };
}

/**
 * Split an edited full-text translation back into the blocks it was joined
 * from: blank lines separate blocks, and every block is trimmed.
 * @param {string} text - edited full text.
 * @returns {string[]} trimmed, non-empty blocks.
 */
export function splitTranslationBlocks(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Fold an edit of the full-text box back onto the segment collection the text
 * was built from, so the paragraph and sentence views stay in sync while the
 * user keeps typing in one big box. Blocks map to segments by index; extra
 * blocks append a segment (with an empty source) instead of being dropped.
 * @param {object | null} doc - current document.
 * @param {string} text - edited full text.
 * @returns {object | null} updated document, or the very same object when the
 *   edit changes nothing, so a controlled textarea is not re-rendered while the
 *   user is still typing blank lines.
 */
export function applyFullTranslationEdit(doc, text) {
  if (!doc) return doc;
  const key = doc.paragraphs.some((item) => item.translation.trim()) ? 'paragraphs' : 'sentences';
  const items = doc[key];
  const blocks = splitTranslationBlocks(text);
  const prefix = key === 'paragraphs' ? 'pn' : 'sn';
  const next = items.map((item, index) => {
    const translation = index < blocks.length ? blocks[index] : '';
    if (translation === item.translation) return item;
    return { ...item, translation, score: null };
  });
  for (let index = items.length; index < blocks.length; index += 1) {
    next.push({ id: `${prefix}${index}`, source: '', translation: blocks[index], score: null });
  }
  const changed = next.length !== items.length || next.some((item, index) => item !== items[index]);
  if (!changed) return doc;
  const updated = { ...doc, documentScore: null, [key]: next };
  if (key !== 'paragraphs') return updated;
  // The full-text box writes paragraphs; mirror each edited block onto the
  // sentences inside it so the sentence view does not go stale.
  return next.reduce((current, item, index) => (
    items[index] === item ? current : syncParagraphToSentences(current, item.id)
  ), updated);
}
