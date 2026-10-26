# Reference: architecture, configuration, storage, limits, and development

## How it works

| File | Role |
| --- | --- |
| `host/index.js` | Host half: registers the `/dsh-translation/api` JSON route and the `translation_assistant` Agent tool, validates requests, resolves the model route. |
| `host/engine.js` | Prompt construction, streaming completion wrapper, retries, batched translation with per-segment fallback, retranslation, segment/document scoring, image OCR. No Harness imports, so it is unit-testable with a fake LLM stream. |
| `client.js` | Browser half: the `main` page, the sidebar panel icon, all interaction state and rendering. |
| `package.json` | Bundle declaration: `dsh.bundle.patch` points at the shipped `cordis.patch.yml`, `dsh.client` names the browser entry and the sidebar package it injects into. |
| `cordis.patch.yml` | Inserts the Host plugin row. |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title and description, in English and Chinese. |

The page talks to the Host through same-origin calls:

| Endpoint | Purpose |
| --- | --- |
| `GET /dsh-translation/api/health` | Service state, the resolved model label, the profile default, the switchable model list (grouped by provider), and per-provider listing failures. |
| `POST …/translate` | Translate a `sentences` / `paragraphs` array in one request; or a whole `document` in a single call — the raw text, answered with a document that keeps the paragraph structure, or a paragraph array answered with an aligned array. |
| `POST …/retranslate` | Redo one segment or the whole document (`kind: document`), optionally with `extraPrompt`. |
| `POST …/score` | Score one segment (0–100 plus a one-sentence comment). |
| `POST …/score-document` | Score a whole source/translation pair. |
| `POST …/ocr` | Transcribe an image (`image` as base64 + media type). |

POSTs are rejected when the `Origin` header names a different origin, and the request body is capped at 24 MiB. Every POST accepts an optional `route: { provider, model }`; omitting it follows the configured or profile-default route. A route that is not in the advertised catalog is rejected with HTTP 400 before any model call, unless the catalog itself is empty (discovery failed), in which case the model service has the final say.

## Configuration

All fields are optional and live in the plugin row (`cordis.patch.yml` or Plugin Manager):

| Field | Default | Meaning |
| --- | --- | --- |
| `provider`, `model` | current default selection | Exact model route for all calls. |
| `reasoningEffort` | unset | Optional reasoning effort passed to the route. |
| `models` | unset (discovery) | Extra routes for the header picker, for example `[{ provider: deepseek-account, model: deepseek-pro, label: Pro }]`. Merged with what the Host's LLM registry advertises; the routes in use are always listed. |
| `targetLanguage` | Chinese | Default target language. |
| `sourceLanguage` | unset (auto-detect) | Default source language; the page can override it. |
| `maxTokens` | `8192` | Output limit for translation calls. |
| `retranslateMaxTokens` | `4096` | Output limit for per-segment retranslation; whole-document retranslation (coherence/alignment modes) uses the general default. |
| `scoreMaxTokens` | `4096` | Output limit for scoring. |
| `ocrMaxTokens` | `4096` | Output limit for image transcription. |
| `maxRetries` | `1` | Retries for transient provider failures. |
| `scoreRetries` | `1` | Retries when a scoring reply cannot be parsed. |
| `sentenceChunk`, `paragraphChunk` | `16`, `6` | Segments per translation batch. |
| `concurrency` | `3` | Batches in flight at once. |
| `tool` | `true` | Set `false` to hide the Agent tool. |

## Data kept on this device

| Key | Content |
| --- | --- |
| `dsh-translation-assistant:history:v1` | Up to 200 entries (~2 M characters), pinned first and then most recently used. Each entry carries its own revision snapshots (up to 100, 200,000 characters per document). |
| `dsh-translation-assistant:session:v1` | The id of the document that was open last. |
| `dsh-translation-assistant:prefs:v2` | Source/target language, comparison view, full-text display mode, the translation mode, the picked model route (or `null` to follow the default), and the workspace root with its output settings. |
| `dsh-translation-assistant:document:v1` | Legacy single-document key from 1.1.x: adopted into history on first boot, then cleared. |

History, edits, and preferences never leave the browser; only the text being translated, retranslated, scored, or read from an image is sent to the model route. Clearing site data for the Harness origin erases the history — there is no server-side copy.

## Limits

- A translation request accepts up to 400 segments, 20,000 characters per segment, and 120,000 characters in total. Whole-document requests cap at 60,000 characters; anything longer switches to batching automatically.
- Revisions keep the latest 100 snapshots per document within 200,000 characters; older snapshots are dropped first. They count against the history budget, so a heavily iterated document may evict older documents.
- Document scoring accepts up to 60,000 characters on each side (120,000 combined).
- Images: PNG, JPEG, WebP, or GIF, up to 12 MiB each and 24 MiB per request.
- Imported files: up to 8 MiB each, and the extracted text still has to fit the 120,000-character translation budget. `.docx` unpacking needs the browser's `DecompressionStream` (Chrome 80+, Firefox 113+, Safari 16.4+); elsewhere the page asks for `.txt`, `.md`, or `.html` instead.
- Workspace files: reads accept `.txt`, `.text`, `.md`, `.markdown`, `.log`, `.html`, `.htm`, `.xhtml`, and (read-only) `.docx`; writes are text-only, 8 MiB per write; listings walk at most 6 levels deep and return 500 files.
- Translation guidelines: a `.translation-spec/` folder in the workspace root holds `.md` documents that ride along on every translate, retranslate, score, and rewrite request (up to 20 docs, 64 KiB each, 256 KiB total; the rest is skipped). The drawer can view, edit, create, and delete them; attaching is on by default and can be switched off.
- HTML import translates visible text only: scripts, styles, the head, and attributes are dropped. The downloaded HTML keeps one `<p>` per translated paragraph and does not restore inline markup such as links or emphasis.
- Scoring asks for the stable `SCORE:` / `COMMENT:` pair, falls back to JSON, and retries once when the model breaks that shape. A score is a model judgement, not a certified metric.

## Development and verification

This directory is the installed bundle (the profile links it), so `client.js` is hot-swapped into the open page; Host changes need a Harness restart.

```bash
# 134 unit/integration tests: engine (translation/retranslation/scoring/OCR),
# the HTTP handler, model-catalog discovery and route overrides, the workspace
# file endpoints, and the page rendered through a minimal React harness (no
# browser needed).
node --test 'test/*.test.mjs'
```

Notes for maintainers:

- The page pre-checks the Host limits (400 segments / about 120,000 characters) and explains an oversized document before a request is sent.
- Model discovery uses the documented `@deepseek-ai/dsh-llm` registry: `listProviders()` names the registered routes, then `listModels(providerId)` asks each adapter what it serves. Calling `listModels` with no argument throws `NO_ADAPTER`, so a generic probe finds nothing on a current Host. One provider whose listing fails is reported in `modelFailures` and does not hide the others. Results are cached for 60 seconds and dropped on `llm/adapters-updated`; discovery only runs for requests that carry a `route`.
- The picker groups candidates by provider once more than one is visible; the `default` entry always names the profile default, regardless of the route in use.
- `.docx` reading is a small ZIP walker (central directory → local header → `DecompressionStream('deflate-raw')`) plus a tag stripper for `word/document.xml`; headers, footers, and comments are ignored. HTML reading is regex-based so it runs in the Node test harness.
- The workspace service (`host/workspace.js`) resolves every path against the root and rejects escapes (symlinks included), whitelists extensions tighter for writes than reads, and caps sizes and listing results.
- Scores are hidden on every mount by design; only an explicit score request reveals them.
- A fresh boot opens the most recently used document. Loading an entry never bumps its timestamp; editing does.
- History pruning drops the oldest unpinned entries first, so pinned documents survive the budgets.
- Revision snapshots record the document as it stood *before* a rewrite and are skipped when that text equals the newest snapshot, so a batch pass adds one row.
- The screenshots in `docs/screenshots/` are the real page rendered against mocked Host data at 1280 px CSS width (2x, downscaled to 1600 px). Retake them after layout changes.
- The page's CSS lives inside a template string: a backtick inside a CSS comment truncates the literal. Count backticks (expected: 0) and compare `{` / `}` totals.
