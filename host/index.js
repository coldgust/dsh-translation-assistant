/**
 * Host half of the Translation Assistant bundle.
 *
 * It owns three things:
 *  - a small JSON HTTP API used by the browser page (`/dsh-translation/api/*`),
 *  - the same operations exposed to the Agent as the `translation_assistant` tool,
 *  - model routing that follows the profile's default selection unless the
 *    plugin config pins an exact provider/model.
 *
 * The translation logic itself lives in `engine.js`, which has no Harness
 * imports and is unit-testable with a fake LLM stream.
 */

import { TranslationEngine } from './engine.js';

const API_PREFIX = '/dsh-translation/api';
/** Build marker surfaced by the health endpoint; bumped when Host behavior changes. */
const HOST_REVISION = '3';
const MAX_BODY_BYTES = 24 * 1024 * 1024;
const MAX_SEGMENTS = 400;
const MAX_SEGMENT_CHARS = 20_000;
const MAX_TOTAL_CHARS = 120_000;
const MAX_DOCUMENT_CHARS = 60_000;
const MAX_DOCUMENT_TOTAL_CHARS = 120_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const IMAGE_MEDIA_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

/**
 * Normalize the plugin config into the shape the engine and the routes use.
 * @param {unknown} config - raw Loader row config.
 * @returns {object} resolved settings.
 */
function normalizeSettings(config) {
  const raw = config && typeof config === 'object' ? config : {};
  const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
  const positiveInt = (value, fallback) => (
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
  );
  const nonNegativeInt = (value, fallback) => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback
  );
  return {
    provider: text(raw.provider),
    model: text(raw.model),
    reasoningEffort: text(raw.reasoningEffort),
    targetLanguage: text(raw.targetLanguage) ?? '中文',
    sourceLanguage: text(raw.sourceLanguage),
    maxTokens: positiveInt(raw.maxTokens, 8192),
    retranslateMaxTokens: positiveInt(raw.retranslateMaxTokens, 4096),
    scoreMaxTokens: positiveInt(raw.scoreMaxTokens, 4096),
    ocrMaxTokens: positiveInt(raw.ocrMaxTokens, 4096),
    maxRetries: nonNegativeInt(raw.maxRetries, 1),
    scoreRetries: nonNegativeInt(raw.scoreRetries, 1),
    sentenceChunk: positiveInt(raw.sentenceChunk, 16),
    paragraphChunk: positiveInt(raw.paragraphChunk, 6),
    concurrency: positiveInt(raw.concurrency, 3),
    toolEnabled: raw.tool !== false,
  };
}

/**
 * Resolve the model route for one call: explicit config first, then the
 * profile's current default model selection.
 * @param {object} ctx - Host plugin context.
 * @param {object} settings - resolved settings.
 * @returns {{ provider: string, model: string, reasoningEffort?: string } | undefined} route.
 */
function resolveTarget(ctx, settings) {
  if (settings.provider && settings.model) {
    return {
      provider: settings.provider,
      model: settings.model,
      ...(settings.reasoningEffort ? { reasoningEffort: settings.reasoningEffort } : {}),
    };
  }
  const defaults = ctx.get('agentDefaultModel');
  if (!defaults || typeof defaults.currentSelection !== 'function') return undefined;
  let selection;
  try {
    selection = defaults.currentSelection();
  } catch {
    return undefined;
  }
  if (!selection || !selection.provider || !selection.model) return undefined;
  return {
    provider: selection.provider,
    model: selection.model,
    ...(settings.reasoningEffort ? { reasoningEffort: settings.reasoningEffort } : {}),
  };
}

/**
 * Build an Error carrying an HTTP status for the route handler.
 * @param {number} status - HTTP status code.
 * @param {string} message - client-facing message.
 * @param {string} [code] - machine-readable code.
 * @returns {Error & { status: number, code?: string }} error.
 */
function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

/**
 * Serialize one JSON response.
 * @param {import('node:http').ServerResponse} response - response to write.
 * @param {number} status - HTTP status code.
 * @param {unknown} value - JSON-serializable value.
 */
function sendJson(response, status, value) {
  if (response.writableEnded) return;
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  response.end(body);
}

/**
 * Read and parse a bounded JSON request body.
 * @param {import('node:http').IncomingMessage} request - incoming request.
 * @returns {Promise<Record<string, unknown>>} parsed body object.
 */
function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let tooLarge = false;
    let settled = false;
    const chunks = [];
    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    request.on('data', (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        // Keep draining the socket so the client receives the 413 response
        // instead of a connection reset, but stop retaining the body.
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on('end', () => {
      if (settled) return;
      if (tooLarge) {
        fail(httpError(413, 'Request body is too large.'));
        return;
      }
      settled = true;
      const text = Buffer.concat(chunks).toString('utf8').trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(httpError(400, 'Request body must be a JSON object.'));
          return;
        }
        resolve(parsed);
      } catch {
        reject(httpError(400, 'Request body is not valid JSON.'));
      }
    });
    request.on('error', fail);
  });
}

/**
 * Read an optional bounded string field.
 * @param {Record<string, unknown>} body - parsed body.
 * @param {string} field - field name.
 * @param {number} maxLength - maximum character count.
 * @returns {string | undefined} trimmed value, or undefined when absent.
 */
function optionalText(body, field, maxLength) {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw httpError(400, `"${field}" must be a string.`);
  const text = value.trim();
  if (!text) return undefined;
  if (text.length > maxLength) {
    throw httpError(400, `"${field}" exceeds the ${maxLength} character limit.`);
  }
  return text;
}

/**
 * Read a required bounded string field.
 * @param {Record<string, unknown>} body - parsed body.
 * @param {string} field - field name.
 * @param {number} maxLength - maximum character count.
 * @returns {string} trimmed value.
 */
function requiredText(body, field, maxLength) {
  const value = optionalText(body, field, maxLength);
  if (!value) throw httpError(400, `"${field}" is required.`);
  return value;
}

/**
 * Read an optional language name.
 * @param {Record<string, unknown>} body - parsed body.
 * @param {string} field - field name.
 * @returns {string | undefined} language name.
 */
function optionalLanguage(body, field) {
  return optionalText(body, field, 40);
}

/**
 * Read one list of source segments, rejecting empty entries.
 * @param {Record<string, unknown>} body - parsed body.
 * @param {string} field - field name.
 * @param {number} totalBudget - shared character budget tracker.
 * @returns {string[]} trimmed segment list.
 */
function readSegments(body, field, totalBudget) {
  const value = body[field];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw httpError(400, `"${field}" must be an array of strings.`);
  if (value.length > MAX_SEGMENTS) {
    throw httpError(400, `"${field}" exceeds the ${MAX_SEGMENTS} segment limit.`);
  }
  const segments = [];
  for (const entry of value) {
    if (typeof entry !== 'string') throw httpError(400, `"${field}" must contain only strings.`);
    const segment = entry.trim();
    if (!segment) throw httpError(400, `"${field}" must not contain empty segments.`);
    if (segment.length > MAX_SEGMENT_CHARS) {
      throw httpError(400, `A segment in "${field}" exceeds the ${MAX_SEGMENT_CHARS} character limit.`);
    }
    totalBudget.chars += segment.length;
    if (totalBudget.chars > MAX_TOTAL_CHARS) {
      throw httpError(400, `The request exceeds the ${MAX_TOTAL_CHARS} character limit.`);
    }
    segments.push(segment);
  }
  return segments;
}

/**
 * Map an engine failure onto an HTTP status.
 * @param {unknown} error - thrown value.
 * @returns {number} HTTP status code.
 */
function statusForError(error) {
  if (error && typeof error === 'object' && typeof error.status === 'number') return error.status;
  if (error && error.name === 'AbortError') return 499;
  if (error && error.code === 'NO_MODEL') return 503;
  if (error && error.code === 'NO_VISION') return 422;
  if (error && typeof error.code === 'string' && error.code.startsWith('ATTACHMENT')) return 400;
  if (error && typeof error.code === 'string' && error.code.startsWith('LLM_')) return 502;
  return 502;
}

/**
 * Create the HTTP route handler serving the page's JSON API.
 * @param {object} ctx - Host plugin context.
 * @param {TranslationEngine} engine - translation engine.
 * @param {object} settings - resolved settings.
 * @returns {(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse) => Promise<void>} handler.
 */
function createHandler(ctx, engine, settings) {
  return async function handle(request, response) {
    let url;
    try {
      url = new URL(request.url ?? '/', 'http://127.0.0.1');
    } catch {
      sendJson(response, 400, { error: 'Malformed request URL.' });
      return;
    }
    const pathname = url.pathname;
    try {
      if (pathname === `${API_PREFIX}/health`) {
        if (request.method !== 'GET') {
          sendJson(response, 405, { error: 'Use GET for the health endpoint.' });
          return;
        }
        sendJson(response, 200, {
          ok: true,
          revision: HOST_REVISION,
          model: engine.modelLabel(),
          targetLanguage: settings.targetLanguage,
          features: ['translate', 'retranslate', 'score', 'score-document', 'ocr'],
        });
        return;
      }
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'Use POST for this endpoint.' });
        return;
      }
      if (pathname !== `${API_PREFIX}/translate`
        && pathname !== `${API_PREFIX}/retranslate`
        && pathname !== `${API_PREFIX}/score`
        && pathname !== `${API_PREFIX}/score-document`
        && pathname !== `${API_PREFIX}/ocr`) {
        sendJson(response, 404, { error: 'Unknown endpoint.' });
        return;
      }
      const origin = request.headers.origin;
      if (origin) {
        let expected;
        try {
          expected = ctx.webServer.getOrigin();
        } catch {
          expected = undefined;
        }
        if (expected && origin !== expected) {
          sendJson(response, 403, { error: 'Cross-origin requests are not allowed.' });
          return;
        }
      }
      const body = await readJsonBody(request);
      if (pathname === `${API_PREFIX}/translate`) {
        const budget = { chars: 0 };
        const sentences = readSegments(body, 'sentences', budget);
        const paragraphs = readSegments(body, 'paragraphs', budget);
        if (sentences.length === 0 && paragraphs.length === 0) {
          throw httpError(400, 'There is no text to translate.');
        }
        const targetLanguage = optionalLanguage(body, 'targetLanguage') ?? settings.targetLanguage;
        const sourceLanguage = optionalLanguage(body, 'sourceLanguage') ?? settings.sourceLanguage;
        const [translatedSentences, translatedParagraphs] = await Promise.all([
          sentences.length > 0
            ? engine.translateBatch({ segments: sentences, kind: 'sentence', targetLanguage, sourceLanguage })
            : [],
          paragraphs.length > 0
            ? engine.translateBatch({ segments: paragraphs, kind: 'paragraph', targetLanguage, sourceLanguage })
            : [],
        ]);
        sendJson(response, 200, {
          sentences: translatedSentences,
          paragraphs: translatedParagraphs,
          targetLanguage,
          model: engine.modelLabel(),
        });
        return;
      }
      if (pathname === `${API_PREFIX}/retranslate`) {
        const source = requiredText(body, 'source', MAX_SEGMENT_CHARS);
        const translation = optionalText(body, 'translation', MAX_SEGMENT_CHARS);
        const extraPrompt = optionalText(body, 'extraPrompt', 2_000);
        const targetLanguage = optionalLanguage(body, 'targetLanguage') ?? settings.targetLanguage;
        const sourceLanguage = optionalLanguage(body, 'sourceLanguage') ?? settings.sourceLanguage;
        const kind = body.kind === 'paragraph' ? 'paragraph' : 'sentence';
        const revised = await engine.retranslate({
          source,
          translation,
          extraPrompt,
          kind,
          targetLanguage,
          sourceLanguage,
        });
        sendJson(response, 200, { translation: revised, kind, model: engine.modelLabel() });
        return;
      }
      if (pathname === `${API_PREFIX}/score-document`) {
        const source = requiredText(body, 'source', MAX_DOCUMENT_CHARS);
        const translation = requiredText(body, 'translation', MAX_DOCUMENT_CHARS);
        if (source.length + translation.length > MAX_DOCUMENT_TOTAL_CHARS) {
          throw httpError(400, `The document exceeds the ${MAX_DOCUMENT_TOTAL_CHARS} character limit.`);
        }
        const targetLanguage = optionalLanguage(body, 'targetLanguage') ?? settings.targetLanguage;
        const sourceLanguage = optionalLanguage(body, 'sourceLanguage') ?? settings.sourceLanguage;
        const scored = await engine.scoreDocument({ source, translation, targetLanguage, sourceLanguage });
        sendJson(response, 200, { ...scored, model: engine.modelLabel() });
        return;
      }
      if (pathname === `${API_PREFIX}/ocr`) {
        const attachments = ctx.get('attachments');
        if (!attachments) {
          throw httpError(503, 'Image OCR is unavailable: the attachment service is not mounted.');
        }
        const mediaType = requiredText(body, 'mediaType', 40);
        if (!IMAGE_MEDIA_TYPES.has(mediaType)) {
          throw httpError(415, 'Unsupported image media type. Use PNG, JPEG, WebP, or GIF.');
        }
        const encoded = requiredText(body, 'data', Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 256);
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
          throw httpError(400, 'Image data is not valid base64.');
        }
        const bytes = Buffer.from(encoded, 'base64');
        if (bytes.length === 0) throw httpError(400, 'The image is empty.');
        if (bytes.length > MAX_IMAGE_BYTES) throw httpError(413, 'The image is too large.');
        const limits = attachments.imageLimits;
        if (limits && Number.isFinite(limits.maxImageBytes) && bytes.length > limits.maxImageBytes) {
          throw httpError(413, 'The image is larger than the attachment limit.');
        }
        const name = optionalText(body, 'name', 120);
        const refs = await attachments.saveImages([{
          data: bytes,
          mediaType,
          ...(name ? { name } : {}),
        }]);
        const image = refs[0];
        const text = await engine.ocr({ image });
        sendJson(response, 200, {
          text,
          model: engine.modelLabel(),
          image: { width: image.width, height: image.height, bytes: image.bytes },
        });
        return;
      }
      const source = requiredText(body, 'source', MAX_SEGMENT_CHARS);
      const translation = requiredText(body, 'translation', MAX_SEGMENT_CHARS);
      const targetLanguage = optionalLanguage(body, 'targetLanguage') ?? settings.targetLanguage;
      const sourceLanguage = optionalLanguage(body, 'sourceLanguage') ?? settings.sourceLanguage;
      const kind = body.kind === 'paragraph' ? 'paragraph' : 'sentence';
      const scored = await engine.score({
        source,
        translation,
        kind,
        targetLanguage,
        sourceLanguage,
      });
      sendJson(response, 200, { ...scored, kind, model: engine.modelLabel() });
    } catch (error) {
      const status = statusForError(error);
      if (status >= 500) {
        console.error('[translation-assistant] API request failed:', error && error.stack ? error.stack : error);
      }
      const payload = {
        error: error && error.message ? String(error.message) : 'The translation service failed.',
      };
      if (error && typeof error.code === 'string') payload.code = error.code;
      if (error && typeof error.detail === 'string') payload.detail = error.detail;
      sendJson(response, status, payload);
    }
  };
}

/**
 * Create the Agent-facing `translation_assistant` tool definition.
 * @param {TranslationEngine} engine - translation engine.
 * @param {object} settings - resolved settings.
 * @returns {object} ToolDefinition.
 */
function createTool(engine, settings) {
  return {
    name: 'translation_assistant',
    description: [
      'Translate, retranslate, or score text with the same engine behind the Translation Assistant panel.',
      'action=translate returns the translation of the given text into targetLanguage;',
      'action=retranslate returns an improved translation of one sentence or paragraph, optionally following extraPrompt;',
      'action=score returns a 0-100 quality score and a one-sentence comment for an existing translation;',
      'action=score_document scores a whole translated document (text = full source, translation = full translated document).',
    ].join(' '),
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        action: {
          type: 'string',
          enum: ['translate', 'retranslate', 'score', 'score_document'],
          description: 'Operation to perform.',
        },
        text: {
          type: 'string',
          description: 'Source text to translate, or the single source sentence/paragraph for retranslate and score.',
        },
        translation: {
          type: 'string',
          description: 'Existing translation. Required for score; optional reference for retranslate.',
        },
        targetLanguage: {
          type: 'string',
          description: 'Target language name, for example 中文, English, or 日本語. Defaults to the plugin config target.',
        },
        sourceLanguage: {
          type: 'string',
          description: 'Source language name. Omit to let the engine detect it.',
        },
        extraPrompt: {
          type: 'string',
          description: 'Extra instruction applied only by retranslate, for example "more colloquial" or "keep the legal terminology".',
        },
      },
      required: ['action', 'text'],
    },
    output: {
      schema: { type: 'object', properties: {} },
      render: (_args, value) => [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    },
    isConcurrencySafe: () => true,
    timeoutMs: 180_000,
    async execute(args, run) {
      const input = args && typeof args === 'object' ? args : {};
      const action = input.action;
      const text = typeof input.text === 'string' ? input.text.trim() : '';
      if (!action) throw new Error('"action" is required.');
      if (!text) throw new Error('"text" is required.');
      const targetLanguage = typeof input.targetLanguage === 'string' && input.targetLanguage.trim()
        ? input.targetLanguage.trim()
        : settings.targetLanguage;
      const sourceLanguage = typeof input.sourceLanguage === 'string' && input.sourceLanguage.trim()
        ? input.sourceLanguage.trim()
        : settings.sourceLanguage;
      const signal = run && run.signal ? run.signal : undefined;
      if (action === 'translate') {
        const [translation] = await engine.translateBatch({
          segments: [text],
          kind: 'paragraph',
          targetLanguage,
          sourceLanguage,
          signal,
        });
        return { action, targetLanguage, translation };
      }
      if (action === 'retranslate') {
        const translation = typeof input.translation === 'string' && input.translation.trim()
          ? input.translation.trim()
          : undefined;
        const extraPrompt = typeof input.extraPrompt === 'string' && input.extraPrompt.trim()
          ? input.extraPrompt.trim()
          : undefined;
        const revised = await engine.retranslate({
          source: text,
          translation,
          extraPrompt,
          kind: 'paragraph',
          targetLanguage,
          sourceLanguage,
          signal,
        });
        return { action, targetLanguage, translation: revised };
      }
      if (action === 'score') {
        const translation = typeof input.translation === 'string' ? input.translation.trim() : '';
        if (!translation) throw new Error('"translation" is required for action=score.');
        const scored = await engine.score({
          source: text,
          translation,
          kind: 'paragraph',
          targetLanguage,
          sourceLanguage,
          signal,
        });
        return { action, targetLanguage, ...scored };
      }
      if (action === 'score_document') {
        const translation = typeof input.translation === 'string' ? input.translation.trim() : '';
        if (!translation) throw new Error('"translation" is required for action=score_document.');
        const scored = await engine.scoreDocument({
          source: text,
          translation,
          targetLanguage,
          sourceLanguage,
          signal,
        });
        return { action, targetLanguage, ...scored };
      }
      throw new Error(`Unsupported action: ${String(action)}`);
    },
  };
}

/** Services the Host half cannot work without. */
export const inject = ['llm', 'webServer'];

/**
 * Activate the Host half: register the HTTP API route and the Agent tool.
 * @param {object} ctx - Host plugin context.
 * @param {unknown} [config] - raw plugin config.
 */
export function apply(ctx, config) {
  const settings = normalizeSettings(config);
  const engine = new TranslationEngine({
    llm: ctx.llm,
    settings,
    resolveTarget: () => resolveTarget(ctx, settings),
  });

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler: createHandler(ctx, engine, settings),
  }), 'translation-assistant: http api');

  const tools = ctx.get('tools');
  if (tools && settings.toolEnabled) {
    ctx.effect(() => tools.register(createTool(engine, settings)), 'translation-assistant: agent tool');
  }
}
