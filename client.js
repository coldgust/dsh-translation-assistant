/**
 * Browser half of the Translation Assistant bundle.
 *
 * Registers a global panel entry in the sidebar and its page in the `main`
 * slot. The page keeps the whole document (source, sentence/paragraph
 * translations, scores) in component state plus `localStorage`, and calls the
 * Host half through the JSON API it serves at `/dsh-translation/api`.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-translation-assistant',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'translationAssistant';
    const PANEL_ID = 'translation-assistant';
    const API = '/dsh-translation/api';
    const DOC_STORAGE = 'dsh-translation-assistant:document:v1';
    const PREFS_STORAGE = 'dsh-translation-assistant:prefs:v2';
    // Mirrors the Host request limits so an oversized document fails with a
    // localized hint before a round trip.
    const MAX_SEGMENTS = 400;
    const MAX_TOTAL_CHARS = 120_000;
    const MAX_FULL_SCORE_CHARS = 60_000;

    const LANGUAGES = [
      '中文',
      '繁體中文',
      'English',
      '日本語',
      '한국어',
      'Français',
      'Deutsch',
      'Español',
      'Русский',
    ];

    const zh = {
      panel: '翻译助手',
      title: '翻译助手',
      intro: '以逐段对照为主，也可切到逐句：译文可直接修改，AI 可以重译某段或某句，也能按追加的提示词重译；支持识别图片文字来翻译、一键复制全文并给全文评分。评分默认隐藏。',
      sourceLanguage: '原文语言',
      targetLanguage: '目标语言',
      autoDetect: '自动检测',
      sourcePlaceholder: '粘贴或输入原文，用空行分段；也可粘贴截图或选择图片识别翻译。',
      targetPlaceholder: 'AI 译文会出现在这里，可直接修改',
      translate: '开始翻译',
      translating: '正在翻译…',
      footerHint: '评分由 AI 判断，仅供参考；点“AI 评分”或“显示评分”即可查看。',
      reset: '重新输入',
      sourceLabel: '原文',
      translationLabel: '译文',
      editHint: '可直接编辑',
      sentences: '逐句对比',
      paragraphs: '逐段对比',
      viewLabel: '对照视图',
      sentenceUnitOne: '句',
      sentenceUnitMany: '句',
      paragraphUnitOne: '段',
      paragraphUnitMany: '段',
      retranslate: 'AI 重译',
      retranslating: '重译中…',
      addPrompt: '加提示词重译',
      promptPlaceholder: '例如：更口语化 / 保留术语 / 不超过 20 字',
      promptConfirm: '按提示词重译',
      promptCancel: '取消',
      scoreLabel: 'AI 评分',
      score: 'AI 评分',
      rescore: '重新评分',
      scoring: '评分中…',
      scoreAll: '全部评分',
      scoreAllProgress: '评分中 {done}/{total}',
      showScores: '显示评分',
      hideScores: '隐藏评分',
      noSource: '请先输入原文。',
      noTranslationYet: '这一段还没有译文，请先翻译或手动填写。',
      requestFailed: '请求失败，请稍后重试。',
      networkError: '无法连接翻译服务，请确认插件已启用后刷新页面。',
      retranslateFailed: '重译没有返回有效译文。',
      scoreFailed: '评分没有返回有效结果。',
      invalidRequest: '请求内容不符合要求，请检查原文后重试。',
      tooLarge: '内容过大，请压缩图片或拆分文本后重试。',
      tooLongDoc: '原文过长：单次最多 400 句/段或约 12 万字符，请拆分后分次翻译。',
      noModelAvailable: '服务或模型暂不可用，请确认已在设置中选择默认模型。',
      engineFailed: 'AI 服务暂时不可用，请稍后重试。',
      requestRejected: '请求被拒绝，请重试。',
      languageChangeHint: '语言切换会影响后续重译、评分和图片识别；如需整体重译，请点“重新输入”。',
      saveHint: '译文修改会自动保存在本机浏览器。',
      modelLabel: '模型',
      modelUnknown: '未检测到可用模型',
      engineOnline: '翻译服务已就绪',
      engineOffline: '翻译服务未就绪',
      charUnitOne: '字符',
      charUnitMany: '字符',
      fullText: '全文',
      fullTextHint: '这里是完整译文，可一键复制；修改任一段后，全文评分会重置。',
      copyTranslation: '复制译文',
      copySource: '复制原文',
      copied: '已复制',
      copyFailed: '复制失败，请手动选择文本复制。',
      emptyFull: '还没有译文，先点击“开始翻译”。',
      imageTranslate: '图片翻译',
      ocrReading: '正在识别图片中的文字…',
      ocrEmpty: '没有从图片里识别到文字，换一张清晰些的图片试试。',
      imageTypeError: '请选择 PNG、JPEG、WebP 或 GIF 图片。',
      imageTooLarge: '图片太大，请压缩后再试。',
      scoreFull: 'AI 全文评分',
      noVision: '当前模型不支持图片识别，请先在设置里换用支持图片的模型。',
      ocrHint: '识别后会直接翻译；识别结果可在原文框里手动调整。',
      fullScoreTooLong: '原文或全文译文超过 6 万字符，请精简后再做全文评分。',
      noTranslationFull: '还没有可评分的全文译文，先完成翻译。',
      imageUnreadable: '图片无法读取，请换一张图片试试。',
    };

    const en = {
      panel: 'Translation Assistant',
      title: 'Translation Assistant',
      intro: 'Paragraph comparison by default, with a sentence view one click away. Edit translations directly, ask AI to retranslate a segment or follow your instruction, translate text from an image, copy the full text, and score the whole document. Scores stay hidden until you ask.',
      sourceLanguage: 'Source language',
      targetLanguage: 'Target language',
      autoDetect: 'Auto-detect',
      sourcePlaceholder: 'Paste or type the source text (blank lines split paragraphs), or paste a screenshot / choose an image to translate.',
      targetPlaceholder: 'The AI translation appears here; edit it freely',
      translate: 'Translate',
      translating: 'Translating…',
      footerHint: 'Scores are AI judgements for reference only; reveal them with “AI score” or “Show scores”.',
      reset: 'New text',
      sourceLabel: 'Source',
      translationLabel: 'Translation',
      editHint: 'editable',
      sentences: 'By sentence',
      paragraphs: 'By paragraph',
      viewLabel: 'Comparison view',
      sentenceUnitOne: 'sentence',
      sentenceUnitMany: 'sentences',
      paragraphUnitOne: 'paragraph',
      paragraphUnitMany: 'paragraphs',
      retranslate: 'AI retranslate',
      retranslating: 'Retranslating…',
      addPrompt: 'Retranslate with instruction',
      promptPlaceholder: 'e.g. more colloquial / keep terminology / under 20 words',
      promptConfirm: 'Retranslate',
      promptCancel: 'Cancel',
      scoreLabel: 'AI score',
      score: 'AI score',
      rescore: 'Rescore',
      scoring: 'Scoring…',
      scoreAll: 'Score all',
      scoreAllProgress: 'Scoring {done}/{total}',
      showScores: 'Show scores',
      hideScores: 'Hide scores',
      noSource: 'Enter the source text first.',
      noTranslationYet: 'This segment has no translation yet. Translate it or fill it in first.',
      requestFailed: 'The request failed. Please try again.',
      networkError: 'Cannot reach the translation service. Make sure the plugin is enabled, then reload the page.',
      retranslateFailed: 'Retranslation did not return usable text.',
      scoreFailed: 'Scoring did not return a usable result.',
      invalidRequest: 'The request is invalid. Check the input and try again.',
      tooLarge: 'Content is too large. Compress the image or split the text, then retry.',
      tooLongDoc: 'This source is too long: up to 400 segments or about 120,000 characters per request. Split it into parts.',
      noModelAvailable: 'The service or model is unavailable. Make sure a default model is selected.',
      engineFailed: 'The AI service is temporarily unavailable. Try again later.',
      requestRejected: 'The request was refused. Please try again.',
      languageChangeHint: 'Language changes affect later retranslation, scoring, and image OCR. Use “New text” to translate everything again.',
      saveHint: 'Edits are saved automatically in this browser.',
      modelLabel: 'Model',
      modelUnknown: 'No model route detected',
      engineOnline: 'Translation service ready',
      engineOffline: 'Translation service not ready',
      charUnitOne: 'character',
      charUnitMany: 'characters',
      fullText: 'Full text',
      fullTextHint: 'The complete translation, ready to copy. Changing any segment resets the full-text score.',
      copyTranslation: 'Copy translation',
      copySource: 'Copy source',
      copied: 'Copied',
      copyFailed: 'Copy failed. Select the text and copy it manually.',
      emptyFull: 'No translation yet. Click “Translate” first.',
      imageTranslate: 'Translate image',
      ocrReading: 'Reading the image…',
      ocrEmpty: 'No readable text was found in the image. Try a clearer one.',
      imageTypeError: 'Choose a PNG, JPEG, WebP, or GIF image.',
      imageTooLarge: 'The image is too large. Compress it and try again.',
      scoreFull: 'AI full-text score',
      noVision: 'The selected model cannot read images. Choose a vision-capable model in Settings.',
      ocrHint: 'Recognized text is translated right away; adjust it in the source box if needed.',
      fullScoreTooLong: 'The source or full translation exceeds 60,000 characters; shorten it before scoring the document.',
      noTranslationFull: 'There is no full translation to score yet. Translate first.',
      imageUnreadable: 'This image could not be read. Try another file.',
    };

    /** @param {...unknown} values - class names to combine. @returns {string} class string. */
    function cx(...values) {
      return values.filter(Boolean).join(' ');
    }

    /**
     * Read a JSON value from localStorage.
     * @param {string} key - storage key.
     * @param {unknown} fallback - value when missing or unreadable.
     * @returns {unknown} parsed value.
     */
    function readStorage(key, fallback) {
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
    function writeStorage(key, value) {
      try {
        if (value === null || value === undefined) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage can be full or disabled; the page keeps working in memory.
      }
    }

    /**
     * Split text into paragraphs on blank lines.
     * @param {string} text - source text.
     * @returns {string[]} trimmed paragraphs.
     */
    function splitParagraphs(text) {
      return String(text)
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n+/)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    /**
     * Split one Latin-script chunk on sentence-ending punctuation followed by a
     * capital letter or digit.
     * @param {string} chunk - text chunk.
     * @returns {string[]} sentence pieces.
     */
    function splitLatinSentences(chunk) {
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
    function splitSentences(text) {
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
    function normalizeDoc(value) {
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

    /**
     * Call one JSON endpoint of the Host half.
     * @param {string} action - endpoint name.
     * @param {object} payload - JSON request body.
     * @returns {Promise<object>} parsed response.
     */
    async function requestJson(action, payload) {
      let response;
      try {
        response = await fetch(`${API}/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        const error = new Error('network');
        error.code = 'NETWORK';
        throw error;
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
    function localError(message) {
      const error = new Error(message);
      error.code = 'LOCAL';
      return error;
    }

    /**
     * Turn an error into a localized message.
     * @param {unknown} error - thrown value.
     * @param {(key: string, vars?: object) => string} t - translator.
     * @returns {string} message.
     */
    function describeError(error, t) {
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
    function format(template, vars) {
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
    async function mapLimit(items, limit, worker) {
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
     * Pick one translation out of a Host response array.
     * @param {unknown} list - response array.
     * @param {number} index - item index.
     * @returns {string} translation or an empty string.
     */
    function pick(list, index) {
      return Array.isArray(list) && typeof list[index] === 'string' ? list[index] : '';
    }

    /**
     * Choose a score tone for styling.
     * @param {number} value - score 0-100.
     * @returns {'good' | 'ok' | 'bad'} tone.
     */
    function scoreTone(value) {
      if (value >= 85) return 'good';
      if (value >= 70) return 'ok';
      return 'bad';
    }

    /**
     * Suggest a textarea row count from its content length.
     * @param {string} text - current translation.
     * @returns {number} row count between 2 and 9.
     */
    function rowsFor(text) {
      const length = String(text || '').length;
      return Math.min(9, Math.max(2, Math.ceil(length / 42) + 1));
    }

    /**
 * Join the paragraph (or fallback sentence) translations into the full document text.
 * @param {object | null} doc - current document.
 * @returns {string} full translation text.
 */
function buildFullTranslation(doc) {
  if (!doc) return '';
  const source = doc.paragraphs.some((item) => item.translation.trim()) ? doc.paragraphs : doc.sentences;
  return source
    .map((item) => item.translation.trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Encode bytes as base64 without blowing the call stack on large images.
 * @param {Uint8Array} bytes - raw bytes.
 * @returns {string} base64 text.
 */
function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

/** Small pulsing indicator used while the Host is working. */
    function BusyDot() {
      return h('span', { className: 'dta-dot', 'aria-hidden': true });
    }

    /**
     * One language `<select>`.
     * @param {object} props - component props.
     * @returns {object} element.
     */
    function LanguageSelect(props) {
      const { label, value, onChange, includeAuto, t } = props;
      return h('label', { className: 'dta-field' },
        h('span', { className: 'dta-fieldLabel' }, label),
        h('select', { className: 'dta-select', value, onChange: (event) => onChange(event.target.value) },
          includeAuto ? h('option', { value: 'auto' }, t('autoDetect')) : null,
          LANGUAGES.map((language) => h('option', { key: language, value: language }, language)),
        ),
      );
    }

    /** Sidebar panel icon. */
    function TranslationPanelIcon(props) {
      const size = typeof props.size === 'number' ? props.size : 18;
      return h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', {
          d: 'M3.5 5.5h8M7.5 3.2v2.3c0 3.6-2.1 6.5-4.7 7.9',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M5.4 9.3c1 2.2 2.7 3.9 4.9 4.9',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M12.6 20.2 16 11.4h1.5l3.4 8.8',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M14.2 16.9h5.1',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
        }),
      );
    }

    const CSS = `
.dta-page{box-sizing:border-box;height:100%;display:flex;flex-direction:column;align-items:center;gap:18px;padding:0 clamp(20px,4vw,48px) 40px;overflow:auto;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
.dta-page>*{width:100%;max-width:1100px;box-sizing:border-box}
.dta-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-top:28px;flex-wrap:wrap}
[data-platform="darwin"] .dta-head{padding-top:calc(28px + var(--dsh-frame-top-clearance,0px))}
.dta-headMain{min-width:0;max-width:100%}
.dta-title{margin:0;font-size:20px;font-weight:500;line-height:28px}
.dta-intro{max-width:760px;margin:4px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.dta-engine{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.dta-engineDot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}
.dta-engine[data-state="unknown"] .dta-engineDot{background:var(--dsw-alias-state-idle-primary)}
.dta-card{display:flex;flex-direction:column;gap:12px;padding:16px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-bg-layer-1)}
.dta-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dta-field{display:inline-flex;align-items:center;gap:6px}
.dta-fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.dta-select{height:30px;max-width:180px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}
.dta-select:disabled{opacity:.55;cursor:default}
.dta-textarea{box-sizing:border-box;width:100%;min-height:168px;padding:12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.7;outline:none}
.dta-textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.dta-input{box-sizing:border-box;flex:1;min-width:180px;height:30px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}
.dta-input:focus{border-color:var(--dsw-alias-brand-primary)}
.dta-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}
.dta-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin-right:auto}
.dta-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1;white-space:nowrap;cursor:pointer}
.dta-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.dta-btn:disabled{opacity:.55;cursor:default}
.dta-btn--primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}
.dta-btn--primary:hover:not(:disabled){border-color:transparent;background:var(--dsw-alias-brand-primary);opacity:.9}
.dta-btn--ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.dta-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dta-btn--sm{height:26px;padding:0 9px;font-size:12px}
.dta-btn[aria-pressed="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
.dta-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dta-toolbarSpacer{flex:1 1 0;min-width:0}
.dta-tabs{display:inline-flex;gap:2px;padding:2px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}
.dta-tab{height:26px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.dta-tab[aria-selected="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.dta-count{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.dta-statusLine{display:flex;align-items:center;gap:8px;margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px}
.dta-notice{margin:0;padding:8px 12px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:18px}
.dta-notice--error{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}
.dta-list{display:flex;flex-direction:column;gap:12px}
.dta-seg{display:flex;flex-direction:column;gap:10px;padding:14px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-bg-layer-1)}
.dta-segHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dta-segIndex{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:20px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px;font-variant-numeric:tabular-nums}
.dta-segActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}
.dta-scoreBadge{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11.5px;font-variant-numeric:tabular-nums;white-space:nowrap}
.dta-scoreBadge[data-tone="good"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.dta-scoreBadge[data-tone="ok"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent)}
.dta-scoreBadge[data-tone="bad"]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}
.dta-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.dta-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.dta-colHead{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:16px}
.dta-colHint{color:var(--dsw-alias-label-secondary);opacity:.7;font-size:11px}
.dta-sourceText{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.7}
.dta-translationText{box-sizing:border-box;width:100%;min-height:86px;padding:9px 10px;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.7;outline:none}
.dta-translationText:focus{border-color:var(--dsw-alias-brand-primary)}
.dta-promptBox{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}
.dta-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.dta-scoreLine{margin:0;padding-top:8px;border-top:.5px dashed var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dta-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dta-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:dta-pulse 1s ease-in-out infinite}
.dta-page button:focus-visible,.dta-page select:focus-visible,.dta-page textarea:focus-visible,.dta-page input:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dta-fullTitle{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}
.dta-fullText{box-sizing:border-box;width:100%;min-height:340px;padding:14px;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.8;outline:none}
.dta-fullText:focus{border-color:var(--dsw-alias-brand-primary)}
@keyframes dta-pulse{0%,100%{opacity:.35}50%{opacity:1}}
@media (max-width:760px){.dta-columns{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.dta-dot{animation:none}}
`;

    /**
     * The translation workspace page rendered in the `main` slot.
     * @param {object} props - slot props (includes `t` from the locale option).
     * @returns {object} page element.
     */
    function TranslationPage(props) {
      const t = typeof props.t === 'function' ? props.t : (key) => key;
      const bootstrap = React.useMemo(() => {
        const storedPrefs = readStorage(PREFS_STORAGE, {}) || {};
        const storedDoc = normalizeDoc(readStorage(DOC_STORAGE, null));
        return {
          doc: storedDoc,
          prefs: {
            sourceLanguage: typeof storedPrefs.sourceLanguage === 'string' ? storedPrefs.sourceLanguage : 'auto',
            targetLanguage: typeof storedPrefs.targetLanguage === 'string' ? storedPrefs.targetLanguage : '中文',
            view: storedPrefs.view === 'sentences' || storedPrefs.view === 'full' ? storedPrefs.view : 'paragraphs',
          },
        };
      }, []);

      const [doc, setDoc] = React.useState(bootstrap.doc);
      const [draft, setDraft] = React.useState(bootstrap.doc ? bootstrap.doc.sourceText : '');
      const [sourceLanguage, setSourceLanguage] = React.useState(bootstrap.doc ? bootstrap.doc.sourceLanguage : bootstrap.prefs.sourceLanguage);
      const [targetLanguage, setTargetLanguage] = React.useState(bootstrap.doc ? bootstrap.doc.targetLanguage : bootstrap.prefs.targetLanguage);
      const [view, setView] = React.useState(bootstrap.prefs.view);
      // Scores are hidden by default on every mount; a button reveals them.
      const [showScores, setShowScores] = React.useState(false);
      const [status, setStatus] = React.useState(null);
      const [busy, setBusy] = React.useState({});
      const [errors, setErrors] = React.useState({});
      const [promptFor, setPromptFor] = React.useState(null);
      const [promptText, setPromptText] = React.useState('');
      const [notice, setNotice] = React.useState(null);
      const [engineModel, setEngineModel] = React.useState(null);
      const [engineState, setEngineState] = React.useState('unknown');
      const [copied, setCopied] = React.useState(null);
      const [fullScoreBusy, setFullScoreBusy] = React.useState(false);
      const copyTimer = React.useRef(null);
      const fileInputRef = React.useRef(null);

      React.useEffect(() => {
        let cancelled = false;
        fetch(`${API}/health`, { headers: { accept: 'application/json' } })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('unavailable'))))
          .then((data) => {
            if (cancelled) return;
            setEngineModel(data && typeof data.model === 'string' ? data.model : null);
            setEngineState(data && data.model ? 'ok' : 'unknown');
          })
          .catch(() => {
            if (!cancelled) setEngineState('unknown');
          });
        return () => {
          cancelled = true;
        };
      }, []);

      React.useEffect(() => {
        writeStorage(DOC_STORAGE, doc);
      }, [doc]);

      React.useEffect(() => {
        writeStorage(PREFS_STORAGE, { sourceLanguage, targetLanguage, view });
      }, [sourceLanguage, targetLanguage, view]);

      React.useEffect(() => () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
      }, []);

      const collectionKey = view === 'sentences' ? 'sentences' : 'paragraphs';
      const fullTranslation = buildFullTranslation(doc);
      const fullScore = doc ? doc.documentScore : null;
      const items = doc ? doc[collectionKey] : [];
      const sourceOption = sourceLanguage === 'auto' ? undefined : sourceLanguage;
      const isWorking = Boolean(status);
      const charCount = (count) => `${count} ${count === 1 ? t('charUnitOne') : t('charUnitMany')}`;
      const sentenceCount = (count) => `${count} ${count === 1 ? t('sentenceUnitOne') : t('sentenceUnitMany')}`;
      const paragraphCount = (count) => `${count} ${count === 1 ? t('paragraphUnitOne') : t('paragraphUnitMany')}`;
      const statusText = !status
        ? ''
        : status.kind === 'translating'
          ? t('translating')
          : status.kind === 'ocr'
            ? t('ocrReading')
            : status.kind === 'scoring'
              ? format(t('scoreAllProgress'), { done: status.done ?? 0, total: status.total ?? 0 })
              : '';

      /**
       * Apply a patch to one segment of an explicit collection, so an in-flight
       * request keeps targeting the view it was started from.
       * @param {'sentences' | 'paragraphs'} collection - target collection.
       * @param {string} id - segment id.
       * @param {object} patch - fields to merge.
       */
      function patchSegment(collection, id, patch) {
        setDoc((current) => {
          if (!current) return current;
          const edited = Object.prototype.hasOwnProperty.call(patch, 'translation');
          return {
            ...current,
            ...(edited ? { documentScore: null } : {}),
            [collection]: current[collection].map((item) => (
              item.id === id ? { ...item, ...patch } : item
            )),
          };
        });
      }

      /**
       * Attach a score only while the translation it was computed for is still
       * the current text, so an edit made during the request keeps the score
       * cleared instead of resurrecting a stale score.
       * @param {'sentences' | 'paragraphs'} collection - target collection.
       * @param {string} id - segment id.
       * @param {string} expectedTranslation - translation that was scored.
       * @param {{ value: number, comment: string }} score - score to attach.
       */
      function applyScore(collection, id, expectedTranslation, score) {
        setDoc((current) => {
          if (!current) return current;
          return {
            ...current,
            [collection]: current[collection].map((item) => {
              if (item.id !== id) return item;
              if (item.translation.trim() !== expectedTranslation) return item;
              return { ...item, score };
            }),
          };
        });
      }

      /** Clear one segment error. */
      function clearSegmentError(id) {
        setErrors((current) => {
          if (!(id in current)) return current;
          const next = { ...current };
          delete next[id];
          return next;
        });
      }

      /** Validate one block of text and translate it into the comparison view. */
      async function translateText(rawText) {
        const text = String(rawText ?? '').trim();
        if (!text) {
          setNotice({ kind: 'warn', text: t('noSource') });
          return false;
        }
        const sentences = splitSentences(text);
        const paragraphs = splitParagraphs(text);
        if (sentences.length === 0 && paragraphs.length === 0) {
          setNotice({ kind: 'warn', text: t('noSource') });
          return false;
        }
        const totalChars = sentences.reduce((total, part) => total + part.length, 0)
          + paragraphs.reduce((total, part) => total + part.length, 0);
        if (sentences.length > MAX_SEGMENTS || paragraphs.length > MAX_SEGMENTS || totalChars > MAX_TOTAL_CHARS) {
          setNotice({ kind: 'warn', text: t('tooLongDoc') });
          return false;
        }
        setNotice(null);
        setErrors({});
        setPromptFor(null);
        setStatus({ kind: 'translating' });
        try {
          const data = await requestJson('translate', {
            sentences,
            paragraphs,
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          });
          const nextDoc = {
            sourceText: text,
            sourceLanguage,
            targetLanguage,
            documentScore: null,
            sentences: sentences.map((source, index) => ({
              id: `s${index}`,
              source,
              translation: pick(data.sentences, index),
              score: null,
            })),
            paragraphs: paragraphs.map((source, index) => ({
              id: `p${index}`,
              source,
              translation: pick(data.paragraphs, index),
              score: null,
            })),
          };
          setDoc(nextDoc);
          setStatus(null);
          if (data.model) {
            setEngineModel(String(data.model));
            setEngineState('ok');
          }
          return true;
        } catch (error) {
          setStatus(null);
          setNotice({ kind: 'error', text: describeError(error, t) });
          return false;
        }
      }

      /** Translate whatever is currently in the source box. */
      async function handleTranslate() {
        if (!draft.trim()) {
          setNotice({ kind: 'warn', text: t('noSource') });
          return;
        }
        await translateText(draft);
      }

      /**
       * Encode an image for the Host, downscaling it first when the browser can.
       * @param {File} file - picked or pasted image.
       * @returns {Promise<{ data: string, mediaType: string, name: string }>} upload payload.
       */
      async function prepareImagePayload(file) {
        const originalType = typeof file.type === 'string' && file.type ? file.type : 'image/png';
        const originalName = typeof file.name === 'string' && file.name ? file.name : 'image';
        if (typeof createImageBitmap === 'function') {
          let bitmap;
          try {
            bitmap = await createImageBitmap(file);
          } catch {
            throw localError(t('imageUnreadable'));
          }
          try {
            if (typeof OffscreenCanvas === 'function') {
              const maxEdge = 2048;
              const width = Math.max(1, bitmap.width || 1);
              const height = Math.max(1, bitmap.height || 1);
              const scale = Math.min(1, maxEdge / Math.max(width, height));
              const targetWidth = Math.max(1, Math.round(width * scale));
              const targetHeight = Math.max(1, Math.round(height * scale));
              const canvas = new OffscreenCanvas(targetWidth, targetHeight);
              const context = canvas.getContext('2d');
              if (context) {
                context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
                const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
                const buffer = await blob.arrayBuffer();
                if (buffer.byteLength > 0) {
                  return {
                    data: bytesToBase64(new Uint8Array(buffer)),
                    mediaType: 'image/jpeg',
                    name: `${originalName.replace(/\.[a-z0-9]+$/i, '')}.jpg`,
                  };
                }
              }
            }
          } finally {
            if (typeof bitmap.close === 'function') bitmap.close();
          }
        }
        const buffer = await file.arrayBuffer();
        return { data: bytesToBase64(new Uint8Array(buffer)), mediaType: originalType, name: originalName };
      }

      /** OCR one image, drop the text into the source box, then translate it. */
      async function handleImageFile(file) {
        if (!file || !String(file.type || '').startsWith('image/')) {
          setNotice({ kind: 'warn', text: t('imageTypeError') });
          return;
        }
        if (Number(file.size) > 12 * 1024 * 1024) {
          setNotice({ kind: 'warn', text: t('imageTooLarge') });
          return;
        }
        setNotice(null);
        setStatus({ kind: 'ocr' });
        try {
          const payload = await prepareImagePayload(file);
          const data = await requestJson('ocr', {
            ...payload,
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          });
          const text = typeof data.text === 'string' ? data.text.trim() : '';
          setStatus(null);
          if (!text) {
            setNotice({ kind: 'warn', text: t('ocrEmpty') });
            return;
          }
          setDraft(text);
          await translateText(text);
        } catch (error) {
          setStatus(null);
          setNotice({ kind: 'error', text: describeError(error, t) });
        }
      }

      /** Open the hidden image picker. */
      function handlePickImage() {
        if (fileInputRef.current) fileInputRef.current.click();
      }

      /** OCR an image pasted into the source box. */
      function handleSourcePaste(event) {
        const items = event.clipboardData && event.clipboardData.items;
        if (!items) return;
        for (let index = 0; index < items.length; index += 1) {
          const item = items[index];
          if (item && item.kind === 'file' && typeof item.type === 'string' && item.type.startsWith('image/')) {
            const file = typeof item.getAsFile === 'function' ? item.getAsFile() : undefined;
            if (file) {
              event.preventDefault();
              handleImageFile(file);
              return;
            }
          }
        }
      }

      /** Score the whole document from its current full translation. */
      async function handleScoreFull() {
        if (!doc || fullScoreBusy) return;
        const translationText = fullTranslation;
        const sourceText = doc.sourceText;
        if (!translationText) {
          setNotice({ kind: 'warn', text: t('noTranslationFull') });
          return;
        }
        if (sourceText.length > MAX_FULL_SCORE_CHARS || translationText.length > MAX_FULL_SCORE_CHARS) {
          setNotice({ kind: 'warn', text: t('fullScoreTooLong') });
          return;
        }
        setNotice(null);
        setFullScoreBusy(true);
        try {
          const data = await requestJson('score-document', {
            source: sourceText,
            translation: translationText,
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          });
          const value = Number(data.score);
          if (!Number.isFinite(value)) throw localError(t('scoreFailed'));
          setDoc((current) => {
            if (!current || current.sourceText !== sourceText || buildFullTranslation(current) !== translationText) {
              return current;
            }
            return {
              ...current,
              documentScore: {
                value: Math.max(0, Math.min(100, Math.round(value))),
                comment: typeof data.comment === 'string' ? data.comment : '',
              },
            };
          });
          setShowScores(true);
        } catch (error) {
          setNotice({ kind: 'error', text: describeError(error, t) });
        } finally {
          setFullScoreBusy(false);
        }
      }

      /** Retranslate one sentence or paragraph, optionally with an instruction. */
      async function handleRetranslate(collection, item, extraPrompt) {
        const id = item.id;
        clearSegmentError(id);
        setBusy((current) => ({ ...current, [id]: 'retranslate' }));
        try {
          const data = await requestJson('retranslate', {
            source: item.source,
            ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
            ...(extraPrompt && extraPrompt.trim() ? { extraPrompt: extraPrompt.trim() } : {}),
            kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          });
          if (typeof data.translation !== 'string' || !data.translation.trim()) {
            throw localError(t('retranslateFailed'));
          }
          patchSegment(collection, id, { translation: data.translation.trim(), score: null });
          setPromptFor(null);
          setPromptText('');
        } catch (error) {
          setErrors((current) => ({ ...current, [id]: describeError(error, t) }));
        } finally {
          setBusy((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        }
      }

      /** Score one segment, revealing scores as a side effect. */
      async function handleScore(collection, item) {
        const id = item.id;
        if (!item.translation.trim()) {
          setErrors((current) => ({ ...current, [id]: t('noTranslationYet') }));
          return;
        }
        clearSegmentError(id);
        const scoredText = item.translation.trim();
        setBusy((current) => ({ ...current, [id]: 'score' }));
        try {
          const data = await requestJson('score', {
            source: item.source,
            translation: scoredText,
            kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          });
          const value = Number(data.score);
          if (!Number.isFinite(value)) throw localError(t('scoreFailed'));
          applyScore(collection, id, scoredText, {
            value: Math.max(0, Math.min(100, Math.round(value))),
            comment: typeof data.comment === 'string' ? data.comment : '',
          });
          setShowScores(true);
        } catch (error) {
          setErrors((current) => ({ ...current, [id]: describeError(error, t) }));
        } finally {
          setBusy((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        }
      }

      /** Score every segment of the current view with bounded concurrency. */
      async function handleScoreAll() {
        if (!doc || status) return;
        const collection = collectionKey;
        const snapshot = items.map((item) => ({
          id: item.id,
          source: item.source,
          translation: item.translation,
        }));
        if (snapshot.length === 0) return;
        if (snapshot.every((item) => !item.translation.trim())) {
          setNotice({ kind: 'warn', text: t('noTranslationYet') });
          return;
        }
        setNotice(null);
        // Reveal scores up front so each finished segment appears as soon as its
        // own request settles instead of waiting for the whole batch.
        setShowScores(true);
        setStatus({ kind: 'scoring', done: 0, total: snapshot.length });
        let done = 0;
        try {
          await mapLimit(snapshot, 3, async (item) => {
            if (!item.translation.trim()) {
              done += 1;
              setStatus({ kind: 'scoring', done, total: snapshot.length });
              return;
            }
            try {
              const data = await requestJson('score', {
                source: item.source,
                translation: item.translation.trim(),
                kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
              });
              const value = Number(data.score);
              if (Number.isFinite(value)) {
                applyScore(collection, item.id, item.translation.trim(), {
                  value: Math.max(0, Math.min(100, Math.round(value))),
                  comment: typeof data.comment === 'string' ? data.comment : '',
                });
              }
            } catch (error) {
              setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
            }
            done += 1;
            setStatus({ kind: 'scoring', done, total: snapshot.length });
          });
          setShowScores(true);
        } finally {
          setStatus(null);
        }
      }

      /** Leave the comparison view and return to the input form. */
      function handleReset() {
        setDoc(null);
        setErrors({});
        setBusy({});
        setPromptFor(null);
        setPromptText('');
        setNotice(null);
        setStatus(null);
        writeStorage(DOC_STORAGE, null);
      }

      /**
       * Copy the full translation or the original source to the clipboard.
       * @param {'translation' | 'source'} kind - which text to copy.
       */
      async function handleCopy(kind) {
        const value = kind === 'source' ? (doc ? doc.sourceText : '') : fullTranslation;
        if (!value) {
          setNotice({ kind: 'warn', text: t('emptyFull') });
          return;
        }
        try {
          if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
            throw new Error('clipboard-unavailable');
          }
          await navigator.clipboard.writeText(value);
          setCopied(kind);
          if (copyTimer.current) clearTimeout(copyTimer.current);
          copyTimer.current = setTimeout(() => setCopied(null), 1600);
        } catch {
          setNotice({ kind: 'error', text: t('copyFailed') });
        }
      }

      /** Toggle whether fetched scores are visible. */
      function toggleScores() {
        setShowScores((current) => !current);
      }

      /** Render the source input form. */
      function renderLanding() {
        return h('section', { className: 'dta-card' },
          h('div', { className: 'dta-row' },
            h(LanguageSelect, {
              label: t('sourceLanguage'),
              value: sourceLanguage,
              includeAuto: true,
              t,
              onChange: setSourceLanguage,
            }),
            h(LanguageSelect, {
              label: t('targetLanguage'),
              value: targetLanguage,
              t,
              onChange: setTargetLanguage,
            }),
            h('span', { className: 'dta-count' }, charCount(draft.length)),
          ),
          h('textarea', {
            className: 'dta-textarea',
            value: draft,
            rows: 12,
            spellCheck: false,
            placeholder: t('sourcePlaceholder'),
            'aria-label': t('sourcePlaceholder'),
            onChange: (event) => setDraft(event.target.value),
            onPaste: handleSourcePaste,
          }),
          h('div', { className: 'dta-actions' },
            h('span', { className: 'dta-hint' }, t('ocrHint')),
            h('input', {
              ref: fileInputRef,
              type: 'file',
              accept: 'image/*',
              style: { display: 'none' },
              onChange: (event) => {
                const file = event.target.files && event.target.files[0];
                event.target.value = '';
                if (file) handleImageFile(file);
              },
            }),
            h('button', {
              type: 'button',
              className: 'dta-btn',
              disabled: isWorking,
              onClick: handlePickImage,
            }, t('imageTranslate')),
            h('button', {
              type: 'button',
              className: 'dta-btn dta-btn--primary',
              disabled: isWorking,
              onClick: handleTranslate,
            },
              status && (status.kind === 'translating' || status.kind === 'ocr') ? h(BusyDot, null) : null,
              status && (status.kind === 'translating' || status.kind === 'ocr') ? statusText : t('translate'),
            ),
          ),
        );
      }

      /** Render one segment card. */
      function renderSegment(item, index, collection) {
        const busyKind = busy[item.id];
        const cardError = errors[item.id];
        const promptOpen = promptFor === item.id;
        const score = item.score;
        return h('article', { className: 'dta-seg', key: item.id },
          h('header', { className: 'dta-segHead' },
            h('span', { className: 'dta-segIndex' }, `#${index + 1}`),
            showScores && score
              ? h('span', { className: 'dta-scoreBadge', 'data-tone': scoreTone(score.value), title: score.comment || '' },
                `${t('scoreLabel')} ${score.value}`)
              : null,
            h('div', { className: 'dta-segActions' },
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                disabled: busyKind === 'retranslate',
                onClick: () => handleRetranslate(collection, item, ''),
              }, busyKind === 'retranslate' ? t('retranslating') : t('retranslate')),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                'aria-expanded': promptOpen,
                onClick: () => {
                  setPromptFor(promptOpen ? null : item.id);
                  setPromptText('');
                },
              }, t('addPrompt')),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                disabled: busyKind === 'score',
                onClick: () => handleScore(collection, item),
              }, busyKind === 'score' ? t('scoring') : score ? t('rescore') : t('score')),
            ),
          ),
          promptOpen
            ? h('div', { className: 'dta-promptBox' },
              h('input', {
                className: 'dta-input',
                value: promptText,
                autoFocus: true,
                placeholder: t('promptPlaceholder'),
                'aria-label': t('promptPlaceholder'),
                onChange: (event) => setPromptText(event.target.value),
                onKeyDown: (event) => {
                  if (event.key !== 'Enter') return;
                  if (event.nativeEvent && event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (promptText.trim()) handleRetranslate(collection, item, promptText);
                },
              }),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--primary',
                disabled: !promptText.trim() || busyKind === 'retranslate',
                onClick: () => handleRetranslate(collection, item, promptText),
              }, t('promptConfirm')),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--ghost',
                onClick: () => {
                  setPromptFor(null);
                  setPromptText('');
                },
              }, t('promptCancel')),
            )
            : null,
          cardError ? h('p', { className: 'dta-error' }, cardError) : null,
          h('div', { className: 'dta-columns' },
            h('div', { className: 'dta-col' },
              h('div', { className: 'dta-colHead' }, t('sourceLabel')),
              h('p', { className: 'dta-sourceText' }, item.source),
            ),
            h('div', { className: 'dta-col' },
              h('div', { className: 'dta-colHead' },
                t('translationLabel'),
                h('span', { className: 'dta-colHint' }, t('editHint')),
              ),
              h('textarea', {
                className: 'dta-translationText',
                value: item.translation,
                rows: rowsFor(item.translation),
                spellCheck: false,
                placeholder: t('targetPlaceholder'),
                'aria-label': `${t('translationLabel')} #${index + 1}`,
                onChange: (event) => patchSegment(collection, item.id, {
                  translation: event.target.value,
                  score: null,
                }),
              }),
            ),
          ),
          showScores && score && score.comment
            ? h('p', { className: 'dta-scoreLine' }, `${t('scoreLabel')} ${score.value} · ${score.comment}`)
            : null,
        );
      }

      /** Render the comparison workspace. */
      function renderDocument() {
        const scoringStatus = status && status.kind === 'scoring';
        return h(React.Fragment, null,
          h('section', { className: 'dta-card' },
            h('div', { className: 'dta-toolbar' },
              h(LanguageSelect, {
                label: t('sourceLanguage'),
                value: sourceLanguage,
                includeAuto: true,
                t,
                onChange: (value) => {
                  setSourceLanguage(value);
                  setNotice({ kind: 'info', text: t('languageChangeHint') });
                },
              }),
              h(LanguageSelect, {
                label: t('targetLanguage'),
                value: targetLanguage,
                t,
                onChange: (value) => {
                  setTargetLanguage(value);
                  setNotice({ kind: 'info', text: t('languageChangeHint') });
                },
              }),
              h('div', { className: 'dta-tabs', role: 'tablist', 'aria-label': t('viewLabel') },
                h('button', {
                  type: 'button',
                  role: 'tab',
                  className: 'dta-tab',
                  'aria-selected': view === 'sentences',
                  onClick: () => setView('sentences'),
                }, t('sentences')),
                h('button', {
                  type: 'button',
                  role: 'tab',
                  className: 'dta-tab',
                  'aria-selected': view === 'paragraphs',
                  onClick: () => setView('paragraphs'),
                }, t('paragraphs')),
                h('button', {
                  type: 'button',
                  role: 'tab',
                  className: 'dta-tab',
                  'aria-selected': view === 'full',
                  onClick: () => setView('full'),
                }, t('fullText')),
              ),
              h('div', { className: 'dta-toolbarSpacer' }),
              h('span', { className: 'dta-count' },
                view === 'full'
                  ? charCount(fullTranslation.length)
                  : collectionKey === 'sentences'
                    ? sentenceCount(items.length)
                    : paragraphCount(items.length)),
              h('button', {
                type: 'button',
                className: 'dta-btn',
                'aria-pressed': showScores,
                onClick: toggleScores,
              }, showScores ? t('hideScores') : t('showScores')),
              view === 'full'
                ? h('button', {
                  type: 'button',
                  className: 'dta-btn',
                  disabled: isWorking,
                  onClick: handleScoreFull,
                }, fullScoreBusy ? t('scoring') : fullScore ? t('rescore') : t('scoreFull'))
                : h('button', {
                  type: 'button',
                  className: 'dta-btn',
                  disabled: isWorking,
                  onClick: handleScoreAll,
                }, scoringStatus ? format(t('scoreAllProgress'), { done: status.done, total: status.total }) : t('scoreAll')),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--ghost',
                disabled: isWorking,
                onClick: handleReset,
              }, t('reset')),
            ),
            status
              ? h('p', { className: 'dta-statusLine', role: 'status' },
                h(BusyDot, null),
                statusText,
              )
              : null,
          ),
          view === 'full' ? renderFullText() : h('div', { className: 'dta-list' },
            items.map((item, index) => renderSegment(item, index, collectionKey)),
          ),
        );
      }

      /** Render the copy-friendly full translation. */
      function renderFullText() {
        return h('section', { className: 'dta-card' },
          h('div', { className: 'dta-toolbar' },
            h('span', { className: 'dta-fullTitle' }, t('fullText')),
            h('span', { className: 'dta-count' }, charCount(fullTranslation.length)),
            showScores && fullScore
              ? h('span', { className: 'dta-scoreBadge', 'data-tone': scoreTone(fullScore.value), title: fullScore.comment || '' },
                `${t('scoreLabel')} ${fullScore.value}`)
              : null,
            h('div', { className: 'dta-toolbarSpacer' }),
            h('button', {
              type: 'button',
              className: 'dta-btn',
              onClick: () => handleCopy('source'),
            }, copied === 'source' ? t('copied') : t('copySource')),
            h('button', {
              type: 'button',
              className: 'dta-btn dta-btn--primary',
              onClick: () => handleCopy('translation'),
            }, copied === 'translation' ? t('copied') : t('copyTranslation')),
          ),
          h('textarea', {
            className: 'dta-fullText',
            value: fullTranslation,
            readOnly: true,
            rows: 20,
            spellCheck: false,
            placeholder: t('emptyFull'),
            'aria-label': t('fullText'),
          }),
          showScores && fullScore && fullScore.comment
            ? h('p', { className: 'dta-scoreLine' }, `${t('scoreLabel')} ${fullScore.value} · ${fullScore.comment}`)
            : null,
          h('p', { className: 'dta-hint' }, t('fullTextHint')),
        );
      }

      return h(React.Fragment, null,
        h('style', { key: 'dta-styles' }, CSS),
        h('div', { className: 'dta-page' },
          h('header', { className: 'dta-head' },
            h('div', { className: 'dta-headMain' },
              h('h1', { className: 'dta-title' }, t('title')),
              h('p', { className: 'dta-intro' }, t('intro')),
            ),
            h('span', { className: 'dta-engine', 'data-state': engineState, title: engineState === 'ok' ? t('engineOnline') : t('engineOffline') },
              h('span', { className: 'dta-engineDot', 'aria-hidden': true }),
              engineModel ? `${t('modelLabel')}: ${engineModel}` : t('modelUnknown'),
            ),
          ),
          notice && notice.text
            ? h('p', { className: cx('dta-notice', notice.kind === 'error' && 'dta-notice--error') }, notice.text)
            : null,
          doc ? renderDocument() : renderLanding(),
          h('footer', { className: 'dta-footer' },
            h('span', null, t('saveHint')),
            h('span', null, t('footerHint')),
          ),
        ),
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'translation-assistant: dictionaries');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, TranslationPage));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => t('panel'),
        }, TranslationPanelIcon));
      },
    };
  },
});
