import { TranslationEngine } from "./engine.js";
import { createWorkspaceService } from "./workspace.js";
import fs from "node:fs/promises";
import path from "node:path";
const API_PREFIX = "/dsh-translation/api";
const HOST_REVISION = "11";
const MAX_BODY_BYTES = 24 * 1024 * 1024;
const MAX_SEGMENTS = 400;
const MAX_SEGMENT_CHARS = 2e4;
const MAX_TOTAL_CHARS = 12e4;
const MAX_DOCUMENT_CHARS = 6e4;
const MAX_DOCUMENT_TOTAL_CHARS = 12e4;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_MODEL_NAME_CHARS = 120;
const MODEL_CACHE_MS = 6e4;
const IMAGE_MEDIA_TYPES = /* @__PURE__ */ new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
function normalizeSettings(config) {
  const raw = config && typeof config === "object" ? config : {};
  const text = (value) => typeof value === "string" && value.trim() ? value.trim() : void 0;
  const positiveInt = (value, fallback) => typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
  const nonNegativeInt = (value, fallback) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
  return {
    provider: text(raw.provider),
    model: text(raw.model),
    reasoningEffort: text(raw.reasoningEffort),
    targetLanguage: text(raw.targetLanguage) ?? "\u4E2D\u6587",
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
    models: Array.isArray(raw.models) ? raw.models : []
  };
}
function resolveTarget(ctx, settings) {
  if (settings.provider && settings.model) {
    return {
      provider: settings.provider,
      model: settings.model,
      ...settings.reasoningEffort ? { reasoningEffort: settings.reasoningEffort } : {}
    };
  }
  const selection = readDefaultSelection(ctx);
  if (!selection) return void 0;
  return {
    provider: selection.provider,
    model: selection.model,
    ...settings.reasoningEffort ? { reasoningEffort: settings.reasoningEffort } : {}
  };
}
function readDefaultSelection(ctx) {
  let defaults;
  try {
    defaults = ctx.get("agentDefaultModel");
  } catch {
    return void 0;
  }
  if (!defaults || typeof defaults.currentSelection !== "function") return void 0;
  let selection;
  try {
    selection = defaults.currentSelection();
  } catch {
    return void 0;
  }
  if (!selection || !selection.provider || !selection.model) return void 0;
  return { provider: String(selection.provider), model: String(selection.model) };
}
function normalizeModelEntry(value, providerHint) {
  if (typeof value === "string") {
    const text = value.trim();
    const slash = text.indexOf("/");
    if (slash <= 0 || slash === text.length - 1) {
      return providerHint && text ? normalizeModelEntry({ provider: providerHint, model: text }) : null;
    }
    return normalizeModelEntry({ provider: text.slice(0, slash), model: text.slice(slash + 1) });
  }
  if (!value || typeof value !== "object") return null;
  const pick = (...names) => {
    for (const name of names) {
      const raw = value[name];
      if (typeof raw === "string" && raw.trim()) return raw.trim();
    }
    return "";
  };
  const provider = pick("provider", "providerId", "providerName") || (providerHint ?? "");
  const model = pick("model", "modelId", "id");
  if (!provider || !model) return null;
  if (provider.length > MAX_MODEL_NAME_CHARS || model.length > MAX_MODEL_NAME_CHARS) return null;
  const label = pick("label", "displayName", "title", "name");
  const reasoningEffort = pick("reasoningEffort");
  return {
    provider,
    model,
    ...label ? { label } : {},
    ...reasoningEffort ? { reasoningEffort } : {}
  };
}
function collectModelEntries(value, providerHint, out) {
  if (Array.isArray(value)) {
    for (const item of value) collectModelEntries(item, providerHint, out);
    return;
  }
  if (!value || typeof value !== "object") {
    const single2 = normalizeModelEntry(value, providerHint);
    if (single2) out.push(single2);
    return;
  }
  if (Array.isArray(value.models)) {
    const provider = providerHint || typeof value.provider === "string" && value.provider || typeof value.providerId === "string" && value.providerId || typeof value.id === "string" && value.id || typeof value.name === "string" && value.name || void 0;
    for (const item of value.models) {
      const entry = normalizeModelEntry(item, provider);
      if (entry) out.push(entry);
    }
    return;
  }
  const single = normalizeModelEntry(value, providerHint);
  if (single) out.push(single);
}
async function readModelSource(source, methods) {
  if (!source || typeof source !== "object" && typeof source !== "function") return [];
  for (const method of methods) {
    let fn;
    try {
      fn = source[method];
    } catch {
      continue;
    }
    if (typeof fn !== "function") continue;
    let value;
    try {
      value = await fn.call(source);
    } catch {
      continue;
    }
    const entries = [];
    collectModelEntries(value, void 0, entries);
    if (entries.length > 0) return entries;
  }
  return [];
}
async function readAdapterCatalog(ctx) {
  const empty = { entries: [], failures: [] };
  const llm = ctx && ctx.llm;
  if (!llm || typeof llm.listProviders !== "function" || typeof llm.listModels !== "function") return empty;
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
    const providerId = provider && typeof provider.id === "string" ? provider.id.trim() : "";
    if (!providerId) continue;
    let models;
    try {
      models = await llm.listModels(providerId);
    } catch (error) {
      failures.push({
        provider: providerId,
        message: error && error.message ? String(error.message) : "model listing failed"
      });
      continue;
    }
    if (!Array.isArray(models)) continue;
    const providerLabel = typeof provider.name === "string" && provider.name.trim() ? provider.name.trim() : "";
    for (const model of models) {
      if (!model || typeof model !== "object") continue;
      const id = typeof model.id === "string" ? model.id.trim() : "";
      if (!id) continue;
      const entry = normalizeModelEntry({ provider: providerId, model: id, name: model.name });
      if (!entry) continue;
      entries.push(providerLabel ? { ...entry, providerLabel } : entry);
    }
  }
  return { entries, failures };
}
const MODEL_SERVICES = ["modelCatalog", "agentModels", "providers", "models"];
const MODEL_METHODS = ["listModels", "list", "options", "available", "candidates", "getModels", "all"];
async function discoverModels(ctx, settings) {
  const entries = [];
  const seen = /* @__PURE__ */ new Set();
  const add = (entry) => {
    if (!entry) return;
    const key = `${entry.provider}/${entry.model}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(entry);
  };
  for (const entry of settings.models) add(normalizeModelEntry(entry));
  const registry = await readAdapterCatalog(ctx);
  for (const entry of registry.entries) add(entry);
  if (entries.length === 0) {
    for (const name of MODEL_SERVICES) {
      let service;
      try {
        service = ctx.get(name);
      } catch {
        service = void 0;
      }
      if (!service) continue;
      for (const entry of await readModelSource(service, MODEL_METHODS)) add(entry);
    }
    for (const entry of await readModelSource(ctx.llm, ["listModels", "models"])) add(entry);
  }
  add(resolveTarget(ctx, settings));
  add(readDefaultSelection(ctx));
  return { models: entries, failures: registry.failures };
}
function httpError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}
function sendJson(response, status, value) {
  if (response.writableEnded) return;
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  response.end(body);
}
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
    request.on("data", (chunk) => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      if (settled) return;
      if (tooLarge) {
        fail(httpError(413, "Request body is too large."));
        return;
      }
      settled = true;
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          reject(httpError(400, "Request body must be a JSON object."));
          return;
        }
        resolve(parsed);
      } catch {
        reject(httpError(400, "Request body is not valid JSON."));
      }
    });
    request.on("error", fail);
  });
}
function optionalText(body, field, maxLength) {
  const value = body[field];
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "string") throw httpError(400, `"${field}" must be a string.`);
  const text = value.trim();
  if (!text) return void 0;
  if (text.length > maxLength) {
    throw httpError(400, `"${field}" exceeds the ${maxLength} character limit.`);
  }
  return text;
}
function requiredText(body, field, maxLength) {
  const value = optionalText(body, field, maxLength);
  if (!value) throw httpError(400, `"${field}" is required.`);
  return value;
}
function optionalLanguage(body, field) {
  return optionalText(body, field, 40);
}
const MAX_SPEC_CHARS = 320 * 1024;
function readSpecField(body) {
  const text = body && typeof body.spec === "string" ? body.spec.trim() : "";
  if (!text) return void 0;
  if (text.length > MAX_SPEC_CHARS) {
    throw httpError(400, `The guidelines exceed the ${Math.round(MAX_SPEC_CHARS / 1024)} KB limit.`);
  }
  return text;
}
function readSegments(body, field, totalBudget) {
  const value = body[field];
  if (value === void 0 || value === null) return [];
  if (!Array.isArray(value)) throw httpError(400, `"${field}" must be an array of strings.`);
  if (value.length > MAX_SEGMENTS) {
    throw httpError(400, `"${field}" exceeds the ${MAX_SEGMENTS} segment limit.`);
  }
  const segments = [];
  for (const entry of value) {
    if (typeof entry !== "string") throw httpError(400, `"${field}" must contain only strings.`);
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
function readRoute(body, models) {
  const raw = body.route;
  if (raw === void 0 || raw === null) return void 0;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw httpError(400, '"route" must be an object with provider and model.', "BAD_ROUTE");
  }
  const provider = typeof raw.provider === "string" ? raw.provider.trim() : "";
  const model = typeof raw.model === "string" ? raw.model.trim() : "";
  if (!provider || !model) throw httpError(400, '"route" needs both provider and model.', "BAD_ROUTE");
  if (provider.length > MAX_MODEL_NAME_CHARS || model.length > MAX_MODEL_NAME_CHARS) {
    throw httpError(400, '"route" is too long.', "BAD_ROUTE");
  }
  const match = models.find((entry) => entry.provider === provider && entry.model === model);
  if (models.length > 0 && !match) {
    throw httpError(
      400,
      "The selected model is no longer available. Reload the page and pick another one.",
      "UNKNOWN_ROUTE"
    );
  }
  return {
    provider,
    model,
    ...match && match.reasoningEffort ? { reasoningEffort: match.reasoningEffort } : {}
  };
}
function statusForError(error) {
  if (error && typeof error === "object" && typeof error.status === "number") return error.status;
  if (error && error.name === "AbortError") return 499;
  if (error && error.code === "NO_MODEL") return 503;
  if (error && error.code === "NO_VISION") return 422;
  if (error && typeof error.code === "string" && error.code.startsWith("ATTACHMENT")) return 400;
  if (error && typeof error.code === "string" && error.code.startsWith("LLM_")) return 502;
  return 502;
}
function createHandler(ctx, engine, settings, catalog) {
  const workspace = createWorkspaceService(fs, path);
  const readWorkspaceRegistry = () => {
    let registry;
    try {
      registry = typeof ctx.get === "function" ? ctx.get("workspaceRegistry") : ctx.workspaceRegistry;
    } catch {
      registry = void 0;
    }
    if (!registry || typeof registry.list !== "function") {
      return { available: false, workspaces: [] };
    }
    try {
      const workspaces = (registry.list() ?? []).map((entry) => ({
        id: String(entry.id ?? ""),
        title: String(entry.title ?? ""),
        path: String(entry.path ?? "")
      })).filter((entry) => entry.id && entry.path);
      return { available: true, workspaces };
    } catch {
      return { available: false, workspaces: [] };
    }
  };
  const assertWorkspaceRoot = (root) => {
    const registry = readWorkspaceRegistry();
    if (!registry.available) return;
    if (typeof root !== "string" || !registry.workspaces.some((entry) => entry.path === root)) {
      const error = new Error("Root is not a registered Harness workspace.");
      error.status = 403;
      error.code = "WORKSPACE_NOT_REGISTERED";
      throw error;
    }
  };
  return async function handle(request, response) {
    let url;
    try {
      url = new URL(request.url ?? "/", "http://127.0.0.1");
    } catch {
      sendJson(response, 400, { error: "Malformed request URL." });
      return;
    }
    const pathname = url.pathname;
    try {
      if (pathname === `${API_PREFIX}/health`) {
        if (request.method !== "GET") {
          sendJson(response, 405, { error: "Use GET for the health endpoint." });
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
        const fallback = readDefaultSelection(ctx);
        sendJson(response, 200, {
          ok: true,
          revision: HOST_REVISION,
          model: engine.modelLabel(),
          default: fallback ? { provider: fallback.provider, model: fallback.model } : null,
          models: models.map((entry) => ({
            provider: entry.provider,
            model: entry.model,
            ...entry.label ? { label: entry.label } : {},
            ...entry.providerLabel ? { providerLabel: entry.providerLabel } : {}
          })),
          modelFailures: failures,
          targetLanguage: settings.targetLanguage,
          features: ["translate", "retranslate", "score", "score-document", "ocr", "models", "workspace", "workspace-spec"]
        });
        return;
      }
      if (request.method !== "POST") {
        sendJson(response, 405, { error: "Use POST for this endpoint." });
        return;
      }
      if (pathname !== `${API_PREFIX}/translate` && pathname !== `${API_PREFIX}/retranslate` && pathname !== `${API_PREFIX}/score` && pathname !== `${API_PREFIX}/score-document` && pathname !== `${API_PREFIX}/ocr` && pathname !== `${API_PREFIX}/workspace/registry` && pathname !== `${API_PREFIX}/workspace/list` && pathname !== `${API_PREFIX}/workspace/read` && pathname !== `${API_PREFIX}/workspace/write` && pathname !== `${API_PREFIX}/workspace/spec` && pathname !== `${API_PREFIX}/workspace/spec/delete`) {
        sendJson(response, 404, { error: "Unknown endpoint." });
        return;
      }
      const origin = request.headers.origin;
      if (origin) {
        let expected;
        try {
          expected = ctx.webServer.getOrigin();
        } catch {
          expected = void 0;
        }
        if (expected && origin !== expected) {
          sendJson(response, 403, { error: "Cross-origin requests are not allowed." });
          return;
        }
      }
      const body = await readJsonBody(request);
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
      const route = body.route === void 0 || body.route === null ? void 0 : readRoute(body, (await catalog()).models);
      if (pathname === `${API_PREFIX}/translate`) {
        const targetLanguage2 = optionalLanguage(body, "targetLanguage") ?? settings.targetLanguage;
        const sourceLanguage2 = optionalLanguage(body, "sourceLanguage") ?? settings.sourceLanguage;
        if (Array.isArray(body.document)) {
          const documentBudget = { chars: 0 };
          const documentParagraphs = readSegments(body, "document", documentBudget);
          if (documentParagraphs.length === 0) {
            throw httpError(400, "There is no text to translate.");
          }
          const translated = await engine.translateDocument({
            paragraphs: documentParagraphs,
            targetLanguage: targetLanguage2,
            sourceLanguage: sourceLanguage2,
            route,
            spec: readSpecField(body)
          });
          sendJson(response, 200, {
            paragraphs: translated,
            document: translated.join("\n\n"),
            targetLanguage: targetLanguage2,
            model: engine.modelLabel(route)
          });
          return;
        }
        const document = optionalText(body, "document", MAX_DOCUMENT_CHARS);
        if (document) {
          const translated = await engine.translateDocument({
            source: document,
            targetLanguage: targetLanguage2,
            sourceLanguage: sourceLanguage2,
            route,
            spec: readSpecField(body)
          });
          sendJson(response, 200, { document: translated, targetLanguage: targetLanguage2, model: engine.modelLabel(route) });
          return;
        }
        const budget = { chars: 0 };
        const sentences = readSegments(body, "sentences", budget);
        const paragraphs = readSegments(body, "paragraphs", budget);
        if (sentences.length === 0 && paragraphs.length === 0) {
          throw httpError(400, "There is no text to translate.");
        }
        const [translatedSentences, translatedParagraphs] = await Promise.all([
          sentences.length > 0 ? engine.translateBatch({ segments: sentences, kind: "sentence", targetLanguage: targetLanguage2, sourceLanguage: sourceLanguage2, route, spec: readSpecField(body) }) : [],
          paragraphs.length > 0 ? engine.translateBatch({ segments: paragraphs, kind: "paragraph", targetLanguage: targetLanguage2, sourceLanguage: sourceLanguage2, route, spec: readSpecField(body) }) : []
        ]);
        sendJson(response, 200, {
          sentences: translatedSentences,
          paragraphs: translatedParagraphs,
          targetLanguage: targetLanguage2,
          model: engine.modelLabel(route)
        });
        return;
      }
      if (pathname === `${API_PREFIX}/retranslate`) {
        const kind2 = ["sentence", "paragraph", "document"].includes(body.kind) ? body.kind : "sentence";
        const isDocument = kind2 === "document";
        const source2 = requiredText(body, "source", isDocument ? MAX_DOCUMENT_CHARS : MAX_SEGMENT_CHARS);
        const translation2 = optionalText(body, "translation", isDocument ? MAX_DOCUMENT_CHARS : MAX_SEGMENT_CHARS);
        if (isDocument && source2.length + (translation2?.length ?? 0) > MAX_DOCUMENT_TOTAL_CHARS) {
          throw httpError(400, `The document exceeds the ${MAX_DOCUMENT_TOTAL_CHARS} character limit.`);
        }
        const extraPrompt = optionalText(body, "extraPrompt", 2e3);
        const targetLanguage2 = optionalLanguage(body, "targetLanguage") ?? settings.targetLanguage;
        const sourceLanguage2 = optionalLanguage(body, "sourceLanguage") ?? settings.sourceLanguage;
        const revised = await engine.retranslate({
          source: source2,
          translation: translation2,
          extraPrompt,
          kind: kind2,
          targetLanguage: targetLanguage2,
          sourceLanguage: sourceLanguage2,
          route,
          spec: readSpecField(body)
        });
        sendJson(response, 200, { translation: revised, kind: kind2, model: engine.modelLabel(route) });
        return;
      }
      if (pathname === `${API_PREFIX}/score-document`) {
        const source2 = requiredText(body, "source", MAX_DOCUMENT_CHARS);
        const translation2 = requiredText(body, "translation", MAX_DOCUMENT_CHARS);
        if (source2.length + translation2.length > MAX_DOCUMENT_TOTAL_CHARS) {
          throw httpError(400, `The document exceeds the ${MAX_DOCUMENT_TOTAL_CHARS} character limit.`);
        }
        const targetLanguage2 = optionalLanguage(body, "targetLanguage") ?? settings.targetLanguage;
        const sourceLanguage2 = optionalLanguage(body, "sourceLanguage") ?? settings.sourceLanguage;
        const scored2 = await engine.scoreDocument({ source: source2, translation: translation2, targetLanguage: targetLanguage2, sourceLanguage: sourceLanguage2, route, spec: readSpecField(body) });
        sendJson(response, 200, { ...scored2, model: engine.modelLabel(route) });
        return;
      }
      if (pathname === `${API_PREFIX}/ocr`) {
        const attachments = ctx.get("attachments");
        if (!attachments) {
          throw httpError(503, "Image OCR is unavailable: the attachment service is not mounted.");
        }
        const mediaType = requiredText(body, "mediaType", 40);
        if (!IMAGE_MEDIA_TYPES.has(mediaType)) {
          throw httpError(415, "Unsupported image media type. Use PNG, JPEG, WebP, or GIF.");
        }
        const encoded = requiredText(body, "data", Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 256);
        if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
          throw httpError(400, "Image data is not valid base64.");
        }
        const bytes = Buffer.from(encoded, "base64");
        if (bytes.length === 0) throw httpError(400, "The image is empty.");
        if (bytes.length > MAX_IMAGE_BYTES) throw httpError(413, "The image is too large.");
        const limits = attachments.imageLimits;
        if (limits && Number.isFinite(limits.maxImageBytes) && bytes.length > limits.maxImageBytes) {
          throw httpError(413, "The image is larger than the attachment limit.");
        }
        const name = optionalText(body, "name", 120);
        const refs = await attachments.saveImages([{
          data: bytes,
          mediaType,
          ...name ? { name } : {}
        }]);
        const image = refs[0];
        const text = await engine.ocr({ image, route });
        sendJson(response, 200, {
          text,
          model: engine.modelLabel(route),
          image: { width: image.width, height: image.height, bytes: image.bytes }
        });
        return;
      }
      const source = requiredText(body, "source", MAX_SEGMENT_CHARS);
      const translation = requiredText(body, "translation", MAX_SEGMENT_CHARS);
      const targetLanguage = optionalLanguage(body, "targetLanguage") ?? settings.targetLanguage;
      const sourceLanguage = optionalLanguage(body, "sourceLanguage") ?? settings.sourceLanguage;
      const kind = body.kind === "paragraph" ? "paragraph" : "sentence";
      const scored = await engine.score({
        source,
        translation,
        kind,
        targetLanguage,
        sourceLanguage,
        route,
        spec: readSpecField(body)
      });
      sendJson(response, 200, { ...scored, kind, model: engine.modelLabel(route) });
    } catch (error) {
      const status = statusForError(error);
      if (status >= 500) {
        console.error("[translation-assistant] API request failed:", error && error.stack ? error.stack : error);
      }
      const payload = {
        error: error && error.message ? String(error.message) : "The translation service failed."
      };
      if (error && typeof error.code === "string") payload.code = error.code;
      if (error && typeof error.detail === "string") payload.detail = error.detail;
      sendJson(response, status, payload);
    }
  };
}
function createTool(engine, settings) {
  return {
    name: "translation_assistant",
    description: [
      "Translate, retranslate, or score text with the same engine behind the Translation Assistant panel.",
      "action=translate returns the translation of the given text into targetLanguage;",
      "action=retranslate returns an improved translation of one sentence or paragraph, optionally following extraPrompt;",
      "action=score returns a 0-100 quality score and a one-sentence comment for an existing translation;",
      "action=score_document scores a whole translated document (text = full source, translation = full translated document)."
    ].join(" "),
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        action: {
          type: "string",
          enum: ["translate", "retranslate", "score", "score_document"],
          description: "Operation to perform."
        },
        text: {
          type: "string",
          description: "Source text to translate, or the single source sentence/paragraph for retranslate and score."
        },
        translation: {
          type: "string",
          description: "Existing translation. Required for score; optional reference for retranslate."
        },
        targetLanguage: {
          type: "string",
          description: "Target language name, for example \u4E2D\u6587, English, or \u65E5\u672C\u8A9E. Defaults to the plugin config target."
        },
        sourceLanguage: {
          type: "string",
          description: "Source language name. Omit to let the engine detect it."
        },
        extraPrompt: {
          type: "string",
          description: 'Extra instruction applied only by retranslate, for example "more colloquial" or "keep the legal terminology".'
        }
      },
      required: ["action", "text"]
    },
    output: {
      schema: { type: "object", properties: {} },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value, null, 2) }]
    },
    isConcurrencySafe: () => true,
    timeoutMs: 18e4,
    async execute(args, run) {
      const input = args && typeof args === "object" ? args : {};
      const action = input.action;
      const text = typeof input.text === "string" ? input.text.trim() : "";
      if (!action) throw new Error('"action" is required.');
      if (!text) throw new Error('"text" is required.');
      const targetLanguage = typeof input.targetLanguage === "string" && input.targetLanguage.trim() ? input.targetLanguage.trim() : settings.targetLanguage;
      const sourceLanguage = typeof input.sourceLanguage === "string" && input.sourceLanguage.trim() ? input.sourceLanguage.trim() : settings.sourceLanguage;
      const signal = run && run.signal ? run.signal : void 0;
      if (action === "translate") {
        const [translation] = await engine.translateBatch({
          segments: [text],
          kind: "paragraph",
          targetLanguage,
          sourceLanguage,
          signal
        });
        return { action, targetLanguage, translation };
      }
      if (action === "retranslate") {
        const translation = typeof input.translation === "string" && input.translation.trim() ? input.translation.trim() : void 0;
        const extraPrompt = typeof input.extraPrompt === "string" && input.extraPrompt.trim() ? input.extraPrompt.trim() : void 0;
        const revised = await engine.retranslate({
          source: text,
          translation,
          extraPrompt,
          kind: "paragraph",
          targetLanguage,
          sourceLanguage,
          signal
        });
        return { action, targetLanguage, translation: revised };
      }
      if (action === "score") {
        const translation = typeof input.translation === "string" ? input.translation.trim() : "";
        if (!translation) throw new Error('"translation" is required for action=score.');
        const scored = await engine.score({
          source: text,
          translation,
          kind: "paragraph",
          targetLanguage,
          sourceLanguage,
          signal
        });
        return { action, targetLanguage, ...scored };
      }
      if (action === "score_document") {
        const translation = typeof input.translation === "string" ? input.translation.trim() : "";
        if (!translation) throw new Error('"translation" is required for action=score_document.');
        const scored = await engine.scoreDocument({
          source: text,
          translation,
          targetLanguage,
          sourceLanguage,
          signal
        });
        return { action, targetLanguage, ...scored };
      }
      throw new Error(`Unsupported action: ${String(action)}`);
    }
  };
}
const Config = {
  "~standard": {
    version: 1,
    vendor: "dsh-translation-assistant",
    validate(raw) {
      return { value: normalizeSettings(raw) };
    }
  }
};
const inject = ["llm", "webServer"];
function apply(ctx, config) {
  const settings = normalizeSettings(config);
  const engine = new TranslationEngine({
    llm: ctx.llm,
    settings,
    resolveTarget: () => resolveTarget(ctx, settings)
  });
  let catalogCache = { at: 0, value: { models: [], failures: [] } };
  const catalog = async () => {
    if (catalogCache.at > 0 && Date.now() - catalogCache.at < MODEL_CACHE_MS) return catalogCache.value;
    let value = { models: [], failures: [] };
    try {
      value = await discoverModels(ctx, settings);
    } catch (error) {
      console.error("[translation-assistant] model discovery failed:", error && error.message ? error.message : error);
      value = { models: [], failures: [] };
    }
    catalogCache = { at: Date.now(), value };
    return value;
  };
  if (typeof ctx.on === "function") {
    try {
      ctx.on("llm/adapters-updated", () => {
        catalogCache = { at: 0, value: { models: [], failures: [] } };
      });
    } catch {
    }
  }
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: API_PREFIX,
    handler: createHandler(ctx, engine, settings, catalog)
  }), "translation-assistant: http api");
  const tools = ctx.get("tools");
  if (tools && settings.toolEnabled) {
    ctx.effect(() => tools.register(createTool(engine, settings)), "translation-assistant: agent tool");
  }
}
export {
  Config,
  apply,
  inject
};
