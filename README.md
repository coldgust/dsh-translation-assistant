# Translation Assistant (翻译助手)

A persistent DeepSeek Harness plugin that adds a translation workspace to the Web GUI.

## What it does

The plugin contributes a **翻译助手 / Translation Assistant** entry to the global panel list on the sidebar and renders its page in the main column:

- **Sentence and paragraph comparison** — one click translates the pasted source text at both granularities; the default tab is `逐段对比`, and `逐句对比` switches to sentences.
- **Full-text view, scoring, and copy** — a `全文` tab shows the complete translated document (paragraph translations joined), with `复制译文` / `复制原文` buttons and an `AI 全文评分` document-level score.
- **Image OCR translation** — paste a screenshot or pick an image; the vision model transcribes the text, puts it into the source box, and translates it. Images are downscaled in the browser before upload.
- **Editable translations** — every translated sentence/paragraph is a textarea; edits are kept in the browser (`localStorage`) and survive a page reload. Editing clears that segment's stale score.
- **AI retranslation** — `AI 重译` produces a fresh translation of a single sentence or paragraph.
- **Retranslate with an instruction** — `加提示词重译` opens an inline instruction field (for example “更口语化” or “保留法律术语”); the instruction is sent with the source and current translation.
- **Optional AI scoring** — scores are hidden by default. `AI 评分` scores one sentence/paragraph and reveals its score, `全部评分` scores the current view, and the `显示评分 / 隐藏评分` button toggles all fetched scores.
- **Agent tool** — the same engine is exposed as the `translation_assistant` tool (`action: translate | retranslate | score | score_document`), so the assistant can translate, refine, score a segment, or score a whole document in chat.

## How it works

| File | Role |
| --- | --- |
| `host/index.js` | Host half: registers the `/dsh-translation/api` JSON route and the `translation_assistant` Agent tool, resolves the model route. |
| `host/engine.js` | Prompt construction, streaming completion wrapper, retries, batched translation with per-segment fallback, retranslation, segment/document scoring, and image OCR. |
| `client.js` | Browser half: `main` page + sidebar panel icon, all interaction state and rendering. |
| `cordis.patch.yml` | Inserts the Host plugin row. |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title/description. |

The browser page talks to the Host half through same-origin `POST /dsh-translation/api/{translate,retranslate,score,score-document,ocr}` plus `GET /dsh-translation/api/health`. The Host half uses the abstract `llm` service and, unless `provider`/`model` are pinned in the plugin config, follows the profile's current default model selection.

## Configuration

All fields are optional and live in the plugin row (`cordis.patch.yml` / Plugin Manager):

| Field | Default | Meaning |
| --- | --- | --- |
| `provider`, `model` | current default selection | Exact model route for translation. |
| `reasoningEffort` | unset | Optional reasoning effort for the route. |
| `targetLanguage` | `中文` | Default target language. |
| `maxTokens` | `8192` | Output token limit for translation calls. |
| `retranslateMaxTokens`, `scoreMaxTokens` | `4096`, `4096` | Output token limits for retranslation and scoring. |
| `maxRetries`, `scoreRetries` | `1`, `1` | Retries for transient provider failures and unparsable scoring replies. |
| `ocrMaxTokens` | `4096` | Output token limit for image transcription. |
| `sentenceChunk`, `paragraphChunk`, `concurrency` | `16`, `6`, `3` | Batch sizes and parallel calls. |
| `tool` | `true` | Set `false` to hide the Agent tool. |

## Limits

- Segment limits: 400 segments, 20,000 characters per segment, 120,000 characters per request.
- Document scoring: up to 60,000 characters each for source and translation (120,000 combined).
- Images: PNG/JPEG/WebP/GIF, up to 12 MiB, 24 MiB request body; the page downscales large images first.
- Scoring asks for the stable `SCORE:` / `COMMENT:` two-line reply (JSON is accepted as a fallback) and retries once when the model breaks that shape.
- Scoring quality depends on the routed model; the score is a model judgement, not a certified metric.

## Development and verification

The workspace is the installed bundle itself (the profile links this directory), so editing `client.js` is picked up by the Web composition's artifact watcher and swapped into the open page; Host-half edits (`host/index.js`, `host/engine.js`) take effect after the next Harness restart.

```bash
# 48 unit/integration tests: engine (translation/retranslation/scoring/OCR),
# HTTP handler + Agent tool, and the page rendered through a minimal React harness.
node --test 'test/*.test.mjs'
```

Notes:

- AI scores are hidden on every mount; a segment's `AI 评分` button reveals that score, the full-text `AI 全文评分` button scores the document, and the toolbar toggle shows/hides all fetched scores.
- `全部评分` reveals scores up front and each sentence/paragraph shows its score the moment its own request settles, rather than waiting for the whole batch. Editing any segment resets the full-text score.
- OCR requires a vision-capable route; the page reports a localized hint when the selected model cannot read images.
- Manual edits are stored in `localStorage` together with the document; scores are always re-hidden after a reload.
- The page pre-checks the Host request limits (400 segments / about 120,000 characters) and reports oversized documents with a localized hint before any request is sent.
