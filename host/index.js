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
import { createWorkspaceService } from './workspace.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_PREFIX = '/dsh-translation/api';
/** Build marker surfaced by the health endpoint; bumped when Host behavior changes. */
const HOST_REVISION = '10';
const MAX_BODY_BYTES = 24 * 1024 * 1024;
const MAX_SEGMENTS = 400;
const MAX_SEGMENT_CHARS = 20_000;
const MAX_TOTAL_CHARS = 120_000;
const MAX_DOCUMENT_CHARS = 60_000;
const MAX_DOCUMENT_TOTAL_CHARS = 120_000;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_MODEL_NAME_CHARS = 120;
/** How long a discovered model list is reused before the service is asked again. */
const MODEL_CACHE_MS = 60_000;
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
    // A hand-written list the page can offer when the Host cannot enumerate
    // models itself; merged with whatever discovery finds.
    models: Array.isArray(raw.models) ? raw.models : [],
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
  const selection = readDefaultSelection(ctx);
  if (!selection) return undefined;
  return {
    provider: selection.provider,
    model: selection.model,
    ...(settings.reasoningEffort ? { reasoningEffort: settings.reasoningEffort } : {}),
  };
}

/**
 * Read the profile's default model selection without trusting the service to
 * be mounted or well-behaved.
 * @param {object} ctx - Host plugin context.
 * @returns {{ provider: string, model: string } | undefined} selection.
 */
function readDefaultSelection(ctx) {
  let defaults;
  try {
    defaults = ctx.get('agentDefaultModel');
  } catch {
    return undefined;
  }
  if (!defaults || typeof defaults.currentSelection !== 'function') return undefined;
  let selection;
  try {
    selection = defaults.currentSelection();
  } catch {
    return undefined;
  }
  if (!selection || !selection.provider || !selection.model) return undefined;
  return { provider: String(selection.provider), model: String(selection.model) };
}

/**
 * Normalize one model descriptor from any of the shapes the Host services use.
 * @param {unknown} value - `"provider/model"`, `{ provider, model }`, or `{ providerId, modelId }`.
 * @param {string} [providerHint] - provider to assume when the value omits it.
 * @returns {{ provider: string, model: string, label?: string, reasoningEffort?: string } | null} entry.
 */
function normalizeModelEntry(value, providerHint) {
  if (typeof value === 'string') {
    const text = value.trim();
    const slash = text.indexOf('/');
    if (slash <= 0 || slash === text.length - 1) {
      return providerHint && text ? normalizeModelEntry({ provider: providerHint, model: text }) : null;
    }
    return normalizeModelEntry({ provider: text.slice(0, slash), model: text.slice(slash + 1) });
  }
  if (!value || typeof value !== 'object') return null;
  const pick = (...names) => {
    for (const name of names) {
      const raw = value[name];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
    }
    return '';
  };
  const provider = pick('provider', 'providerId', 'providerName') || (providerHint ?? '');
  const model = pick('model', 'modelId', 'id');
  if (!provider || !model) return null;
  if (provider.length > MAX_MODEL_NAME_CHARS || model.length > MAX_MODEL_NAME_CHARS) return null;
  const label = pick('label', 'displayName', 'title', 'name');
  const reasoningEffort = pick('reasoningEffort');
  return {
    provider,
    model,
    ...(label ? { label } : {}),
    ...(reasoningEffort ? { reasoningEffort } : {}),
  };
}

/**
 * Flatten one catalog-ish payload into model entries. Accepts an array of
 * models, an array of providers that each carry `models`, or a single entry.
 * @param {unknown} value - payload returned by a Host service.
 * @param {string} [providerHint] - provider inherited from the parent object.
 * @param {object[]} out - accumulator.
 */
function collectModelEntries(value, providerHint, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectModelEntries(item, providerHint, out);
    return;
  }
  if (!value || typeof value !== 'object') {
    const single = normalizeModelEntry(value, providerHint);
    if (single) out.push(single);
    return;
  }
  if (Array.isArray(value.models)) {
    const provider = providerHint
      || (typeof value.provider === 'string' && value.provider)
      || (typeof value.providerId === 'string' && value.providerId)
      || (typeof value.id === 'string' && value.id)
      || (typeof value.name === 'string' && value.name)
      || undefined;
    for (const item of value.models) {
      const entry = normalizeModelEntry(item, provider);
      if (entry) out.push(entry);
    }
    return;
  }
  const single = normalizeModelEntry(value, providerHint);
  if (single) out.push(single);
}

/**
 * Ask one service for its model list, trying the method names these services
 * have used across Host versions.
 * @param {unknown} source - service instance.
 * @param {string[]} methods - candidate method names, in preference order.
 * @returns {Promise<object[]>} normalized entries, empty when nothing answers.
 */
async function readModelSource(source, methods) {
  if (!source || (typeof source !== 'object' && typeof source !== 'function')) return [];
  for (const method of methods) {
    let fn;
    try {
      fn = source[method];
    } catch {
      continue;
    }
    if (typeof fn !== 'function') continue;
    let value;
    try {
      value = await fn.call(source);
    } catch {
      continue;
    }
    const entries = [];
    collectModelEntries(value, undefined, entries);
    if (entries.length > 0) return entries;
  }
  return [];
}

/**
 * Enumerate the models the Host's own LLM registry can route to.
 *
 * This is the documented path (`@deepseek-ai/dsh-llm`): `listProviders()`
 * names the registered routes and `listModels(providerId)` asks each adapter
 * for the models it serves. `listModels` takes a provider id — calling it
 * without one throws, which is why the generic service probe below cannot
 * discover anything on its own. One failing provider must not hide the rest,
 * so every route is isolated and its diagnostic is reported separately.
 * @param {object} ctx - Host plugin context.
 * @returns {Promise<{ entries: object[], failures: { provider: string, message: string }[] }>} catalog.
 */
async function readAdapterCatalog(ctx) {
  const empty = { entries: [], failures: [] };
  const llm = ctx && ctx.llm;
  if (!llm || typeof llm.listProviders !== 'function' || typeof llm.listModels !== 'function') return empty;
  let providers;
  try {
    providers = llm.listProviders();
  } catch {
    return empty;
  }
  if (!Array.isArray(providers)) return empty;
  const entries = [];
  const failures = [];
  for (const provider of providers) {
    const providerId = provider && typeof provider.id === 'string' ? provider.id.trim() : '';
    if (!providerId) continue;
    let models;
    try {
      models = await llm.listModels(providerId);
    } catch (error) {
      // A provider with an expired credential or an unreachable listing
      // endpoint contributes no candidates; keep the failure for the tooltip
      // so an empty picker is diagnosable instead of mysterious.
      failures.push({
        provider: providerId,
        message: error && error.message ? String(error.message) : 'model listing failed',
      });
      continue;
    }
    if (!Array.isArray(models)) continue;
    const providerLabel = typeof provider.name === 'string' && provider.name.trim() ? provider.name.trim() : '';
    for (const model of models) {
      if (!model || typeof model !== 'object') continue;
      const id = typeof model.id === 'string' ? model.id.trim() : '';
      if (!id) continue;
      const entry = normalizeModelEntry({ provider: providerId, model: id, name: model.name });
      if (!entry) continue;
      entries.push(providerLabel ? { ...entry, providerLabel } : entry);
    }
  }
  return { entries, failures };
}

/** Service names that may own a model catalog, in preference order. */
const MODEL_SERVICES = ['modelCatalog', 'agentModels', 'providers', 'models'];
/** Method names such a service may expose, in preference order. */
const MODEL_METHODS = ['listModels', 'list', 'options', 'available', 'candidates', 'getModels', 'all'];

/**
 * Build the switchable model list: the plugin config, the models the Host's
 * LLM registry advertises, whatever an older catalog service exposes, plus the
 * routes that are currently in use. Discovery is best-effort — a missing or
 * failing service must never break translation.
 * @param {object} ctx - Host plugin context.
 * @param {object} settings - resolved settings.
 * @returns {Promise<{ models: object[], failures: { provider: string, message: string }[] }>} catalog.
 */
async function discoverModels(ctx, settings) {
  const entries = [];
  const seen = new Set();
  const add = (entry) => {
    if (!entry) return;
    const key = `${entry.provider}/${entry.model}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };
  // A hand-written config list wins, so a deployment can annotate or pin the
  // routes it cares about even when the registry advertises more.
  for (const entry of settings.models) add(normalizeModelEntry(entry));
  const registry = await readAdapterCatalog(ctx);
  for (const entry of registry.entries) add(entry);
  if (entries.length === 0) {
    // Older or alternative Hosts expose a catalog service instead of, or in
    // addition to, the LLM registry. Only pay for the probes when the
    // documented path found nothing.
    for (const name of MODEL_SERVICES) {
      let service;
      try {
        service = ctx.get(name);
      } catch {
        service = undefined;
      }
      if (!service) continue;
      for (const entry of await readModelSource(service, MODEL_METHODS)) add(entry);
    }
    for (const entry of await readModelSource(ctx.llm, ['listModels', 'models'])) add(entry);
  }
  // The routes in use always belong in the list, even when discovery found
  // nothing: they are what the page can honestly offer.
  add(resolveTarget(ctx, settings));
  add(readDefaultSelection(ctx));
  return { models: entries, failures: registry.failures };
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

/** Largest guideline text one model request may carry. */
const MAX_SPEC_CHARS = 320 * 1024;

/**
 * Read the optional workspace guideline text a page request carries.
 * @param {Record<string, unknown>} body - parsed body.
 * @returns {string | undefined} guideline text, or undefined when absent.
 */
function readSpecField(body) {
  const text = body && typeof body.spec === 'string' ? body.spec.trim() : '';
  if (!text) return undefined;
  if (text.length > MAX_SPEC_CHARS) {
    throw httpError(400, `The guidelines exceed the ${Math.round(MAX_SPEC_CHARS / 1024)} KB limit.`);
  }
  return text;
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
 * Read the optional per-request model override and check it against the
 * catalog the health endpoint advertises.
 * @param {Record<string, unknown>} body - parsed body.
 * @param {object[]} models - catalog entries.
 * @returns {{ provider: string, model: string, reasoningEffort?: string } | undefined} route.
 */
function readRoute(body, models) {
  const raw = body.route;
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw httpError(400, '"route" must be an object with provider and model.', 'BAD_ROUTE');
  }
  const provider = typeof raw.provider === 'string' ? raw.provider.trim() : '';
  const model = typeof raw.model === 'string' ? raw.model.trim() : '';
  if (!provider || !model) throw httpError(400, '"route" needs both provider and model.', 'BAD_ROUTE');
  if (provider.length > MAX_MODEL_NAME_CHARS || model.length > MAX_MODEL_NAME_CHARS) {
    throw httpError(400, '"route" is too long.', 'BAD_ROUTE');
  }
  const match = models.find((entry) => entry.provider === provider && entry.model === model);
  // An empty catalog means discovery found nothing; accept the shape and let
  // the model service be the judge instead of failing every request.
  if (models.length > 0 && !match) {
    throw httpError(
      400,
      'The selected model is no longer available. Reload the page and pick another one.',
      'UNKNOWN_ROUTE',
    );
  }
  return {
    provider,
    model,
    ...(match && match.reasoningEffort ? { reasoningEffort: match.reasoningEffort } : {}),
  };
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
 * @param {() => Promise<object[]>} catalog - model list provider.
 * @returns {(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse) => Promise<void>} handler.
 */
function createHandler(ctx, engine, settings, catalog) {
  // One service per handler is fine: it holds no state beyond the injected
  // filesystem, and every call re-validates its paths.
  const workspace = createWorkspaceService(fs, path);
  // The Harness workspace registry (`ctx.workspaceRegistry`) lists the
  // projects the user added in the app. When it is mounted, plugin workspace
  // roots must come from it; when it is missing (slim compositions such as
  // `dsh web`), the endpoints keep their legacy behavior as a fallback.
  const readWorkspaceRegistry = () => {
    // `ctx.get()` reads the host service store without an inject declaration
    // and without making the service a mandatory dependency; the property
    // form would throw for a plugin that does not declare `inject`.
    let registry;
    try {
      registry = typeof ctx.get === 'function' ? ctx.get('workspaceRegistry') : ctx.workspaceRegistry;
    } catch {
      registry = undefined;
    }
    if (!registry || typeof registry.list !== 'function') {
      return { available: false, workspaces: [] };
    }
    try {
      const workspaces = (registry.list() ?? [])
        .map((entry) => ({
          id: String(entry.id ?? ''),
          title: String(entry.title ?? ''),
          path: String(entry.path ?? ''),
        }))
        .filter((entry) => entry.id && entry.path);
      return { available: true, workspaces };
    } catch {
      return { available: false, workspaces: [] };
    }
  };
  const assertWorkspaceRoot = (root) => {
    const registry = readWorkspaceRegistry();
    if (!registry.available) return;
    if (typeof root !== 'string' || !registry.workspaces.some((entry) => entry.path === root)) {
      const error = new Error('Root is not a registered Harness workspace.');
      error.status = 403;
      error.code = 'WORKSPACE_NOT_REGISTERED';
      throw error;
    }
  };
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
        let models = [];
        let failures = [];
        try {
          const found = await catalog();
          models = found.models;
          failures = found.failures;
        } catch {
          models = [];
          failures = [];
        }
        // The profile's own default, reported separately from the route in
        // use: the page labels “follow the default” with it even after the
        // user picks another model.
        const fallback = readDefaultSelection(ctx);
        sendJson(response, 200, {
          ok: true,
          revision: HOST_REVISION,
          model: engine.modelLabel(),
          default: fallback ? { provider: fallback.provider, model: fallback.model } : null,
          models: models.map((entry) => ({
            provider: entry.provider,
            model: entry.model,
            ...(entry.label ? { label: entry.label } : {}),
            ...(entry.providerLabel ? { providerLabel: entry.providerLabel } : {}),
          })),
          modelFailures: failures,
          targetLanguage: settings.targetLanguage,
          features: ['translate', 'retranslate', 'score', 'score-document', 'ocr', 'models', 'workspace', 'workspace-spec'],
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
        && pathname !== `${API_PREFIX}/ocr`
        && pathname !== `${API_PREFIX}/workspace/registry`
        && pathname !== `${API_PREFIX}/workspace/list`
        && pathname !== `${API_PREFIX}/workspace/read`
        && pathname !== `${API_PREFIX}/workspace/write`
        && pathname !== `${API_PREFIX}/workspace/spec`
        && pathname !== `${API_PREFIX}/workspace/spec/delete`) {
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
      // Workspace endpoints never touch the model, so they short-circuit
      // before any catalog discovery. The service confines every operation to
      // the folder the page names as the root; when the Harness workspace
      // registry is mounted, that root must be one of its registered paths.
      if (pathname === `${API_PREFIX}/workspace/registry`) {
        sendJson(response, 200, readWorkspaceRegistry());
        return;
      }
      if (pathname === `${API_PREFIX}/workspace/list`) {
        assertWorkspaceRoot(body.root);
        sendJson(response, 200, await workspace.list(body.root));
        return;
      }
      if (pathname === `${API_PREFIX}/workspace/read`) {
        assertWorkspaceRoot(body.root);
        sendJson(response, 200, await workspace.read(body.root, body.relPath));
        return;
      }
      if (pathname === `${API_PREFIX}/workspace/write`) {
        assertWorkspaceRoot(body.root);
        sendJson(response, 200, await workspace.write(body.root, body.relPath, body.content, body.overwrite === true));
        return;
      }
      if (pathname === `${API_PREFIX}/workspace/spec`) {
        assertWorkspaceRoot(body.root);
        sendJson(response, 200, await workspace.readSpec(body.root));
        return;
      }
      if (pathname === `${API_PREFIX}/workspace/spec/delete`) {
        assertWorkspaceRoot(body.root);
        sendJson(response, 200, await workspace.deleteSpec(body.root, body.name));
        return;
      }
      // Only pay for catalog discovery when the caller actually overrides the
      // model; the common path keeps talking to the configured route.
      const route = body.route === undefined || body.route === null
        ? undefined
        : readRoute(body, (await catalog()).models);
      if (pathname === `${API_PREFIX}/translate`) {
        const targetLanguage = optionalLanguage(body, 'targetLanguage') ?? settings.targetLanguage;
        const sourceLanguage = optionalLanguage(body, 'sourceLanguage') ?? settings.sourceLanguage;
        // Whole-document mode: one request carries the full text and the
        // reply keeps the paragraph structure for the client to split. The
        // array form rides a validated JSON-array protocol; the string form
        // is the legacy shape older clients send.
        if (Array.isArray(body.document)) {
          const documentBudget = { chars: 0 };
          const documentParagraphs = readSegments(body, 'document', documentBudget);
          if (documentParagraphs.length === 0) {
            throw httpError(400, 'There is no text to translate.');
          }
          const translated = await engine.translateDocument({
            paragraphs: documentParagraphs,
            targetLanguage,
            sourceLanguage,
            route,
            spec: readSpecField(body),
          });
          sendJson(response, 200, {
            paragraphs: translated,
            document: translated.join('\n\n'),
            targetLanguage,
            model: engine.modelLabel(route),
          });
          return;
        }
        const document = optionalText(body, 'document', MAX_DOCUMENT_CHARS);
        if (document) {
          const translated = await engine.translateDocument({
            source: document,
            targetLanguage,
            sourceLanguage,
            route,
            spec: readSpecField(body),
          });
          sendJson(response, 200, { document: translated, targetLanguage, model: engine.modelLabel(route) });
          return;
        }
        const budget = { chars: 0 };
        const sentences = readSegments(body, 'sentences', budget);
        const paragraphs = readSegments(body, 'paragraphs', budget);
        if (sentences.length === 0 && paragraphs.length === 0) {
          throw httpError(400, 'There is no text to translate.');
        }
        const [translatedSentences, translatedParagraphs] = await Promise.all([
          sentences.length > 0
            ? engine.translateBatch({ segments: sentences, kind: 'sentence', targetLanguage, sourceLanguage, route, spec: readSpecField(body) })
            : [],
          paragraphs.length > 0
            ? engine.translateBatch({ segments: paragraphs, kind: 'paragraph', targetLanguage, sourceLanguage, route, spec: readSpecField(body) })
            : [],
        ]);
        sendJson(response, 200, {
          sentences: translatedSentences,
          paragraphs: translatedParagraphs,
          targetLanguage,
          model: engine.modelLabel(route),
        });
        return;
      }
      if (pathname === `${API_PREFIX}/retranslate`) {
        const kind = ['sentence', 'paragraph', 'document'].includes(body.kind) ? body.kind : 'sentence';
        const isDocument = kind === 'document';
        const source = requiredText(body, 'source', isDocument ? MAX_DOCUMENT_CHARS : MAX_SEGMENT_CHARS);
        const translation = optionalText(body, 'translation', isDocument ? MAX_DOCUMENT_CHARS : MAX_SEGMENT_CHARS);
        if (isDocument && source.length + (translation?.length ?? 0) > MAX_DOCUMENT_TOTAL_CHARS) {
          throw httpError(400, `The document exceeds the ${MAX_DOCUMENT_TOTAL_CHARS} character limit.`);
        }
        const extraPrompt = optionalText(body, 'extraPrompt', 2_000);
        const targetLanguage = optionalLanguage(body, 'targetLanguage') ?? settings.targetLanguage;
        const sourceLanguage = optionalLanguage(body, 'sourceLanguage') ?? settings.sourceLanguage;
        const revised = await engine.retranslate({
          source,
          translation,
          extraPrompt,
          kind,
          targetLanguage,
          sourceLanguage,
          route,
          spec: readSpecField(body),
        });
        sendJson(response, 200, { translation: revised, kind, model: engine.modelLabel(route) });
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
        const scored = await engine.scoreDocument({ source, translation, targetLanguage, sourceLanguage, route, spec: readSpecField(body) });
        sendJson(response, 200, { ...scored, model: engine.modelLabel(route) });
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
        const text = await engine.ocr({ image, route });
        sendJson(response, 200, {
          text,
          model: engine.modelLabel(route),
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
        route,
        spec: readSpecField(body),
      });
      sendJson(response, 200, { ...scored, kind, model: engine.modelLabel(route) });
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
// The Harness workspace registry is resolved through `ctx.get()`, which reads
// the host-wide service store; a bare `ctx.workspaceRegistry` property access
// requires an inject declaration that would also make the service mandatory.
export function apply(ctx, config) {
  const settings = normalizeSettings(config);
  const engine = new TranslationEngine({
    llm: ctx.llm,
    settings,
    resolveTarget: () => resolveTarget(ctx, settings),
  });

  // Discovery walks optional Host services and may await them, so the result is
  // cached: the page asks on every boot, and switch validation reuses the same
  // list instead of re-probing the services for each request.
  let catalogCache = { at: 0, value: { models: [], failures: [] } };
  const catalog = async () => {
    if (catalogCache.at > 0 && Date.now() - catalogCache.at < MODEL_CACHE_MS) return catalogCache.value;
    let value = { models: [], failures: [] };
    try {
      value = await discoverModels(ctx, settings);
    } catch (error) {
      console.error('[translation-assistant] model discovery failed:', error && error.message ? error.message : error);
      value = { models: [], failures: [] };
    }
    catalogCache = { at: Date.now(), value };
    return value;
  };

  // Adding a provider in Settings → Models re-registers adapter routes; drop
  // the cached list so the page can offer the new model without a restart.
  if (typeof ctx.on === 'function') {
    try {
      ctx.on('llm/adapters-updated', () => {
        catalogCache = { at: 0, value: { models: [], failures: [] } };
      });
    } catch {
      // Listening is an optimization; a Host without this event still works
      // with the plain TTL.
    }
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: API_PREFIX,
    handler: createHandler(ctx, engine, settings, catalog),
  }), 'translation-assistant: http api');

  const tools = ctx.get('tools');
  if (tools && settings.toolEnabled) {
    ctx.effect(() => tools.register(createTool(engine, settings)), 'translation-assistant: agent tool');
  }
}
