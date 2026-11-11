// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
import { HISTORY_STORAGE, MAX_HISTORY_CHARS, MAX_HISTORY_ENTRIES, MAX_VERSIONS, MAX_VERSION_CHARS, VERSION_KINDS } from '../constants.ts';
import { normalizeDoc } from './document.ts';
import { readStorage } from './utils.ts';
import * as React from 'react';
const h = React.createElement;

    export function newEntryId() {
      return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    /**
     * Wrap a document as a brand-new history entry.
     * @param {object} doc - normalized document.
     * @param {number} [now] - timestamp in ms.
     * @returns {{ id: string, createdAt: number, updatedAt: number, doc: object }} entry.
     */
    export function makeEntry(doc, now = Date.now()) {
      return {
        id: newEntryId(),
        createdAt: now,
        updatedAt: now,
        pinned: false,
        doc,
        // The machine translation itself is the baseline a document can always
        // be rolled back to.
        versions: [makeVersion(doc, 'initial', now)],
      };
    }

    /**
     * Order entries the way the drawer lists them: pinned first, then the most
     * recently used.
     * @param {object[]} entries - history entries.
     * @returns {object[]} sorted copy.
     */
    export function sortEntries(entries) {
      return [...entries].sort((left, right) => {
        const pinned = (right.pinned ? 1 : 0) - (left.pinned ? 1 : 0);
        return pinned !== 0 ? pinned : right.updatedAt - left.updatedAt;
      });
    }

    /**
     * Normalize one stored history entry, dropping entries without a document.
     * @param {unknown} value - stored entry.
     * @returns {{ id: string, createdAt: number, updatedAt: number, doc: object } | null} entry.
     */
    export function normalizeEntry(value) {
      if (!value || typeof value !== 'object') return null;
      const doc = normalizeDoc(value.doc);
      if (!doc) return null;
      const createdAt = Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : Date.now();
      return {
        id: typeof value.id === 'string' && value.id ? value.id : newEntryId(),
        createdAt,
        updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : createdAt,
        pinned: value.pinned === true,
        doc,
        // Entries saved before revisions existed simply start with none.
        versions: Array.isArray(value.versions)
          ? trimVersions(value.versions.map(normalizeVersion).filter(Boolean))
          : [],
      };
    }

    /**
     * Read the stored history, newest first.
     * @returns {object[]} history entries.
     */
    export function readHistory() {
      const stored = readStorage(HISTORY_STORAGE, null);
      if (!Array.isArray(stored)) return [];
      // Trim on boot too, so a list saved by an older, larger cap shrinks.
      return trimHistory(stored.map(normalizeEntry).filter(Boolean));
    }

    /**
     * Estimate how much storage one document costs.
     * @param {object} doc - document.
     * @returns {number} character estimate.
     */
    export function docSize(doc) {
      if (!doc) return 0;
      let size = String(doc.sourceText || '').length;
      for (const item of doc.sentences) size += item.source.length + item.translation.length;
      for (const item of doc.paragraphs) size += item.source.length + item.translation.length;
      return size;
    }

    /**
     * Keep the newest entries within the count and character budget. Pinned
     * entries are ordered first, so an over-long history drops old unpinned
     * documents before it touches anything the user pinned.
     * @param {object[]} entries - candidate entries.
     * @param {string | null} [keepId] - entry that must survive the trim.
     * @returns {object[]} trimmed entries, pinned first and then newest first.
     */
    export function trimHistory(entries, keepId = null) {
      const ordered = sortEntries(entries);
      const kept = [];
      let used = 0;
      // The document being edited is placed first and exempt from the budget,
      // so growing its revisions can never delete the document under the user.
      const protectedEntry = keepId ? ordered.find((entry) => entry.id === keepId) : null;
      if (protectedEntry) {
        kept.push(protectedEntry);
        used = docSize(protectedEntry.doc) + versionsSize(protectedEntry.versions);
      }
      for (const entry of ordered) {
        if (protectedEntry && entry === protectedEntry) continue;
        if (kept.length >= MAX_HISTORY_ENTRIES) break;
        // Revisions count against the same budget, otherwise a few documented
        // rollbacks could push the list past the storage quota.
        const size = docSize(entry.doc) + versionsSize(entry.versions);
        if (kept.length > 0 && used + size > MAX_HISTORY_CHARS) break;
        kept.push(entry);
        used += size;
      }
      return kept;
    }

    /** Build a short, collision-resistant id for a revision snapshot. */
    export function newVersionId() {
      return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    /**
     * Copy a document as a revision snapshot. Segments are replaced instead of
     * mutated, so sharing their objects is safe; the arrays are copied so a
     * later edit cannot reach into the snapshot.
     * @param {object} doc - document to freeze.
     * @param {string} [kind] - what created the snapshot.
     * @param {number} [now] - timestamp in ms.
     * @returns {{ id: string, at: number, kind: string, doc: object }} snapshot.
     */
    export function makeVersion(doc, kind = 'manual', now = Date.now()) {
      return {
        id: newVersionId(),
        at: now,
        kind: VERSION_KINDS.includes(kind) ? kind : 'manual',
        doc: {
          ...doc,
          sentences: [...(doc.sentences || [])],
          paragraphs: [...(doc.paragraphs || [])],
        },
      };
    }

    /**
     * Normalize one stored snapshot, dropping snapshots without a document.
     * @param {unknown} value - stored snapshot.
     * @returns {{ id: string, at: number, kind: string, doc: object } | null} snapshot.
     */
    export function normalizeVersion(value) {
      if (!value || typeof value !== 'object') return null;
      const doc = normalizeDoc(value.doc);
      if (!doc) return null;
      return {
        id: typeof value.id === 'string' && value.id ? value.id : newVersionId(),
        at: Number.isFinite(Number(value.at)) ? Number(value.at) : Date.now(),
        kind: VERSION_KINDS.includes(value.kind) ? value.kind : 'manual',
        doc,
      };
    }

    /**
     * Estimate the storage one document's revisions cost.
     * @param {object[] | undefined} versions - snapshots.
     * @returns {number} character estimate.
     */
    export function versionsSize(versions) {
      if (!Array.isArray(versions)) return 0;
      return versions.reduce((total, version) => total + docSize(version.doc), 0);
    }

    /**
     * Keep the newest snapshots within the per-document count and size budget.
     * The newest one is always kept, so the baseline never disappears.
     * @param {object[]} versions - snapshots, newest first.
     * @returns {object[]} trimmed snapshots.
     */
    export function trimVersions(versions) {
      const kept = [];
      let used = 0;
      for (const version of versions) {
        if (kept.length >= MAX_VERSIONS) break;
        const size = docSize(version.doc);
        if (kept.length > 0 && used + size > MAX_VERSION_CHARS) break;
        kept.push(version);
        used += size;
      }
      return kept;
    }

    /**
     * Count how many segments translate differently between two documents of
     * the same entry. Paragraphs are the canonical text once they carry a
     * translation, since the full-text view is built from them.
     * @param {object | null} left - document.
     * @param {object | null} right - document.
     * @returns {number} differing segment count.
     */
    export function versionDiffCount(left, right) {
      if (!left || !right) return 0;
      const key = right.paragraphs.some((item) => item.translation.trim()) ? 'paragraphs' : 'sentences';
      const before = new Map((left[key] || []).map((item) => [item.id, item.translation.trim()]));
      const after = new Map((right[key] || []).map((item) => [item.id, item.translation.trim()]));
      let count = 0;
      for (const id of new Set([...before.keys(), ...after.keys()])) {
        if ((before.get(id) || '') !== (after.get(id) || '')) count += 1;
      }
      return count;
    }

    /**
     * Add a snapshot, newest first. A snapshot whose translations match the
     * newest one only refreshes its timestamp instead of stacking a duplicate,
     * and keeps the original label so a baseline is not renamed by a later pass.
     * @param {object[] | undefined} versions - existing snapshots.
     * @param {object} version - snapshot to add.
     * @returns {object[]} updated snapshots.
     */
    export function addVersion(versions, version) {
      const list = Array.isArray(versions) ? versions : [];
      const newest = list[0];
      if (newest && versionDiffCount(newest.doc, version.doc) === 0) {
        return [{ ...newest, at: version.at }, ...list.slice(1)];
      }
      return trimVersions([version, ...list]);
    }

    /**
     * Localized name of a snapshot's origin.
     * @param {string} kind - snapshot kind.
     * @param {(key: string) => string} t - translator.
     * @returns {string} label.
     */
    export function versionLabel(kind, t) {
      const key = `versionLabel${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
      return t(key);
    }

    /**
     * The opening words of a document's translation, used as a row preview.
     * @param {object} doc - document.
     * @param {number} [max] - character budget.
     * @returns {string} preview, or an empty string without a translation.
     */
    export function translationHead(doc, max = 96) {
      if (!doc) return '';
      const collection = doc.paragraphs.some((item) => item.translation.trim())
        ? doc.paragraphs
        : doc.sentences;
      const text = collection
        .map((item) => item.translation.trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!text) return '';
      return text.length > max ? `${text.slice(0, max)}…` : text;
    }

    /** @param {number} value - number. @returns {string} two-digit string. */
    export function pad2(value) {
      return String(value).padStart(2, '0');
    }

    /**
     * The text a history entry is searched through and quoted from: the source
     * followed by the full translation.
     * @param {object} entry - history entry.
     * @returns {string} searchable document text.
     */
    export function historySearchText(entry) {
      const doc = entry.doc;
      const translated = doc.paragraphs.some((item) => item.translation.trim())
        ? doc.paragraphs
        : doc.sentences;
      const sources = doc.sourceText
        || [...doc.paragraphs, ...doc.sentences].map((item) => item.source).join('\n');
      const translations = translated.map((item) => item.translation).filter(Boolean).join('\n');
      return [sources, translations].filter(Boolean).join('\n');
    }

    /**
     * Cut a short excerpt around the best keyword hit, so a search result shows
     * where the match actually is instead of only the document's first line.
     * @param {string} text - document text.
     * @param {string} lower - lowercased document text.
     * @param {string[]} keywords - lowercase keywords.
     * @param {number} [before] - characters of leading context.
     * @param {number} [after] - characters of trailing context.
     * @returns {string | null} excerpt, or null when nothing matches.
     */
    export function snippetAround(text, lower, keywords, before = 18, after = 90) {
      const hits = [];
      for (const word of keywords) {
        const at = lower.indexOf(word);
        if (at >= 0) hits.push({ at, length: word.length });
      }
      if (hits.length === 0) return null;
      // Prefer the window that covers the largest number of keywords.
      let best = hits[0];
      let bestScore = -1;
      for (const hit of hits) {
        const start = Math.max(0, hit.at - before);
        const end = Math.min(text.length, hit.at + hit.length + after);
        const score = hits.filter((other) => other.at >= start && other.at < end).length;
        if (score > bestScore) {
          best = hit;
          bestScore = score;
        }
      }
      const start = Math.max(0, best.at - before);
      const end = Math.min(text.length, best.at + best.length + after);
      const body = text.slice(start, end).replace(/\s+/g, ' ').trim();
      if (!body) return null;
      return `${start > 0 ? '…' : ''}${body}${end < text.length ? '…' : ''}`;
    }

    /**
     * Split text into plain runs and highlighted `<mark>` runs.
     * @param {string} text - text to render.
     * @param {string[]} keywords - lowercase keywords.
     * @returns {string | Array<string | object>} renderable text.
     */
    export function highlightText(text, keywords) {
      if (!text || keywords.length === 0) return text;
      const lower = text.toLowerCase();
      const ranges = [];
      for (const word of keywords) {
        let from = 0;
        while (from < lower.length) {
          const at = lower.indexOf(word, from);
          if (at < 0) break;
          ranges.push([at, at + word.length]);
          from = at + Math.max(1, word.length);
        }
      }
      if (ranges.length === 0) return text;
      ranges.sort((left, right) => left[0] - right[0]);
      const merged = [];
      for (const range of ranges) {
        const last = merged[merged.length - 1];
        if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
        else merged.push([range[0], range[1]]);
      }
      const parts = [];
      let cursor = 0;
      for (const [start, end] of merged) {
        if (start > cursor) parts.push(text.slice(cursor, start));
        parts.push(h('mark', { className: 'dta-hl', key: `${start}-${end}` }, text.slice(start, end)));
        cursor = end;
      }
      if (cursor < text.length) parts.push(text.slice(cursor));
      return parts;
    }

    /**
     * Split a search query into lowercase keywords; all of them must match.
     * @param {string} query - raw query.
     * @returns {string[]} keywords.
     */
    export function searchKeywords(query) {
      return String(query || '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
    }

    /**
     * Format a history timestamp for the list.
     * @param {number} value - timestamp in ms.
     * @param {(key: string) => string} t - translator.
     * @returns {string} localized stamp.
     */
    export function formatStamp(value, t) {
      const time = Number(value);
      if (!Number.isFinite(time)) return '';
      const date = new Date(time);
      if (Number.isNaN(date.getTime())) return '';
      const now = new Date();
      const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
      const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
      if (sameDay) return clock;
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const isYesterday = date.getFullYear() === yesterday.getFullYear()
        && date.getMonth() === yesterday.getMonth()
        && date.getDate() === yesterday.getDate();
      if (isYesterday) return `${t('yesterday')} ${clock}`;
      const day = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${clock}`;
      return date.getFullYear() === now.getFullYear() ? day : `${date.getFullYear()}-${day}`;
    }

    /**
     * Derive a readable title from a document's first source line.
     * @param {object | null} doc - document.
     * @param {(key: string) => string} t - translator.
     * @returns {string} title.
     */
    export function entryTitle(doc, t) {
      const source = doc && typeof doc.sourceText === 'string' ? doc.sourceText : '';
      const first = source
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)[0] || '';
      const head = first.replace(/\s+/g, ' ');
      if (!head) return t('untitled');
      return head.length > 80 ? `${head.slice(0, 80)}…` : head;
    }

    /**
     * Call one JSON endpoint of the Host half.
     * @param {string} action - endpoint name.
     * @param {object} payload - JSON request body.
     * @param {{ signal?: AbortSignal }} [options] - abort signal for the pass.
     * @returns {Promise<object>} parsed response.
     */
