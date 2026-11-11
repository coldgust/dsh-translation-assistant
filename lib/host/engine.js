const TRANSLATE_SYSTEM = [
  "You are a professional translation engine embedded in a translation assistant.",
  "Translate faithfully and naturally, preserving meaning, tone, register, terminology, numbers, and formatting.",
  "Never add explanations, notes, or alternative translations unless the user explicitly asks for them."
].join(" ");
const RETRANSLATE_SYSTEM = [
  "You are a professional translator revising one sentence, paragraph, or document.",
  "Produce the best possible translation that follows every instruction from the user.",
  "When revising a whole document, keep its paragraph structure exactly.",
  "Return only the translation text itself."
].join(" ");
const SCORE_SYSTEM = [
  "You are a strict translation quality evaluator.",
  "You judge accuracy (fidelity to the source), fluency (natural target language), and terminology and style.",
  "Be critical but fair: a perfect translation is rare, and a score above 90 requires near-perfect work.",
  "Answer with exactly the two requested lines and nothing else."
].join(" ");
const OCR_SYSTEM = [
  "You are an OCR engine embedded in a translation assistant.",
  "Extract every visible text character from the image exactly as written.",
  "Preserve reading order, line breaks, and paragraph structure; do not translate, summarize, or explain."
].join(" ");
const NO_MODEL_CODE = "NO_MODEL";
const NO_VISION_CODE = "NO_VISION";
function isAbortError(error) {
  return Boolean(error) && (error.name === "AbortError" || error.name === "TimeoutError");
}
function stripWrapping(raw) {
  let text = String(raw ?? "").trim();
  const fenced = text.match(/^```(?:[a-zA-Z-]+)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenced) text = fenced[1].trim();
  text = text.replace(/^(?:translation|translated text|译文|翻译)\s*[:：]\s*/i, "");
  const pairs = [
    ['"', '"'],
    ["'", "'"],
    ["\u201C", "\u201D"],
    ["\u300C", "\u300D"],
    ["\u300E", "\u300F"],
    ["\u2018", "\u2019"]
  ];
  for (const [open, close] of pairs) {
    if (text.length >= 2 && text.startsWith(open) && text.endsWith(close)) {
      const inner = text.slice(open.length, text.length - close.length);
      if (!inner.includes("\n")) {
        text = inner.trim();
        break;
      }
    }
  }
  return text;
}
function parseJsonLoose(raw) {
  const text = String(raw ?? "").trim();
  const candidates = [];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1]);
  candidates.push(text);
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
    }
    const start = trimmed.search(/[[{]/);
    if (start === -1) continue;
    const open = trimmed[start];
    const close = open === "[" ? "]" : "}";
    const end = trimmed.lastIndexOf(close);
    if (end <= start) continue;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
    }
  }
  const error = new Error("The model reply did not contain valid JSON.");
  error.code = "LLM_BAD_JSON";
  throw error;
}
async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  let cursor = 0;
  const width = Math.max(1, Math.min(Math.floor(limit) || 1, list.length || 1));
  const runners = Array.from({ length: width }, async () => {
    for (; ; ) {
      const index = cursor;
      cursor += 1;
      if (index >= list.length) return;
      results[index] = await worker(list[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}
function languageLine(targetLanguage, sourceLanguage) {
  const source = sourceLanguage && sourceLanguage !== "auto" ? `Source language: ${sourceLanguage}.` : "Detect the source language automatically.";
  return `Target language: ${targetLanguage}. ${source}`;
}
function specBlock(spec) {
  return [
    "The translation guidelines below come from this workspace and MUST be followed:",
    String(spec).trim()
  ].join("\n");
}
function batchTranslatePrompt(segments, kind, targetLanguage, sourceLanguage) {
  const label = kind === "paragraph" ? "paragraph" : "sentence";
  return [
    `Translate each ${label} in the JSON array below into ${targetLanguage}.`,
    languageLine(targetLanguage, sourceLanguage),
    `Keep exactly ${segments.length} items in the same order; do not merge or split items.`,
    "Preserve meaning, tone, terminology, numbers, and formatting.",
    "Return ONLY a JSON array of strings with the translations: no markdown fence, no numbering, no commentary.",
    "",
    "JSON array:",
    JSON.stringify(segments, null, 2)
  ].join("\n");
}
function singleTranslatePrompt(source, kind, targetLanguage, sourceLanguage) {
  const label = kind === "paragraph" ? "paragraph" : "sentence";
  return [
    `Translate the following ${label} into ${targetLanguage}.`,
    languageLine(targetLanguage, sourceLanguage),
    "Preserve meaning, tone, terminology, numbers, and formatting.",
    "Return ONLY the translation text: no quotation marks, no numbering, no commentary.",
    "",
    "Source:",
    source
  ].join("\n");
}
function documentTranslatePrompt(source, targetLanguage, sourceLanguage) {
  return [
    `Translate the following document into ${targetLanguage}.`,
    languageLine(targetLanguage, sourceLanguage),
    "The document consists of paragraphs separated by blank lines.",
    "Return the translation with exactly the same paragraphs, also separated by blank lines; do not merge or split paragraphs.",
    "Preserve meaning, tone, terminology, numbers, and formatting.",
    "Return ONLY the translation text: no quotation marks, no numbering, no commentary.",
    "",
    "Document:",
    source
  ].join("\n");
}
function documentBatchPrompt(paragraphs, targetLanguage, sourceLanguage) {
  return [
    `Translate the following document into ${targetLanguage}.`,
    languageLine(targetLanguage, sourceLanguage),
    `The JSON array below lists all ${paragraphs.length} paragraphs of the document, in order.`,
    "Translate the document as a whole so the wording stays coherent across paragraphs.",
    `Return ONLY a JSON array of strings with exactly ${paragraphs.length} translations in the same order; do not merge or split paragraphs.`,
    "Preserve meaning, tone, terminology, numbers, and formatting.",
    "",
    "JSON array:",
    JSON.stringify(paragraphs, null, 2)
  ].join("\n");
}
function retranslatePrompt(input) {
  const label = input.kind === "paragraph" ? "paragraph" : input.kind === "document" ? "document" : "sentence";
  const lines = [
    `Produce a new, improved translation of the following ${label} into ${input.targetLanguage}.`,
    languageLine(input.targetLanguage, input.sourceLanguage)
  ];
  if (input.kind === "document") {
    lines.push("The document consists of paragraphs separated by blank lines.");
    lines.push("Return the revised translation with exactly the same paragraphs, also separated by blank lines; do not merge or split paragraphs.");
  }
  if (input.extraPrompt && input.extraPrompt.trim()) {
    lines.push(`User instruction that MUST be followed: ${input.extraPrompt.trim()}`);
  }
  if (input.translation && input.translation.trim()) {
    lines.push("Current translation (reference only, may be revised freely):");
    lines.push(input.translation.trim());
  }
  lines.push("Return ONLY the translation text: no quotation marks, no numbering, no commentary.");
  lines.push("");
  lines.push("Source:");
  lines.push(input.source);
  return lines.join("\n");
}
function scorePrompt(input) {
  const label = input.kind === "paragraph" ? "paragraph" : "sentence";
  return [
    `Evaluate the following ${label} translation.`,
    languageLine(input.targetLanguage, input.sourceLanguage),
    "",
    "Source:",
    input.source,
    "",
    "Translation to evaluate:",
    input.translation,
    "",
    "Score the translation from 0 to 100 as an integer:",
    "- 90-100: near-perfect; faithful, fluent, no meaningful loss.",
    "- 75-89: good; minor loss or awkwardness.",
    "- 60-74: acceptable; noticeable mistakes or omissions.",
    "- 40-59: weak; meaning partially lost.",
    "- 0-39: poor or unrelated.",
    `Write one concise sentence of feedback in ${input.targetLanguage}.`,
    "",
    "Reply with exactly these two lines and nothing else:",
    "SCORE: <integer 0-100>",
    "COMMENT: <one sentence>"
  ].join("\n");
}
function ocrPrompt() {
  return [
    "Transcribe all text in the image.",
    "Return ONLY the transcribed text, preserving line breaks and paragraph structure.",
    "Do not translate it, do not describe the image, and do not add commentary.",
    "If the image contains no readable text, return nothing."
  ].join("\n");
}
function scoreDocumentPrompt(input) {
  return [
    "Evaluate the translation quality of the whole document below.",
    languageLine(input.targetLanguage, input.sourceLanguage),
    "",
    "Consider all of the following:",
    "- accuracy and completeness against the source;",
    "- terminology consistency across paragraphs;",
    "- fluency, tone, and natural style in the target language;",
    "- preservation of structure, headings, and formatting.",
    "",
    "Source document:",
    input.source,
    "",
    "Translated document:",
    input.translation,
    "",
    "Score the document from 0 to 100 as an integer:",
    "- 90-100: publication quality; faithful, fluent, consistent.",
    "- 75-89: good; minor losses or inconsistencies.",
    "- 60-74: acceptable; noticeable mistakes or omissions.",
    "- 40-59: weak; meaning partially lost or inconsistent terminology.",
    "- 0-39: poor or unrelated.",
    `Write one concise sentence of feedback in ${input.targetLanguage}.`,
    "",
    "Reply with exactly these two lines and nothing else:",
    "SCORE: <integer 0-100>",
    "COMMENT: <one sentence>"
  ].join("\n");
}
function parseScore(raw) {
  const text = String(raw ?? "").trim();
  const clamp = (value2) => Math.max(0, Math.min(100, Math.round(value2)));
  const labeled = text.match(/(?:^|\n|\s)SCORE\s*[:：]\s*(\d{1,3})\b/i);
  if (labeled) {
    const commentMatch = text.match(/(?:^|\n|\s)COMMENT\s*[:：]\s*([^\n]+)/i) ?? text.match(/(?:评语|点评)\s*[:：]\s*([^\n]+)/);
    return {
      score: clamp(Number(labeled[1])),
      comment: commentMatch ? commentMatch[1].trim() : ""
    };
  }
  let parsed;
  try {
    parsed = parseJsonLoose(text);
  } catch {
    parsed = void 0;
  }
  const value = Number(parsed && (parsed.score ?? parsed.Score));
  if (Number.isFinite(value)) {
    const comment = typeof parsed?.comment === "string" ? parsed.comment.trim() : typeof parsed?.reason === "string" ? parsed.reason.trim() : "";
    return { score: clamp(value), comment };
  }
  const cjkLabeled = text.match(/(?:得分|分数|评分)\s*[:：是为]?\s*(\d{1,3})\b/);
  if (cjkLabeled) {
    return { score: clamp(Number(cjkLabeled[1])), comment: "" };
  }
  const error = new Error("The scoring reply did not contain a SCORE line.");
  error.code = "LLM_BAD_SCORE";
  error.detail = text.slice(0, 300);
  throw error;
}
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal && signal.aborted) {
      const error = new Error("The model call was cancelled.");
      error.name = "AbortError";
      reject(error);
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      const error = new Error("The model call was cancelled.");
      error.name = "AbortError";
      reject(error);
    };
    const cleanup = () => {
      if (signal) signal.removeEventListener("abort", onAbort);
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}
class TranslationEngine {
  /**
   * @param {object} deps - engine dependencies.
   * @param {{ stream: (options: object) => AsyncIterable<object> }} deps.llm - abstract LLM service.
   * @param {() => ({ provider: string, model: string, reasoningEffort?: string } | undefined)} deps.resolveTarget - current model route.
   * @param {object} [deps.settings] - resolved plugin settings.
   */
  constructor(deps) {
    this.llm = deps.llm;
    this.resolveTarget = deps.resolveTarget;
    this.settings = deps.settings ?? {};
  }
  /**
   * Resolve the route for one call: an explicit per-request override wins over
   * the configured/default route, so the page can switch models without
   * touching the plugin config.
   * @param {{ provider?: string, model?: string, reasoningEffort?: string } | null} [route] - requested route.
   * @returns {{ provider: string, model: string, reasoningEffort?: string } | undefined} current route.
   */
  target(route) {
    const picked = route && typeof route === "object" && route.provider && route.model ? route : void 0;
    const target = picked ?? this.resolveTarget();
    if (!target || !target.provider || !target.model) return void 0;
    return target;
  }
  /**
   * @param {{ provider?: string, model?: string } | null} [route] - requested route.
   * @returns {string | null} `provider/model` label for the resolved route.
   */
  modelLabel(route) {
    const target = this.target(route);
    return target ? `${target.provider}/${target.model}` : null;
  }
  /**
   * Stream one completion and return its concatenated text.
   * @param {object} request - completion request.
   * @param {string} request.system - system prompt.
   * @param {string} request.user - user prompt.
   * @param {string} [request.spec] - workspace guidelines prepended to the prompt.
   * @param {number} [request.maxTokens] - output token limit.
   * @param {{ provider?: string, model?: string, reasoningEffort?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string>} trimmed completion text.
   */
  async _streamOnce(request) {
    const target = this.target(request.route);
    if (!target) {
      const error = new Error(
        "No model route is available. Set provider and model in the plugin config, or choose a default model first."
      );
      error.code = NO_MODEL_CODE;
      throw error;
    }
    const user = request.spec && String(request.spec).trim() ? `${specBlock(request.spec)}

${request.user}` : request.user;
    const content = Array.isArray(request.content) && request.content.length > 0 ? request.content : [{ type: "text", text: user }];
    const options = {
      provider: target.provider,
      model: target.model,
      messages: [{ role: "user", content }],
      system: request.system,
      maxTokens: request.maxTokens ?? this.settings.maxTokens ?? 8192,
      ...target.reasoningEffort ? { reasoningEffort: target.reasoningEffort } : {},
      ...request.signal ? { signal: request.signal } : {}
    };
    let text = "";
    let finish;
    let reasoning = "";
    for await (const chunk of this.llm.stream(options)) {
      if (!chunk || typeof chunk !== "object") continue;
      if (chunk.type === "text-delta") text += chunk.text;
      else if (chunk.type === "reasoning-delta") reasoning += chunk.text;
      else if (chunk.type === "finish") finish = chunk.reason;
    }
    if (finish && finish.kind === "error") {
      const failure = finish.failure ?? {};
      const error = new Error(failure.message || "The model call failed.");
      if (failure.code) error.code = failure.code;
      if (failure.status) error.status = failure.status;
      throw error;
    }
    if (finish && finish.kind === "aborted") {
      const error = new Error("The model call was cancelled.");
      error.name = "AbortError";
      throw error;
    }
    if (finish && finish.kind === "max-tokens") {
      const error = new Error("The model reply was cut off by the output token limit.");
      error.code = "LLM_TRUNCATED";
      throw error;
    }
    if (!text.trim()) {
      const error = new Error(
        reasoning.trim() ? "The model produced reasoning but no answer text; the output token budget may be too small." : "The model returned an empty reply."
      );
      error.code = "LLM_EMPTY";
      throw error;
    }
    return text.trim();
  }
  /**
   * Stream one completion, retrying transient provider failures.
   * @param {object} request - completion request.
   * @param {string} request.system - system prompt.
   * @param {string} request.user - user prompt.
   * @param {string} [request.spec] - workspace guidelines prepended to the prompt.
   * @param {number} [request.maxTokens] - output token limit.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string>} trimmed completion text.
   */
  async _complete(request) {
    const maxRetries = Math.max(0, Math.min(3, this.settings.maxRetries ?? 1));
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await this._streamOnce(request);
      } catch (error) {
        if (isAbortError(error) || error.code === NO_MODEL_CODE) throw error;
        lastError = error;
        const status = Number(error.status);
        const retryable = error.code === "LLM_EMPTY" || !Number.isFinite(status) || status === 429 || status >= 500;
        if (!retryable || attempt === maxRetries) throw error;
        await delay(500 * (attempt + 1), request.signal);
      }
    }
    throw lastError;
  }
  /**
   * Translate a batch of segments in input order.
   * @param {object} request - batch request.
   * @param {readonly string[]} request.segments - source segments.
   * @param {'sentence' | 'paragraph'} request.kind - segment kind.
   * @param {string} request.targetLanguage - target language name.
   * @param {string} [request.sourceLanguage] - source language name.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string[]>} translations aligned with `segments`.
   */
  async translateBatch(request) {
    const segments = (request.segments ?? []).map((segment) => String(segment));
    if (segments.length === 0) return [];
    const chunkSize = request.kind === "paragraph" ? this.settings.paragraphChunk ?? 6 : this.settings.sentenceChunk ?? 16;
    const chunks = [];
    for (let index = 0; index < segments.length; index += chunkSize) {
      chunks.push(segments.slice(index, index + chunkSize));
    }
    const translatedChunks = await mapLimit(
      chunks,
      this.settings.concurrency ?? 3,
      (chunk) => this._translateChunk({ ...request, chunk })
    );
    return translatedChunks.flat();
  }
  /**
   * Translate a whole document in one call, letting the model see the full
   * context. With `paragraphs` the request rides the JSON-array protocol and
   * the reply is a validated array aligned with the input, falling back to
   * per-paragraph calls when the model does not line up. With a legacy
   * `source` string the reply keeps the paragraph structure and alignment is
   * the caller's job.
   * @param {object} request - document translation request.
   * @param {readonly string[]} [request.paragraphs] - source paragraphs in order.
   * @param {string} [request.source] - full document text (legacy form).
   * @param {string} request.targetLanguage - target language name.
   * @param {string} [request.sourceLanguage] - source language name.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string[] | string>} aligned translations for the array
   *   form; the translated document for the legacy string form.
   */
  async translateDocument(request) {
    const paragraphs = Array.isArray(request.paragraphs) ? request.paragraphs.map((paragraph) => String(paragraph)).filter((paragraph) => paragraph.trim()) : null;
    if (paragraphs) {
      if (paragraphs.length === 0) return [];
      try {
        const raw = await this._complete({
          system: TRANSLATE_SYSTEM,
          user: documentBatchPrompt(paragraphs, request.targetLanguage, request.sourceLanguage),
          // A whole document needs a much larger output budget than a chunk;
          // leave it on the general default instead of the per-chunk caps.
          maxTokens: void 0,
          route: request.route,
          signal: request.signal,
          spec: request.spec
        });
        const parsed = parseJsonLoose(raw);
        if (Array.isArray(parsed) && parsed.length === paragraphs.length && parsed.every((item) => typeof item === "string" && item.trim())) {
          return parsed.map((item) => item.trim());
        }
      } catch (error) {
        if (isAbortError(error) || error.code === NO_MODEL_CODE) throw error;
      }
      return mapLimit(paragraphs, 2, async (segment) => {
        const text2 = await this._complete({
          system: TRANSLATE_SYSTEM,
          user: singleTranslatePrompt(segment, "paragraph", request.targetLanguage, request.sourceLanguage),
          route: request.route,
          signal: request.signal,
          spec: request.spec
        });
        return stripWrapping(text2);
      });
    }
    const text = await this._complete({
      system: TRANSLATE_SYSTEM,
      user: documentTranslatePrompt(request.source, request.targetLanguage, request.sourceLanguage),
      // A whole document needs a much larger output budget than a chunk;
      // leave it on the general default instead of the per-chunk caps.
      maxTokens: void 0,
      route: request.route,
      signal: request.signal,
      spec: request.spec
    });
    return stripWrapping(text);
  }
  /**
   * Translate one chunk, falling back to single-segment calls when the model
   * does not return an aligned JSON array.
   * @param {object} request - chunk request.
   * @param {readonly string[]} request.chunk - chunk segments.
   * @param {'sentence' | 'paragraph'} request.kind - segment kind.
   * @param {string} request.targetLanguage - target language name.
   * @param {string} [request.sourceLanguage] - source language name.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string[]>} aligned translations for the chunk.
   */
  async _translateChunk(request) {
    const { chunk, kind, targetLanguage, sourceLanguage, signal } = request;
    let raw;
    try {
      raw = await this._complete({
        system: TRANSLATE_SYSTEM,
        user: batchTranslatePrompt(chunk, kind, targetLanguage, sourceLanguage),
        route: request.route,
        signal,
        spec: request.spec
      });
    } catch (error) {
      throw error;
    }
    let parsed;
    try {
      parsed = parseJsonLoose(raw);
    } catch {
      parsed = void 0;
    }
    if (Array.isArray(parsed) && parsed.length === chunk.length && parsed.every((item) => typeof item === "string" && item.trim().length > 0)) {
      return parsed.map((item) => item.trim());
    }
    return mapLimit(chunk, 2, async (segment) => {
      const text = await this._complete({
        system: TRANSLATE_SYSTEM,
        user: singleTranslatePrompt(segment, kind, targetLanguage, sourceLanguage),
        route: request.route,
        signal,
        spec: request.spec
      });
      return stripWrapping(text);
    });
  }
  /**
   * Retranslate one segment or a whole document, optionally following a user
   * instruction.
   * @param {object} request - retranslation request.
   * @param {string} request.source - source segment or document.
   * @param {string} [request.translation] - current translation.
   * @param {string} [request.extraPrompt] - user instruction.
   * @param {'sentence' | 'paragraph' | 'document'} [request.kind] - unit kind.
   * @param {string} request.targetLanguage - target language name.
   * @param {string} [request.sourceLanguage] - source language name.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string>} new translation.
   */
  async retranslate(request) {
    const isDocument = request.kind === "document";
    const text = await this._complete({
      system: RETRANSLATE_SYSTEM,
      user: retranslatePrompt({
        source: request.source,
        translation: request.translation,
        extraPrompt: request.extraPrompt,
        kind: isDocument ? "document" : request.kind === "paragraph" ? "paragraph" : "sentence",
        targetLanguage: request.targetLanguage,
        sourceLanguage: request.sourceLanguage
      }),
      // A whole document needs a much larger output budget than one segment;
      // leave the document kind on the general default instead of the
      // per-segment cap.
      maxTokens: isDocument ? void 0 : this.settings.retranslateMaxTokens ?? 4096,
      route: request.route,
      signal: request.signal,
      spec: request.spec
    });
    return stripWrapping(text);
  }
  /**
   * Score one translation on a 0-100 scale with a short comment.
   * @param {object} request - scoring request.
   * @param {string} request.source - source segment.
   * @param {string} request.translation - translation to evaluate.
   * @param {'sentence' | 'paragraph'} [request.kind] - segment kind.
   * @param {string} request.targetLanguage - target language name.
   * @param {string} [request.sourceLanguage] - source language name.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<{ score: number, comment: string }>} score and feedback.
   */
  async score(request) {
    return this._scoredReply({
      system: SCORE_SYSTEM,
      user: scorePrompt({
        source: request.source,
        translation: request.translation,
        kind: request.kind === "paragraph" ? "paragraph" : "sentence",
        targetLanguage: request.targetLanguage,
        sourceLanguage: request.sourceLanguage
      }),
      maxTokens: this.settings.scoreMaxTokens ?? 4096,
      route: request.route,
      signal: request.signal,
      spec: request.spec
    });
  }
  /**
   * Score a whole document translation on a 0-100 scale with a short comment.
   * @param {object} request - document scoring request.
   * @param {string} request.source - full source document.
   * @param {string} request.translation - full translated document.
   * @param {string} request.targetLanguage - target language name.
   * @param {string} [request.sourceLanguage] - source language name.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<{ score: number, comment: string }>} score and feedback.
   */
  async scoreDocument(request) {
    return this._scoredReply({
      system: SCORE_SYSTEM,
      user: scoreDocumentPrompt({
        source: request.source,
        translation: request.translation,
        targetLanguage: request.targetLanguage,
        sourceLanguage: request.sourceLanguage
      }),
      maxTokens: this.settings.scoreMaxTokens ?? 4096,
      route: request.route,
      signal: request.signal,
      spec: request.spec
    });
  }
  /**
   * Ask the vision model to transcribe one image.
   * @param {object} request - OCR request.
   * @param {{ attachment: object }} request.image - durable image attachment reference.
   * @param {{ provider?: string, model?: string } | null} [request.route] - per-call model override.
   * @param {AbortSignal} [request.signal] - caller cancellation.
   * @returns {Promise<string>} extracted text.
   */
  async ocr(request) {
    const target = this.target(request.route);
    if (!target) {
      const error = new Error(
        "No model route is available. Set provider and model in the plugin config, or choose a default model first."
      );
      error.code = NO_MODEL_CODE;
      throw error;
    }
    if (typeof this.llm.resolveModelInfo === "function") {
      let info;
      try {
        info = await this.llm.resolveModelInfo(target.provider, target.model, request.signal);
      } catch (error) {
        if (isAbortError(error)) throw error;
        info = void 0;
      }
      if (info && Array.isArray(info.inputModalities) && !info.inputModalities.includes("image")) {
        const error = new Error("The selected model cannot read images. Choose a vision-capable model.");
        error.code = NO_VISION_CODE;
        throw error;
      }
    }
    const text = await this._complete({
      system: OCR_SYSTEM,
      content: [
        { type: "image", attachment: request.image },
        { type: "text", text: ocrPrompt() }
      ],
      maxTokens: this.settings.ocrMaxTokens ?? 4096,
      route: request.route,
      signal: request.signal
    });
    return stripWrapping(text);
  }
  /**
   * Run one scoring prompt, retrying an unusable reply once.
   * @param {object} request - completion request plus scoring retry settings.
   * @returns {Promise<{ score: number, comment: string }>} score and feedback.
   */
  async _scoredReply(request) {
    const maxParseRetries = Math.max(0, Math.min(2, this.settings.scoreRetries ?? 1));
    let lastError;
    for (let attempt = 0; attempt <= maxParseRetries; attempt += 1) {
      try {
        const text = await this._complete({
          system: request.system,
          user: request.user,
          maxTokens: request.maxTokens ?? this.settings.scoreMaxTokens ?? 4096,
          route: request.route,
          signal: request.signal,
          spec: request.spec
        });
        return parseScore(text);
      } catch (error) {
        lastError = error;
        if (isAbortError(error) || error.code === NO_MODEL_CODE || error.code === NO_VISION_CODE) throw error;
        const isParseFailure = error.code === "LLM_BAD_SCORE" || error.code === "LLM_EMPTY";
        if (!isParseFailure || attempt === maxParseRetries) throw error;
        await delay(400, request.signal);
      }
    }
    throw lastError;
  }
}
export {
  NO_MODEL_CODE,
  NO_VISION_CODE,
  TranslationEngine,
  isAbortError,
  mapLimit,
  parseJsonLoose,
  parseScore,
  stripWrapping
};
