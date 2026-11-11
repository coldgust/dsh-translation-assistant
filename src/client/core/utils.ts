// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
import { API } from '../constants.ts';
    export function cx(...values) {
      return values.filter(Boolean).join(' ');
    }

    /**
     * Read a JSON value from localStorage.
     * @param {string} key - storage key.
     * @param {unknown} fallback - value when missing or unreadable.
     * @returns {unknown} parsed value.
     */
    export function readStorage(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    }

    /**
     * Write a JSON value to localStorage; `null` removes the key.
     * @param {string} key - storage key.
     * @param {unknown} value - value to store.
     */
    export function writeStorage(key, value) {
      try {
        if (value === null || value === undefined) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage can be full or disabled; the page keeps working in memory.
      }
    }


    export async function requestJson(action, payload, options = {}) {
      const signal = options && options.signal;
      let response;
      try {
        response = await fetch(`${API}/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(payload),
          ...(signal ? { signal } : {}),
        });
      } catch (error) {
        if ((signal && signal.aborted) || (error && error.name === 'AbortError')) throw abortedError();
        const network = new Error('network');
        network.code = 'NETWORK';
        throw network;
      }
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        if (data && typeof data.code === 'string') error.code = data.code;
        throw error;
      }
      if (!data || typeof data !== 'object') throw new Error('invalid-response');
      return data;
    }

    /**
     * Create an error whose message is already localized for this page.
     * @param {string} message - localized message.
     * @returns {Error} error carrying the `LOCAL` code.
     */
    export function localError(message) {
      const error = new Error(message);
      error.code = 'LOCAL';
      return error;
    }

    /**
     * Create the error a stopped pass unwinds with. Callers turn it into a
     * quiet "stopped" notice instead of a failure report.
     * @returns {Error} error carrying the `ABORTED` code.
     */
    export function abortedError() {
      const error = new Error('aborted');
      error.code = 'ABORTED';
      return error;
    }

    /**
     * Turn an error into a localized message.
     * @param {unknown} error - thrown value.
     * @param {(key: string, vars?: object) => string} t - translator.
     * @returns {string} message.
     */
    export function describeError(error, t) {
      if (!error) return t('requestFailed');
      if (error.code === 'LOCAL') return error.message;
      if (error.code === 'NETWORK') return t('networkError');
      const status = Number(error.status);
      if (status === 400) return t('invalidRequest');
      if (status === 413) return t('tooLarge');
      if (status === 415) return t('imageTypeError');
      if (status === 422) return t('noVision');
      if (status === 503) return t('noModelAvailable');
      if (status === 502) return t('engineFailed');
      if (Number.isFinite(status) && status > 0) return t('requestRejected');
      // Locally produced validation errors are already localized; anything else
      // (for example an unparsable response) falls back to a generic message.
      if (typeof error.message === 'string' && /[\u3400-\u9fff]/.test(error.message)) return error.message;
      return t('requestFailed');
    }

    /**
     * Interpolate `{name}` placeholders in a translated string.
     * @param {string} template - localized template.
     * @param {Record<string, string | number>} vars - values.
     * @returns {string} interpolated text.
     */
    export function format(template, vars) {
      return String(template).replace(/\{(\w+)\}/g, (whole, name) => (
        Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole
      ));
    }

    /**
     * Run `worker` over `items` with bounded concurrency, preserving order.
     * @template T, R
     * @param {readonly T[]} items - work items.
     * @param {number} limit - maximum concurrency.
     * @param {(item: T, index: number) => Promise<R>} worker - async worker.
     * @returns {Promise<R[]>} results.
     */
    export async function mapLimit(items, limit, worker) {
      const list = Array.isArray(items) ? items : [];
      const results = new Array(list.length);
      let cursor = 0;
      const width = Math.max(1, Math.min(limit, list.length || 1));
      await Promise.all(Array.from({ length: width }, async () => {
        for (;;) {
          const index = cursor;
          cursor += 1;
          if (index >= list.length) return;
          results[index] = await worker(list[index], index);
        }
      }));
      return results;
    }

    /**
     * Choose a score tone for styling.
     * @param {number} value - score 0-100.
     * @returns {'good' | 'ok' | 'bad'} tone.
     */
    export function scoreTone(value) {
      if (value >= 85) return 'good';
      if (value >= 70) return 'ok';
      return 'bad';
    }

    /**
     * Suggest a textarea row count from its content length. Browsers that
     * support `field-sizing: content` size the box from the text itself, so
     * this is only the fallback used before that style applies.
     * @param {string} text - current translation.
     * @returns {number} row count between 2 and 14.
     */
    export function rowsFor(text) {
      const length = String(text || '').length;
      return Math.min(14, Math.max(2, Math.ceil(length / 40) + 1));
    }
