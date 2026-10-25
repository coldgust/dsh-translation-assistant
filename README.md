# Translation Assistant

A DeepSeek Harness plugin that turns the Web GUI into a translation workspace: paste text, drop a file, or paste a screenshot, read the source and the translation side by side, edit the output, and let a second model review what a first one drafted. Everything stays on this device, and the model can be switched per request.

[中文](README.zh.md)

![The comparison workspace: source and translation side by side, scores visible](docs/screenshots/workspace.png)

## What you get

### Translate

- **Two views from one request** — `By paragraph` is the default; `By sentence` switches granularity. A single request returns both, so switching costs nothing.
- **Files** — drop or pick `.txt`, `.md`, `.log`, `.html`, `.htm`, or `.docx`. Word files are unpacked in the browser (no library, and the original never leaves the machine); HTML loses scripts, styles, and the head first, so only visible prose reaches the model.
- **Images** — paste a screenshot or pick one; it is downscaled to a 2048 px long edge, sent as JPEG, transcribed, and translated.

### Review and refine

- **Every segment is editable** — source and translation sit side by side and stay in step across all three views: editing a sentence re-joins its paragraph, editing a paragraph splits back over its sentences, and text is never cut mid-sentence.
- **Full text** — `Translation` (editable), `Source`, or `Compare` (side by side, stacked on narrow screens). Edits are split on blank lines and written back onto the matching segments; copying and document-level scoring live here.
- **Retranslate** — `AI retranslate` redoes one segment; `Retranslate with prompt` adds an instruction such as "more colloquial" or "keep the legal terms".
- **Score on demand** — scores stay hidden on every load. Score one segment, the current view, or the whole document, then reveal them from the toolbar. Editing a translation clears the score it invalidated.
- **Turn feedback into a rewrite** — `Apply suggestion` under a score sends that score and its comment back as the instruction for a fresh pass; `Apply all` does the same for every scored segment in the view, three at a time. While scores are hidden, no suggestion button is shown.

### Keep track

- **On-device history** — up to 200 documents with title, time, language pair, and segment counts. Search matches source or translation and quotes the hit in context; pin an entry to keep it on top, delete in two clicks.
- **Revisions** — up to 20 labelled snapshots per document: the machine baseline, one before every AI pass, one before each rollback. The drawer says how many segments differ from the current text, and `Restore` puts one back — the text it replaces is snapshotted too, so a rollback can itself be undone.

![The history drawer: search, pinned entries, and the document counts](docs/screenshots/history.png)

### Integrate

- **Model switching** — the header chip becomes a provider-grouped picker as soon as the Host advertises more than one model. `Follow default` keeps tracking the profile; any other entry pins that route for translation, retranslation, scoring, and OCR, and the choice is remembered on this device. A model that has since disappeared falls back to the default with a notice instead of failing every request. The [appendix](#appendix-adding-bilibilis-index-translate-models-as-a-route) shows how to register an outside endpoint.
- **Agent tool** — the same engine is exposed as `translation_assistant` (`action: translate | retranslate | score | score_document`), so the assistant can translate or review text in chat.

## Use cases

### One model drafts, another one reviews

Quality comes from separating the two jobs: draft cheap and fast, then judge and rewrite with the strongest model you can reach. The pick applies to translation, retranslation, scoring, and OCR, so the two halves of the job can even come from different providers.

1. Switch the header to a fast translation model — `Index-Translate-9B`, or `Index-Translate-2B` when there is a lot of text — and press `Translate`, or drop the file in.
2. Switch to the strongest model you have: `deepseek-reasoner`, `GPT-5`, or `Index-Translate-35B-A3B`.
3. Press `Show scores`, then `Score all`. Each segment comes back with a 0–100 score and one sentence of feedback.
4. Press `Apply all`, or `Apply suggestion` on a single segment. The rewrite is sent together with the score and its comment as the instruction, so the strong model fixes exactly what it criticised.
5. Open `Revisions` to compare the passes. Every AI rewrite left a snapshot, and restoring one is undoable in turn.

Scores are cached with the text: a rewrite drops the stale score, and editing a translation clears the score it invalidated, so step 3 only has to be repeated when the text actually changed.

![The revisions drawer: labelled passes, how far each one is from the current text](docs/screenshots/revisions.png)

### A whole document, end to end

Drop a `.docx`, `.md`, or `.html` file and it is translated in one request. The file name stays on the document, and `Download translation` writes the result back in the same shape: `.md` for Markdown, an HTML document for HTML, `.txt` for everything else. Blank-line structure survives, so the output opens the way the input did.

![Full text in compare mode, showing the imported file name and the download action](docs/screenshots/full-text.png)

## How it works

| File | Role |
| --- | --- |
| `host/index.js` | Host half: registers the `/dsh-translation/api` JSON route and the `translation_assistant` Agent tool, validates requests, resolves the model route. |
| `host/engine.js` | Prompt construction, streaming completion wrapper, retries, batched translation with per-segment fallback, retranslation, segment/document scoring, image OCR. No Harness imports, so it is unit-testable with a fake LLM stream. |
| `client.js` | Browser half: the `main` page, the sidebar panel icon, all interaction state and rendering. |
| `cordis.patch.yml` | Inserts the Host plugin row. |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title and description, in English and Chinese. |

The page talks to the Host through same-origin calls:

| Endpoint | Purpose |
| --- | --- |
| `GET /dsh-translation/api/health` | Service state, the resolved model label, the profile default, the switchable model list (grouped by provider), and per-provider listing failures. |
| `POST …/translate` | Translate a `sentences` / `paragraphs` array in one request. |
| `POST …/retranslate` | Redo one segment, optionally with `extraPrompt`. |
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
| `retranslateMaxTokens` | `4096` | Output limit for retranslation. |
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
| `dsh-translation-assistant:history:v1` | Up to 200 entries (~2 M characters), pinned first and then most recently used. Each entry carries its own revision snapshots (up to 20, 200,000 characters per document). |
| `dsh-translation-assistant:session:v1` | The id of the document that was open last. |
| `dsh-translation-assistant:prefs:v2` | Source/target language, comparison view, full-text display mode, and the picked model route (or `null` to follow the default). |
| `dsh-translation-assistant:document:v1` | Legacy single-document key from 1.1.x: adopted into history on first boot, then cleared. |

History, edits, and preferences never leave the browser; only the text being translated, retranslated, scored, or read from an image is sent to the model route. Clearing site data for the Harness origin erases the history — there is no server-side copy.

## Limits

- A translation request accepts up to 400 segments, 20,000 characters per segment, and 120,000 characters in total.
- Revisions keep the latest 20 snapshots per document within 200,000 characters; older snapshots are dropped first. They count against the history budget, so a heavily iterated document may evict older documents.
- Document scoring accepts up to 60,000 characters on each side (120,000 combined).
- Images: PNG, JPEG, WebP, or GIF, up to 12 MiB each and 24 MiB per request.
- Imported files: up to 8 MiB each, and the extracted text still has to fit the 120,000-character translation budget. `.docx` unpacking needs the browser's `DecompressionStream` (Chrome 80+, Firefox 113+, Safari 16.4+); elsewhere the page asks for `.txt`, `.md`, or `.html` instead.
- HTML import translates visible text only: scripts, styles, the head, and attributes are dropped. The downloaded HTML keeps one `<p>` per translated paragraph and does not restore inline markup such as links or emphasis.
- Scoring asks for the stable `SCORE:` / `COMMENT:` pair, falls back to JSON, and retries once when the model breaks that shape. A score is a model judgement, not a certified metric.

## Development and verification

This directory is the installed bundle (the profile links it), so `client.js` is picked up by the artifact watcher and swapped into the open page; Host changes (`host/index.js`, `host/engine.js`) apply after the next Harness restart.

```bash
# 86 unit/integration tests: engine (translation/retranslation/scoring/OCR),
# the HTTP handler, model-catalog discovery and route overrides, and the page
# rendered through a minimal React harness (no browser needed).
node --test 'test/*.test.mjs'
```

Notes for maintainers:

- The page pre-checks the Host limits (400 segments / about 120,000 characters) and explains an oversized document before a request is sent.
- Model discovery uses the documented `@deepseek-ai/dsh-llm` registry: `listProviders()` names the registered routes, then `listModels(providerId)` asks each adapter what it serves. `listModels` takes a provider id — calling it with no argument throws `NO_ADAPTER`, which is why a generic "call every list-like method" probe finds nothing on a current Host. One provider whose listing fails is reported in `modelFailures` and does not hide the others. The result is cached for 60 seconds and dropped on `llm/adapters-updated`, so adding a provider in Settings → Models shows up without a restart. Requests only pay for discovery when they carry a `route`.
- The picker groups candidates by provider (`optgroup`) once more than one provider is visible, and the `default` entry is labelled from the profile selection rather than from the route in use, so it keeps naming the real default after a switch.
- `.docx` reading is a small ZIP walker (central directory → local header → `DecompressionStream('deflate-raw')`) plus a tag stripper for `word/document.xml`; it deliberately ignores headers, footers, and comments. HTML reading is regex-based so it also runs in the Node test harness, where no DOM exists.
- Scores are hidden on every mount by design; only an explicit score request reveals them, and the toggle hides them again.
- A fresh boot opens the most recently used document, not the first pinned one. Loading an entry never bumps its timestamp; editing does.
- History pruning drops the oldest unpinned entries first, so pinned documents survive the count and character budgets.
- Revision snapshots record the document as it stood *before* a rewrite and are taken only when that text differs from the newest snapshot, so a batch pass adds one row rather than one per segment. Rollback snapshots the outgoing text first, which is what makes a rollback reversible.
- The screenshots in `docs/screenshots/` are the real page rendered against mocked Host data at 1280 px CSS width (2x, downscaled to 1600 px). Retake them the same way when a layout change makes them lie.
- When changing the page's CSS, remember it lives inside a template string: a backtick inside a CSS comment truncates the literal. Counting backticks (expected: 0) and comparing `{` / `}` totals catches it.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Header shows “Translation service not ready” | No default model is selected in Settings, or the provider is unreachable. Pick a default model and reload. |
| The header shows no model picker | Only one route was discovered, so there is nothing to switch to. The notice above the editor names the provider whose listing failed; a `models` list in the plugin config is the manual fallback. |
| “The selected model cannot read images” (HTTP 422) | The routed model cannot read images. Choose a vision-capable model. |
| Importing a `.docx` says the browser cannot unpack it | `DecompressionStream` is unavailable in that browser. Save the file as `.txt`, `.md`, or `.html` and import that. |
| The downloaded HTML has no styling or links | Expected: the page translates text, so the export keeps paragraphs only. Keep the original file if you need the markup. |
| `New translation` seems to have deleted the document | It does not: the document stays in history and the page opens a blank form. Open the header chip to switch back. |
| A rollback lost the newer wording | It does not: the text you left is stored as a `Before rollback` revision. Open `Revisions` again and restore it. |
| Edits disappeared after clearing browser data | History and edits live in `localStorage` only; there is no cloud copy. |

## Appendix: adding Bilibili's Index-Translate models as a route

### The model

[Index-Translate](https://index-translate.bilibili.com/?p=/site/translate.html&lang=zh) is Bilibili's open machine-translation model family, and that page is its online demo. It runs on vLLM and speaks standard OpenAI Chat Completions, so it can be registered as an ordinary custom provider; once it is, this plugin's header picker can select it directly.

- `Index-Translate-35B-A3B` — the flagship: a mixture-of-experts model (35B total parameters, 3B active) that translates between many languages and can also read text straight out of an image, which in this plugin means translation, retranslation, scoring, and OCR all work.
- `Index-Translate-9B` / `Index-Translate-2B` — smaller, faster text-only models for high volume.

The demo needs no API key and comes with no SLA, so treat it as a playground route.

### Method 1: the Web UI (recommended)

The most direct way, and what most users want.

1. Start the DeepSeek Harness Web UI: run `dsh web` and open the interface.
2. Open the model settings: click **Settings** in the sidebar, then **Models**.
3. Add a custom provider: click **Add a custom provider**.
4. Fill in the form:

   - **Provider ID**: `bilibili-translate` — a lowercase identifier you choose, used internally to recognise the provider
   - **Base URL**: `https://index-translate.bilibili.com/v1`
   - **Protocol**: `OpenAI Completions` (`openai-completions`)
   - **API Key**: any placeholder, for example `index`
   - **Models**: click **Fetch available models**; it should discover `Index-Translate-35B-A3B`. If that fails, add the model id by hand.

5. Save, then pick the Bilibili model from the model dropdown.

### Method 2: edit the settings file directly

For people who prefer files or want to script the setup. Edit `$DSH_HOME/settings.yaml` (usually `~/.dsh/settings.yaml`; on the desktop app the live file is `~/.dsh/profiles/desktop/cordis.patch.yml`) and add an entry under `providers` inside the `llm-pi-ai` section:

```yaml
llm-pi-ai:
  providers:
    bilibili-translate:                      # Provider ID
      apiKeyEnv: BILIBILI_TRANSLATE_API_KEY  # names an environment variable
      api: openai-completions
      baseURL: https://index-translate.bilibili.com/v1
      models:
        - id: Index-Translate-35B-A3B
```

Note that `apiKeyEnv` is a *reference*, not a value: the Harness process has to be able to read that variable. The endpoint ignores the key, so any non-empty value works. A Harness launched from Finder or the Dock does not inherit your shell environment, so if the variable cannot resolve, send the placeholder as a header instead:

```yaml
      headers:
        Authorization: Bearer index
```

### Verify

Restart Harness — providers are registered at boot. This plugin's header picker then gains a `bilibili-translate` group, and picking `Index-Translate-35B-A3B` pins it for translation, retranslation, scoring, and OCR. You can also check the endpoint directly:

```bash
curl http://127.0.0.1:<port>/dsh-translation/api/health
```

Entries under `models` with `provider: bilibili-translate` mean the route is live.

### Caveats

- A public demo deployment: no SLA, no published rate limit, and it may change or disappear. A playground route, not production capacity.
- Context is 24,576 tokens on the 35B, while this plugin accepts documents up to 120,000 characters. Batches are 6 paragraphs or 16 sentences, so normal documents fit; a single paragraph of tens of thousands of characters does not. Drop `concurrency` to `2` for the demo endpoint.
- Do not paste a real key. The endpoint ignores it, and whatever you type is stored in your local credential store.
