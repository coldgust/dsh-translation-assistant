/**
 * Browser half of the Translation Assistant bundle.
 *
 * Registers a global panel entry in the sidebar and its page in the `main`
 * slot. The page keeps the whole document (source, sentence/paragraph
 * translations, scores) in component state plus `localStorage`, and calls the
 * Host half through the JSON API it serves at `/dsh-translation/api`.
 */

window.__ModuleLoader__.load({
  id: 'dsh-translation-assistant',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'translationAssistant';
    const PANEL_ID = 'translation-assistant';
    const API = '/dsh-translation/api';
    const DOC_STORAGE = 'dsh-translation-assistant:document:v1';
    const PREFS_STORAGE = 'dsh-translation-assistant:prefs:v2';
    const HISTORY_STORAGE = 'dsh-translation-assistant:history:v1';
    const SESSION_STORAGE = 'dsh-translation-assistant:session:v1';
    // History caps: a count limit plus a rough character budget so a long
    // document list cannot exhaust the ~5 MB localStorage quota.
    const MAX_HISTORY_ENTRIES = 200;
    const MAX_HISTORY_CHARS = 2_000_000;
    // Mirrors the Host request limits so an oversized document fails with a
    // localized hint before a round trip.
    const MAX_SEGMENTS = 400;
    const MAX_TOTAL_CHARS = 120_000;
    // Whole-document requests are capped tighter than the segment budget:
    // mirrors the Host's MAX_DOCUMENT_CHARS so an oversized text goes straight
    // to the batched path instead of being rejected.
    const MAX_WHOLE_DOC_CHARS = 60_000;
    const MAX_FULL_SCORE_CHARS = 60_000;
    // Custom retranslation instructions are short by design; the field caps the
    // text so an accidental paste cannot bloat the request.
    const MAX_PROMPT_CHARS = 100;
    // Suggestions built from a score plus its feedback are machine-written, so
    // they get a larger budget than the hand-typed prompt box.
    const MAX_SUGGESTION_CHARS = 400;
    // Revision snapshots kept per document. A snapshot copies the whole
    // document, so the caps keep both the drawer and the storage quota sane.
    const MAX_VERSIONS = 100;
    const MAX_VERSION_CHARS = 200_000;
    // What created a snapshot; also the key the drawer colours its tag by.
    const VERSION_KINDS = ['initial', 'retranslate', 'optimize', 'restore', 'manual'];
    // How the source goes to the model: `whole` = one request carrying the
    // full text as-is, `array` = one request carrying the paragraphs as a
    // JSON array, `batch` = chunked concurrent requests.
    const TRANS_MODES = ['whole', 'array', 'batch'];

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
      intro: '粘贴原文或导入文件（.txt / .md / .html / .docx），逐段或逐句对照翻译；译文可直接修改，也能让 AI 重译。模型可在头部切换；翻译自动存进本机历史，AI 改动前留一份修改记录，随时回退，还支持图片取字、全文复制、下载和评分。',
      sourceLanguage: '原文语言',
      targetLanguage: '目标语言',
      autoDetect: '自动检测',
      sourcePlaceholder: '粘贴原文，空行分段；也可拖入文件、粘贴截图或选择图片识别翻译。',
      targetPlaceholder: 'AI 译文会出现在这里，可直接修改',
      translate: '开始翻译',
      translating: '正在翻译…',
      translateWholeBusy: '整篇翻译中…',
      translateProgress: '翻译中 {done}/{total}',
      translatePartial: '{failed} 段翻译失败，其余段落已完成。',
      footerHint: '评分由 AI 判断，仅供参考；点“AI 评分”或“全文评分”获取。',
      newTranslation: '新建翻译',
      newTranslationHint: '开始一篇新翻译，当前文档会留在历史里',
      historyTitle: '翻译历史',
      historyCount: '共 {count} 条',
      historySwitchHint: '打开翻译历史，切换到其它文档',
      historyCurrent: '当前文档',
      historyEmpty: '还没有历史记录。翻译一次就会存到本机，之后可随时切回继续修改。',
      historyHint: '历史保存在本机浏览器，最多保留 {max} 条；置顶优先，其余按最近使用排序；删除后不可恢复。',
      historySearch: '搜索历史',
      historySearchPlaceholder: '搜索原文或译文…',
      historyNoMatch: '没有匹配的历史记录，换个关键词试试。',
      historyClearSearch: '清空',
      historyMatchCount: '匹配 {count} 条',
      historyDeleteHint: '删除后不可恢复',
      versions: '修改记录',
      versionsHint: '查看这份文档改过的版本，随时回退',
      versionsCount: '共 {count} 份',
      versionsEmpty: '还没有修改记录。AI 重译或按建议优化前会自动存一份，也可以点“保存当前版本”手动存。',
      versionsFoot: '记录保存在本机，每份文档最多保留 {max} 份；回退前也会自动存一份，所以回退本身也能撤回。',
      versionCurrent: '当前版本',
      versionSave: '保存当前版本',
      versionSaveHint: '把当前译文存进修改记录，之后可回退',
      versionSaved: '已保存当前版本。',
      versionRestore: '回退到这里',
      versionRestored: '已回退到「{label}」，回退前的译文也存进了修改记录。',
      versionSame: '与当前一致',
      versionDiff: '{count} 处与当前不同',
      versionDelete: '删除',
      versionLabelInitial: '初始翻译',
      versionLabelRetranslate: '重译前',
      versionLabelOptimize: '优化前',
      versionLabelRestore: '回退前',
      versionLabelManual: '手动保存',
      pinEntry: '置顶',
      unpinEntry: '取消置顶',
      deleteEntry: '删除',
      confirmDelete: '确认删除',
      closePanel: '收起',
      yesterday: '昨天',
      untitled: '未命名',
      discardDraft: '当前原文还没有翻译，新建会清空它。',
      sourceLabel: '原文',
      translationLabel: '译文',
      editHint: '可直接编辑',
      paragraphs: '逐段对比',
      sentences: '逐句对比',
      viewLabel: '对照视图',
      sentenceUnitOne: '句',
      sentenceUnitMany: '句',
      paragraphUnitOne: '段',
      paragraphUnitMany: '段',
      retranslate: 'AI 重译',
      retranslating: '重译中…',
      addPrompt: '提示词重译',
      promptPlaceholder: '例如：更口语化、保留术语、语气更正式',
      promptConfirm: '重译',
      promptCancel: '取消',
      scoreLabel: 'AI 评分',
      score: 'AI 评分',
      rescore: '重新评分',
      scoring: '评分中…',
      scoreAll: '全部评分',
      scoreAllProgress: '评分中 {done}/{total}',
      optimize: '按建议优化',
      optimizing: '优化中…',
      optimizeHint: '按这一段的 AI 评分和评语改进译文',
      optimizeAll: '全部优化',
      optimizeAllHint: '按每段的 AI 评分和评语逐段改进',
      optimizeFullHint: '按全文评分和评语重译整篇',
      optimizeProgress: '优化中 {done}/{total}',
      optimizePrompt: '上一版 AI 评分 {score} 分，评语：{comment}。请按评语改进这版译文，保留原意和完整信息。',
      optimizePromptScore: '上一版 AI 评分 {score} 分。请在保留原意的前提下打磨这版译文。',
      showScores: '显示评分',
      hideScores: '隐藏评分',
      noSource: '请先输入原文。',
      noTranslationYet: '这一段还没有译文，请先翻译或手动填写。',
      requestFailed: '请求失败，请稍后重试。',
      networkError: '无法连接翻译服务，请确认插件已启用后刷新页面。',
      retranslateFailed: '重译没有返回有效译文。',
      translateFailed: '翻译没有返回有效译文。',
      scoreFailed: '评分没有返回有效结果。',
      invalidRequest: '请求内容不符合要求，请检查原文后重试。',
      tooLarge: '内容过大，请压缩图片或拆分文本后重试。',
      tooLongDoc: '原文过长：单次最多 400 句/段或约 12 万字符，请拆分后分次翻译。',
      noModelAvailable: '服务或模型暂不可用，请确认已在设置中选择默认模型。',
      engineFailed: 'AI 服务暂时不可用，请稍后重试。',
      requestRejected: '请求被拒绝，请重试。',
      languageChangeHint: '语言切换只影响之后的重译、评分和图片识别；要整篇重译，请点“新建翻译”。',
      saveHint: '编辑内容会自动保存在本机浏览器。',
      modelLabel: '模型',
      modelUnknown: '未检测到可用模型',
      modelPicker: '切换模型',
      modelFollowDefault: '跟随默认模型',
      modelSwitchHint: '后续翻译、重译、评分和图片识别都会用「{model}」；已经翻好的内容不会自动重做。',
      modelMissing: '之前选择的模型现在不可用，已切回默认模型。',
      modelUnavailable: '读不到可切换的模型列表',
      engineOnline: '翻译服务已就绪',
      engineOffline: '翻译服务未就绪',
      charUnitOne: '字符',
      charUnitMany: '字符',
      fullText: '全文',
      fullModeLabel: '全文显示方式',
      fullModeTranslation: '译文',
      fullModeSource: '原文',
      fullModeBoth: '对比',
      fullRetranslateHint: '把整篇原文一次性交给当前模型重译；现有译文会作为参考一并送给模型。',
      retranslateFullBusy: '整篇重译中…',
      retranslateArrayBusy: '分段重译中…',
      retranslateAllProgress: '重译中 {done}/{total}',
      retranslatePartial: '{failed} 段重译失败，其余段落已完成。',
      fullRetranslateMismatch: '重译结果被分成 {got} 段，与原文的 {want} 段对不上，未写入；请重试一次。',
      transModeLabel: '翻译模式',
      transModeHint: '连贯优先：整篇一次请求，上下文最完整、译文最连贯；对齐优先：全文分段成数组一次请求，段落一一对应最有保障；速度优先：分块并发（16 句或 6 段一块、3 路并发），长文最快。',
      modeWhole: '连贯优先',
      modeArray: '对齐优先',
      modeBatch: '速度优先',
      translateArrayBusy: '分段翻译中…',
      fullTextHint: '译文全文可直接编辑，改动会写回对应段落；也可重译整篇、切到原文或双栏对比查看。修改后全文评分会重置。',
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
      fileTranslate: '文件翻译',
      fileReading: '正在读取文件…',
      fileHint: '支持 .txt、.md、.html、.docx 文件与图片取字，导入后直接翻译，译文可下载。',
      fileEmpty: '文件里没有可翻译的文字。',
      fileTooLong: '文件过长：单次最多约 12 万字符，请拆分后再导入。',
      fileTooBig: '文件太大（超过 8 MB），请拆分后再导入。',
      fileTypeError: '请选择 .txt、.md、.html 或 .docx 文件。',
      fileLegacyDoc: '不支持旧版 .doc，请先在 Word 里另存为 .docx。',
      fileUnreadable: '文件读取失败，请确认文件没有损坏。',
      fileUnsupported: '当前浏览器无法解析 .docx，请另存为 .txt 或 .md 后再导入。',
      fileRemove: '移除文件',
      fileChipHint: '导入的文件名，下载译文时会沿用它',
      downloadTranslation: '下载译文',
      downloaded: '已下载「{name}」。',
      downloadFailed: '下载失败，请用“复制译文”手动保存。',
      scoreFull: '全文评分',
      noVision: '当前模型不支持图片识别，请先在设置里换用支持图片的模型。',
      ocrHint: '图片识别后会直接翻译，识别结果可在原文框里修改。',
      fullScoreTooLong: '原文或全文译文超过 6 万字符，请精简后再做全文评分。',
      noTranslationFull: '还没有可评分的全文译文，先完成翻译。',
      imageUnreadable: '图片无法读取，请换一张图片试试。',
    };

    const en = {
      panel: 'Translation Assistant',
      title: 'Translation Assistant',
      intro: 'Paste the source or import a file (.txt / .md / .html / .docx) and translate it paragraph by paragraph — or sentence by sentence. Edit any translation or ask AI to redo it, switch the model in the header, and keep every document in on-device history. Every AI pass leaves a revision you can roll back to, and images, full-text copy, download, and document scoring are built in.',
      sourceLanguage: 'Source language',
      targetLanguage: 'Target language',
      autoDetect: 'Auto-detect',
      sourcePlaceholder: 'Paste the source text (blank lines split paragraphs), or drop a file, paste a screenshot, or pick an image.',
      targetPlaceholder: 'The AI translation appears here; edit it freely',
      translate: 'Translate',
      translating: 'Translating…',
      translateWholeBusy: 'Translating the whole document…',
      translateProgress: 'Translating {done}/{total}',
      translatePartial: '{failed} segment(s) failed to translate; the rest are done.',
      footerHint: 'Scores are AI judgements for reference only; fetch them with “AI score” or “Full-text score”.',
      newTranslation: 'New translation',
      newTranslationHint: 'Start a new translation; the current document stays in history',
      historyTitle: 'Translation history',
      historyCount: '{count} saved',
      historySwitchHint: 'Open translation history to switch documents',
      historyCurrent: 'Current document',
      historyEmpty: 'No history yet. Every translation is saved on this device, so you can switch back and keep editing later.',
      historyHint: 'History lives in this browser and keeps the latest {max} documents — pinned first, then most recently used. Deleted entries cannot be restored.',
      historySearch: 'Search history',
      historySearchPlaceholder: 'Search source or translation…',
      historyNoMatch: 'No saved document matches that search.',
      historyClearSearch: 'Clear',
      historyMatchCount: '{count} matching',
      historyDeleteHint: 'Deleted entries cannot be restored',
      versions: 'Revisions',
      versionsHint: 'See earlier versions of this document and roll back to one',
      versionsCount: '{count} saved',
      versionsEmpty: 'No revisions yet. One is saved before every AI retranslation or suggestion pass — you can also click “Save current version”.',
      versionsFoot: 'Revisions live in this browser and keep the latest {max} per document. One is also saved before each rollback, so a rollback can be undone.',
      versionCurrent: 'Current version',
      versionSave: 'Save current version',
      versionSaveHint: 'Store the current translation as a revision you can roll back to',
      versionSaved: 'Current version saved.',
      versionRestore: 'Restore',
      versionRestored: 'Restored “{label}”. The version you left is stored in revisions too.',
      versionSame: 'Same as current',
      versionDiff: '{count} segments differ',
      versionDelete: 'Delete',
      versionLabelInitial: 'Initial translation',
      versionLabelRetranslate: 'Before retranslation',
      versionLabelOptimize: 'Before suggestion pass',
      versionLabelRestore: 'Before rollback',
      versionLabelManual: 'Saved manually',
      pinEntry: 'Pin to top',
      unpinEntry: 'Unpin',
      deleteEntry: 'Delete',
      confirmDelete: 'Confirm delete',
      closePanel: 'Hide',
      yesterday: 'Yesterday',
      untitled: 'Untitled',
      discardDraft: 'The text in the box is not translated yet; starting a new translation clears it.',
      sourceLabel: 'Source',
      translationLabel: 'Translation',
      editHint: 'editable',
      paragraphs: 'By paragraph',
      sentences: 'By sentence',
      viewLabel: 'Comparison view',
      sentenceUnitOne: 'sentence',
      sentenceUnitMany: 'sentences',
      paragraphUnitOne: 'paragraph',
      paragraphUnitMany: 'paragraphs',
      retranslate: 'AI retranslate',
      retranslating: 'Retranslating…',
      addPrompt: 'Retranslate with prompt',
      promptPlaceholder: 'e.g. more colloquial, keep terminology, more formal tone',
      promptConfirm: 'Retranslate',
      promptCancel: 'Cancel',
      scoreLabel: 'AI score',
      score: 'AI score',
      rescore: 'Rescore',
      scoring: 'Scoring…',
      scoreAll: 'Score all',
      scoreAllProgress: 'Scoring {done}/{total}',
      optimize: 'Apply suggestion',
      optimizing: 'Improving…',
      optimizeHint: 'Improve this translation using its AI score and feedback',
      optimizeAll: 'Apply all',
      optimizeAllHint: 'Improve every segment using its own AI score and feedback',
      optimizeFullHint: 'Retranslate the whole document using its full-text score and feedback',
      optimizeProgress: 'Improving {done}/{total}',
      optimizePrompt: 'The previous AI score was {score}, with this feedback: {comment}. Improve the translation accordingly while keeping the meaning and all information intact.',
      optimizePromptScore: 'The previous AI score was {score}. Polish this translation while keeping the meaning intact.',
      showScores: 'Show scores',
      hideScores: 'Hide scores',
      noSource: 'Enter the source text first.',
      noTranslationYet: 'This segment has no translation yet. Translate it or fill it in first.',
      requestFailed: 'The request failed. Please try again.',
      networkError: 'Cannot reach the translation service. Make sure the plugin is enabled, then reload the page.',
      retranslateFailed: 'Retranslation did not return usable text.',
      translateFailed: 'Translation did not return usable text.',
      scoreFailed: 'Scoring did not return a usable result.',
      invalidRequest: 'The request is invalid. Check the input and try again.',
      tooLarge: 'Content is too large. Compress the image or split the text, then retry.',
      tooLongDoc: 'This source is too long: up to 400 segments or about 120,000 characters per request. Split it into parts.',
      noModelAvailable: 'The service or model is unavailable. Make sure a default model is selected.',
      engineFailed: 'The AI service is temporarily unavailable. Try again later.',
      requestRejected: 'The request was refused. Please try again.',
      languageChangeHint: 'Language changes apply to later retranslation, scoring, and image OCR. Use “New translation” to translate everything again.',
      saveHint: 'Edits are saved automatically in this browser.',
      modelLabel: 'Model',
      modelUnknown: 'No model route detected',
      modelPicker: 'Switch model',
      modelFollowDefault: 'Follow default',
      modelSwitchHint: 'Later translation, retranslation, scoring, and image OCR will use “{model}”. Existing text is not redone.',
      modelMissing: 'The model you picked is no longer available, so the default is used again.',
      modelUnavailable: 'Could not read the list of switchable models',
      engineOnline: 'Translation service ready',
      engineOffline: 'Translation service not ready',
      charUnitOne: 'character',
      charUnitMany: 'characters',
      fullText: 'Full text',
      fullModeLabel: 'Full-text display',
      fullModeTranslation: 'Translation',
      fullModeSource: 'Source',
      fullModeBoth: 'Compare',
      fullRetranslateHint: 'Send the whole document to the current model in one request; the existing translation rides along as reference.',
      retranslateFullBusy: 'Retranslating the whole document…',
      retranslateArrayBusy: 'Retranslating segments…',
      retranslateAllProgress: 'Retranslating {done}/{total}',
      retranslatePartial: '{failed} segment(s) failed to retranslate; the rest are done.',
      fullRetranslateMismatch: 'The retranslation came back as {got} paragraphs, but the source has {want}; nothing was written — try again.',
      transModeLabel: 'Translation mode',
      transModeHint: 'Coherence first: one request for the full text, the fullest context and the most coherent wording. Alignment first: the paragraphs go out as one JSON array, the strongest paragraph alignment. Speed first: chunks run three at a time (16 sentences or 6 paragraphs each), the fastest for long texts.',
      modeWhole: 'Coherence first',
      modeArray: 'Alignment first',
      modeBatch: 'Speed first',
      translateArrayBusy: 'Translating segments…',
      fullTextHint: 'The full translation is editable and writes back to its segments; retranslate the document, switch to the source or a side-by-side view at any time. Editing resets the full-text score.',
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
      fileTranslate: 'Translate file',
      fileReading: 'Reading the file…',
      fileHint: 'Import .txt, .md, .html, or .docx files, or read text from an image; the translation can be downloaded.',
      fileEmpty: 'The file contains no text to translate.',
      fileTooLong: 'The file is too long: up to about 120,000 characters per pass. Split it first.',
      fileTooBig: 'The file is larger than 8 MB. Split it and try again.',
      fileTypeError: 'Choose a .txt, .md, .html, or .docx file.',
      fileLegacyDoc: 'Legacy .doc is not supported. Save it as .docx in Word first.',
      fileUnreadable: 'The file could not be read. Check that it is not damaged.',
      fileUnsupported: 'This browser cannot unpack .docx. Save the file as .txt or .md and import that.',
      fileRemove: 'Remove file',
      fileChipHint: 'The imported file name, reused when downloading the translation',
      downloadTranslation: 'Download translation',
      downloaded: 'Downloaded “{name}”.',
      downloadFailed: 'The download failed. Use “Copy translation” instead.',
      scoreFull: 'Full-text score',
      noVision: 'The selected model cannot read images. Choose a vision-capable model in Settings.',
      ocrHint: 'The recognized text is translated right away; edit it in the source box if needed.',
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
     * Split text into paragraphs on blank lines. Text without any blank
     * lines falls back to one paragraph per line, so the boxes match the
     * line breaks the full-text view actually shows.
     * @param {string} text - source text.
     * @returns {string[]} trimmed paragraphs.
     */
    function splitParagraphs(text) {
      const normalized = String(text).replace(/\r\n?/g, '\n');
      const parts = normalized
        .split(/\n\s*\n+/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length > 1 || !normalized.includes('\n')) return parts;
      const lines = normalized
        .split('\n')
        .map((part) => part.trim())
        .filter(Boolean);
      return lines.length > 1 ? lines : parts;
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
        // Only set when the text came from an imported file; drives the
        // download name and is harmless for typed or OCR'd documents.
        fileName: typeof value.fileName === 'string' ? value.fileName : '',
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

    /** Build a short, collision-resistant id for a history entry. */
    function newEntryId() {
      return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    }

    /**
     * Wrap a document as a brand-new history entry.
     * @param {object} doc - normalized document.
     * @param {number} [now] - timestamp in ms.
     * @returns {{ id: string, createdAt: number, updatedAt: number, doc: object }} entry.
     */
    function makeEntry(doc, now = Date.now()) {
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
    function sortEntries(entries) {
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
    function normalizeEntry(value) {
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
    function readHistory() {
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
    function docSize(doc) {
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
    function trimHistory(entries, keepId = null) {
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
    function newVersionId() {
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
    function makeVersion(doc, kind = 'manual', now = Date.now()) {
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
    function normalizeVersion(value) {
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
    function versionsSize(versions) {
      if (!Array.isArray(versions)) return 0;
      return versions.reduce((total, version) => total + docSize(version.doc), 0);
    }

    /**
     * Keep the newest snapshots within the per-document count and size budget.
     * The newest one is always kept, so the baseline never disappears.
     * @param {object[]} versions - snapshots, newest first.
     * @returns {object[]} trimmed snapshots.
     */
    function trimVersions(versions) {
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
    function versionDiffCount(left, right) {
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
    function addVersion(versions, version) {
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
    function versionLabel(kind, t) {
      const key = `versionLabel${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
      return t(key);
    }

    /**
     * The opening words of a document's translation, used as a row preview.
     * @param {object} doc - document.
     * @param {number} [max] - character budget.
     * @returns {string} preview, or an empty string without a translation.
     */
    function translationHead(doc, max = 96) {
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
    function pad2(value) {
      return String(value).padStart(2, '0');
    }

    /**
     * The text a history entry is searched through and quoted from: the source
     * followed by the full translation.
     * @param {object} entry - history entry.
     * @returns {string} searchable document text.
     */
    function historySearchText(entry) {
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
    function snippetAround(text, lower, keywords, before = 18, after = 90) {
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
    function highlightText(text, keywords) {
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
    function searchKeywords(query) {
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
    function formatStamp(value, t) {
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
    function entryTitle(doc, t) {
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
     * Suggest a textarea row count from its content length. Browsers that
     * support `field-sizing: content` size the box from the text itself, so
     * this is only the fallback used before that style applies.
     * @param {string} text - current translation.
     * @returns {number} row count between 2 and 14.
     */
    function rowsFor(text) {
      const length = String(text || '').length;
      return Math.min(14, Math.max(2, Math.ceil(length / 40) + 1));
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
 * Group sentence segments under the paragraph whose source contains them, in
 * document order. Both lists are split from the same source text, so a
 * monotonic scan is enough; a sentence only falls back to a full rescan when
 * the cursor has already passed the paragraph it belongs to.
 * @param {object} doc - current document.
 * @returns {object[][]} one array of sentence segments per paragraph.
 */
function groupSentencesByParagraph(doc) {
  const paragraphs = doc.paragraphs || [];
  const groups = paragraphs.map(() => []);
  let cursor = 0;
  const locate = (text, from) => {
    for (let index = from; index < paragraphs.length; index += 1) {
      if (String(paragraphs[index].source || '').includes(text)) return index;
    }
    return -1;
  };
  (doc.sentences || []).forEach((sentence) => {
    const text = String(sentence.source || '').trim();
    if (!text) return;
    let index = locate(text, cursor);
    if (index < 0) index = locate(text, 0);
    if (index < 0) return;
    cursor = index;
    groups[index].push(sentence);
  });
  return groups;
}

// Characters that need no space around them when two sentences are joined.
const CJK_EDGE = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/;

/**
 * Join sentence translations the way the paragraph they came from is typeset:
 * a space between Latin neighbours, nothing next to CJK text or full-width
 * punctuation.
 * @param {string[]} list - sentence translations in order.
 * @returns {string} joined paragraph translation.
 */
function joinSentenceTranslations(list) {
  let out = '';
  list.forEach((value) => {
    const text = String(value || '').trim();
    if (!text) return;
    if (!out) {
      out = text;
      return;
    }
    const needsSpace = !CJK_EDGE.test(out.slice(-1)) && !CJK_EDGE.test(text.slice(0, 1));
    out += `${needsSpace ? ' ' : ''}${text}`;
  });
  return out;
}

/**
 * Rebuild the paragraph a sentence belongs to from that paragraph's sentence
 * translations, so an edit made in the sentence view also shows up in the
 * paragraph view and in the full text. The paragraph score is dropped because
 * its text changed.
 * @param {object | null} doc - current document, already carrying the edit.
 * @param {string} sentenceId - id of the sentence that was just edited.
 * @returns {object | null} updated document, or the same object when nothing
 *   needs rebuilding.
 */
function syncSentenceToParagraph(doc, sentenceId) {
  if (!doc || !doc.paragraphs?.length || !doc.sentences?.length) return doc;
  const groups = groupSentencesByParagraph(doc);
  const index = groups.findIndex((group) => group.some((item) => item.id === sentenceId));
  if (index < 0) return doc;
  const translation = joinSentenceTranslations(groups[index].map((item) => item.translation));
  const paragraph = doc.paragraphs[index];
  if (paragraph.translation === translation) return doc;
  const paragraphs = doc.paragraphs.slice();
  paragraphs[index] = { ...paragraph, translation, score: null };
  return { ...doc, documentScore: null, paragraphs };
}

/**
 * Distribute a paragraph translation over the sentences that paragraph was
 * split into. When the edited text has a different number of sentence breaks
 * than the paragraph has sentences, neighbouring pieces are merged, and any
 * remaining sentence gets an empty box rather than a mid-word cut.
 * @param {string} text - paragraph translation.
 * @param {number} count - number of sentences in the paragraph.
 * @returns {string[]} exactly `count` pieces, in order.
 */
function splitTranslationPieces(text, count) {
  const source = String(text || '').trim();
  if (count <= 0) return [];
  if (!source) return new Array(count).fill('');
  if (count === 1) return [source];
  let pieces = splitSentences(source);
  if (pieces.length === 0) pieces = [source];
  if (pieces.length > count) {
    const base = Math.floor(pieces.length / count);
    const extra = pieces.length % count;
    const merged = [];
    let cursor = 0;
    for (let index = 0; index < count; index += 1) {
      const size = base + (index < extra ? 1 : 0);
      merged.push(joinSentenceTranslations(pieces.slice(cursor, cursor + size)));
      cursor += size;
    }
    pieces = merged;
  }
  while (pieces.length < count) {
    if (!splitLongestPiece(pieces)) break;
  }
  while (pieces.length < count) pieces.push('');
  return pieces.slice(0, count);
}

/**
 * Cut the longest piece near its middle, preferring a clause punctuation mark.
 * @param {string[]} pieces - pieces to modify in place.
 * @returns {boolean} whether a piece could be split.
 */
function splitLongestPiece(pieces) {
  let index = 0;
  for (let at = 1; at < pieces.length; at += 1) {
    if (pieces[at].length > pieces[index].length) index = at;
  }
  const text = pieces[index];
  const cut = middleCut(text);
  if (cut <= 0) return false;
  const left = text.slice(0, cut).trim();
  const right = text.slice(cut).trim();
  if (!left || !right) return false;
  pieces.splice(index, 1, left, right);
  return true;
}

// Punctuation an over-long piece can be cut on when a paragraph is spread over
// more sentences than its translation has sentence breaks.
const CLAUSE_BREAK = /[，,；;、：:]/;

/**
 * Pick a cut index near the middle of a text, but only at a natural boundary:
 * after a clause punctuation mark, or at a space. A text without either is left
 * whole, so a sentence box never shows a chopped-up word.
 * @param {string} text - text to cut.
 * @returns {number} cut index, or -1 when there is no natural boundary.
 */
function middleCut(text) {
  if (text.length < 2) return -1;
  const middle = text.length / 2;
  let best = -1;
  const closer = (candidate) => best < 0 || Math.abs(candidate - middle) < Math.abs(best - middle);
  for (let index = 1; index < text.length; index += 1) {
    if (CLAUSE_BREAK.test(text[index - 1]) && closer(index)) best = index;
  }
  if (best > 0) return best;
  for (let index = 1; index < text.length; index += 1) {
    if ((text[index - 1] === ' ' || text[index] === ' ') && closer(index)) best = index;
  }
  return best;
}

/**
 * Spread an edited paragraph translation over the sentences that paragraph was
 * split into, so an edit made in the paragraph view (or in the full-text box)
 * also shows up in the sentence view. Sentence scores are dropped because their
 * text changed.
 * @param {object | null} doc - current document, already carrying the edit.
 * @param {string} paragraphId - id of the paragraph that was just edited.
 * @returns {object | null} updated document, or the same object when nothing
 *   needs updating.
 */
function syncParagraphToSentences(doc, paragraphId) {
  if (!doc || !doc.paragraphs?.length || !doc.sentences?.length) return doc;
  const index = doc.paragraphs.findIndex((item) => item.id === paragraphId);
  if (index < 0) return doc;
  const group = groupSentencesByParagraph(doc)[index];
  if (!group.length) return doc;
  const paragraph = doc.paragraphs[index];
  const pieces = splitTranslationPieces(paragraph.translation, group.length);
  const byId = new Map(group.map((item, order) => [item.id, pieces[order] ?? '']));
  let changed = false;
  const sentences = doc.sentences.map((item) => {
    if (!byId.has(item.id)) return item;
    const translation = byId.get(item.id);
    if (translation === item.translation) return item;
    changed = true;
    return { ...item, translation, score: null };
  });
  if (!changed) return doc;
  return { ...doc, documentScore: null, sentences };
}

/**
 * Split an edited full-text translation back into the blocks it was joined
 * from: blank lines separate blocks, and every block is trimmed.
 * @param {string} text - edited full text.
 * @returns {string[]} trimmed, non-empty blocks.
 */
function splitTranslationBlocks(text) {
  return String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Fold an edit of the full-text box back onto the segment collection the text
 * was built from, so the paragraph and sentence views stay in sync while the
 * user keeps typing in one big box. Blocks map to segments by index; extra
 * blocks append a segment (with an empty source) instead of being dropped.
 * @param {object | null} doc - current document.
 * @param {string} text - edited full text.
 * @returns {object | null} updated document, or the very same object when the
 *   edit changes nothing, so a controlled textarea is not re-rendered while the
 *   user is still typing blank lines.
 */
function applyFullTranslationEdit(doc, text) {
  if (!doc) return doc;
  const key = doc.paragraphs.some((item) => item.translation.trim()) ? 'paragraphs' : 'sentences';
  const items = doc[key];
  const blocks = splitTranslationBlocks(text);
  const prefix = key === 'paragraphs' ? 'pn' : 'sn';
  const next = items.map((item, index) => {
    const translation = index < blocks.length ? blocks[index] : '';
    if (translation === item.translation) return item;
    return { ...item, translation, score: null };
  });
  for (let index = items.length; index < blocks.length; index += 1) {
    next.push({ id: `${prefix}${index}`, source: '', translation: blocks[index], score: null });
  }
  const changed = next.length !== items.length || next.some((item, index) => item !== items[index]);
  if (!changed) return doc;
  const updated = { ...doc, documentScore: null, [key]: next };
  if (key !== 'paragraphs') return updated;
  // The full-text box writes paragraphs; mirror each edited block onto the
  // sentences inside it so the sentence view does not go stale.
  return next.reduce((current, item, index) => (
    items[index] === item ? current : syncParagraphToSentences(current, item.id)
  ), updated);
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

/** MIME type of a Word document: OOXML inside a ZIP container. */
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
/** Larger files are rejected up front: one pass cannot translate them anyway. */
const MAX_IMPORT_BYTES = 8 * 1024 * 1024;
/** Extensions treated as plain UTF-8 text. */
const TEXT_FILE_EXTENSIONS = ['txt', 'text', 'md', 'markdown', 'log'];
/** Extensions parsed as HTML before translating. */
const HTML_FILE_EXTENSIONS = ['html', 'htm', 'xhtml'];
/** Named entities left in prose; numeric ones are resolved separately. */
const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  ldquo: '“',
  rdquo: '”',
  lsquo: '‘',
  rsquo: '’',
  laquo: '«',
  raquo: '»',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
  middot: '·',
  bull: '•',
  deg: '°',
  shy: '',
  zwj: '',
  zwnj: '',
};

/**
 * Lowercased extension of a file name, without the dot.
 * @param {string} name - file name.
 * @returns {string} extension or an empty string.
 */
function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return match ? match[1].toLowerCase() : '';
}

/**
 * Decode the entities Word leaves in `document.xml` and the named/numeric
 * entities found in HTML. One pass, so `&amp;lt;` decodes to `&lt;` rather
 * than being decoded twice.
 * @param {string} text - escaped text.
 * @returns {string} decoded text.
 */
function decodeXmlEntities(text) {
  const codePoint = (raw, radix, fallback) => {
    const value = Number.parseInt(raw, radix);
    if (!Number.isFinite(value) || value <= 0 || value > 0x10ffff) return fallback;
    return String.fromCodePoint(value);
  };
  return String(text).replace(/&#x([0-9a-f]+);|&#(\d+);|&([a-z][a-z0-9]*);/gi, (whole, hex, decimal, name) => {
    if (hex !== undefined) return codePoint(hex, 16, whole);
    if (decimal !== undefined) return codePoint(decimal, 10, whole);
    const key = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, key) ? HTML_ENTITIES[key] : whole;
  });
}

/**
 * Turn the body XML of a Word document into plain paragraphs.
 * Tabs become `\t`, soft breaks stay line breaks, and each `</w:p>` closes a
 * paragraph so the existing blank-line splitter sees real blocks.
 * @param {string} xml - `word/document.xml` contents.
 * @returns {string} plain text.
 */
function docxXmlToText(xml) {
  const text = String(xml || '')
    .replace(/<w:tab\b[^>]*\/?>/g, '\t')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<w:cr\b[^>]*\/?>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<\/w:p>/g, '\n\n')
    .replace(/<[^>]*>/g, '');
  return decodeXmlEntities(text);
}

/**
 * Reduce an HTML document to readable blocks. Scripts, styles, and the head
 * are dropped, block-level closes become paragraph breaks, and the remaining
 * tags are stripped, so the page's own paragraph splitter sees real blocks.
 * @param {string} html - HTML source.
 * @returns {string} plain text.
 */
function htmlToText(html) {
  const source = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template|svg|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    // Attributes are irrelevant to the text, but a self-closing <br> is a break.
    .replace(/<br\b[^>]*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|header|footer|main|aside|nav|figure|figcaption|blockquote|pre|h[1-6]|li|tr|table|ul|ol|dl|dd|dt)\s*>/gi, '\n\n')
    .replace(/<\/(td|th)\s*>/gi, '\t')
    .replace(/<[^>]*>/g, '');
  return decodeXmlEntities(source);
}

/**
 * Tell whether a file should be parsed as HTML.
 * @param {{ name?: string, type?: string }} file - picked file.
 * @returns {boolean} true for HTML.
 */
function isHtmlImport(file) {
  if (HTML_FILE_EXTENSIONS.includes(fileExtension(file && file.name))) return true;
  return String((file && file.type) || '').toLowerCase() === 'text/html';
}

/**
 * Escape text for an HTML document body.
 * @param {string} text - plain text.
 * @returns {string} escaped text with line breaks preserved.
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

/**
 * Locate one entry inside a ZIP archive by walking its central directory.
 * @param {Uint8Array} bytes - whole archive.
 * @param {string} wanted - exact entry name.
 * @returns {{ method: number, data: Uint8Array } | null} raw entry, or null.
 */
function findZipEntry(bytes, wanted) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 22) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // The end-of-central-directory record sits within the last 64 KiB plus its
  // own 22-byte body; scanning backwards finds it even with a ZIP comment.
  let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65558); at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) return null;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder('utf-8').decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === wanted) {
      if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) return null;
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const end = start + compressedSize;
      if (end > bytes.length || compressedSize === 0) return null;
      return { method, data: bytes.subarray(start, end) };
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

/**
 * Inflate a raw-deflate entry with the platform's own decompressor.
 * @param {Uint8Array} data - deflated bytes.
 * @returns {Promise<Uint8Array>} inflated bytes.
 */
async function inflateRaw(data) {
  if (typeof DecompressionStream !== 'function') {
    const error = new Error('deflate-raw is unavailable');
    error.code = 'DOCX_UNSUPPORTED';
    throw error;
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Read the text of a `.docx` file without any third-party library.
 * @param {ArrayBuffer} buffer - whole file.
 * @returns {Promise<string>} plain text, paragraphs separated by blank lines.
 */
async function readDocxText(buffer) {
  const entry = findZipEntry(new Uint8Array(buffer), 'word/document.xml');
  if (!entry) {
    const error = new Error('word/document.xml is missing');
    error.code = 'DOCX_INVALID';
    throw error;
  }
  let xml;
  if (entry.method === 0) xml = entry.data;
  else if (entry.method === 8) xml = await inflateRaw(entry.data);
  else {
    const error = new Error(`unsupported zip method ${entry.method}`);
    error.code = 'DOCX_UNSUPPORTED';
    throw error;
  }
  return docxXmlToText(new TextDecoder('utf-8').decode(xml));
}

/**
 * Normalize imported text so blank-line paragraph splitting behaves.
 * @param {string} raw - decoded file contents.
 * @returns {string} cleaned text.
 */
function normalizeImportedText(raw) {
  return String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Tell whether a picked file is a text file this page can read.
 * @param {{ name?: string, type?: string }} file - picked file.
 * @returns {boolean} true for plain text.
 */
function isTextImport(file) {
  if (TEXT_FILE_EXTENSIONS.includes(fileExtension(file && file.name))) return true;
  if (isHtmlImport(file)) return true;
  const type = String((file && file.type) || '');
  return type.startsWith('text/') || type === 'application/json';
}

/**
 * Extract plain text from a text file, an HTML page, or a Word document.
 * @param {{ name?: string, type?: string, text?: Function, arrayBuffer?: Function }} file - picked file.
 * @returns {Promise<string>} normalized text.
 */
async function extractImportText(file) {
  const extension = fileExtension(file && file.name);
  if (extension === 'doc' || (file && file.type === 'application/msword')) {
    const error = new Error('legacy .doc is unsupported');
    error.code = 'FILE_LEGACY_DOC';
    throw error;
  }
  if (extension === 'docx' || (file && file.type === DOCX_MIME)) {
    return normalizeImportedText(await readDocxText(await file.arrayBuffer()));
  }
  if (isHtmlImport(file)) return normalizeImportedText(htmlToText(await file.text()));
  return normalizeImportedText(await file.text());
}

/**
 * Translation paragraphs in document order, preferring paragraphs over the
 * sentence fallback.
 * @param {object | null} doc - current document.
 * @returns {string[]} translated blocks.
 */
function exportParagraphs(doc) {
  const paragraphs = doc && Array.isArray(doc.paragraphs) ? doc.paragraphs : [];
  const usable = paragraphs.some((item) => item.translation.trim())
    ? paragraphs
    : (doc && Array.isArray(doc.sentences) ? doc.sentences : []);
  return usable.map((item) => item.translation.trim()).filter(Boolean);
}

/**
 * Rebuild an imported HTML file around the translated paragraphs. Inline
 * markup is not preserved: the page translates text, so the export keeps the
 * block structure and drops styling rather than shipping broken tags.
 * @param {object} doc - current document.
 * @param {string} name - download name, used for the title.
 * @returns {string} HTML document.
 */
function buildHtmlExport(doc, name) {
  const title = name.replace(/\.[a-z0-9]+$/i, '');
  const lines = [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    '</head>',
    '<body>',
  ];
  for (const text of exportParagraphs(doc)) lines.push(`<p>${escapeHtml(text)}</p>`);
  lines.push('</body>', '</html>', '');
  return lines.join('\n');
}

/**
 * Name a downloaded translation after the imported file, when there is one.
 * @param {object | null} doc - current document.
 * @returns {string} file name ending in `.md`, `.html`, or `.txt`.
 */
function downloadFileName(doc) {
  const original = doc && typeof doc.fileName === 'string' ? doc.fileName : '';
  const base = original
    .replace(/\.[^./\\]+$/, '')
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const extension = /\.(md|markdown)$/i.test(original)
    ? 'md'
    : /\.(html?|xhtml)$/i.test(original)
      ? 'html'
      : 'txt';
  const stamp = new Date().toISOString().slice(0, 10);
  return `${(base || `translation-${stamp}`).slice(0, 80)}.${extension}`;
}

/**
 * Tell whether two provider/model pairs point at the same route.
 * @param {{ provider?: string, model?: string } | null} left - first route.
 * @param {{ provider?: string, model?: string } | null} right - second route.
 * @returns {boolean} true when both name the same provider and model.
 */
function sameRoute(left, right) {
  return Boolean(left && right && left.provider === right.provider && left.model === right.model);
}

/**
 * The identity a model picker option carries: `provider/model`.
 * @param {{ provider: string, model: string }} entry - model entry.
 * @returns {string} option value.
 */
function routeId(entry) {
  return `${entry.provider}/${entry.model}`;
}

/**
 * Read the stored model preference, dropping anything malformed so a broken
 * `prefs` value cannot make every request fail.
 * @param {unknown} value - stored value.
 * @returns {{ provider: string, model: string } | null} route or null.
 */
function storedRoutePreference(value) {
  if (!value || typeof value !== 'object') return null;
  const provider = typeof value.provider === 'string' ? value.provider.trim() : '';
  const model = typeof value.model === 'string' ? value.model.trim() : '';
  return provider && model ? { provider, model } : null;
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
.dta-head{display:flex;flex-direction:column;gap:6px;padding-top:26px}
[data-platform="darwin"] .dta-head{padding-top:calc(26px + var(--dsh-frame-top-clearance,0px))}
.dta-headTop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}
.dta-title{flex:none;margin:0;font-size:20px;font-weight:500;line-height:28px}
.dta-intro{max-width:760px;margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.dta-engine{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding-left:8px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.dta-engineDot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}
.dta-engine[data-state="unknown"] .dta-engineDot{background:var(--dsw-alias-state-idle-primary)}
.dta-engine--picker{gap:4px}
.dta-modelSelect{height:24px;max-width:min(260px,48vw);padding:0 16px 0 2px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;text-overflow:ellipsis;cursor:pointer;outline:none}
.dta-modelSelect:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dta-modelSelect:disabled{opacity:.6;cursor:default}
.dta-histBtn{max-width:min(340px,46vw);padding:0 9px 0 8px;color:var(--dsw-alias-label-secondary)}
.dta-histIcon{flex:none;opacity:.8}
.dta-histCaret{flex:none;margin-left:-1px;opacity:.55}
.dta-histBtn:hover .dta-histIcon{opacity:1}
.dta-histBtn:hover .dta-histCaret{opacity:.85}
.dta-histBtn[data-active="true"] .dta-histCaret{opacity:.85}
.dta-histLabel{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px}
.dta-histBtn[data-active="true"] .dta-histLabel{color:var(--dsw-alias-brand-primary)}
.dta-newBtn{flex:none;padding:0 8px}
.dta-drawerLayer{position:fixed;inset:0;z-index:120;display:flex;justify-content:flex-end;width:auto;max-width:none}
.dta-drawerMask{position:absolute;inset:0;background:rgba(14,16,20,.38);animation:dta-fade .16s ease-out both}
.dta-drawer{position:relative;display:flex;flex-direction:column;width:min(392px,92vw);height:100%;min-width:0;border-left:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);box-shadow:-18px 0 44px rgba(14,16,20,.18);animation:dta-slide .2s cubic-bezier(.2,.7,.3,1) both}
.dta-drawerHead{display:flex;align-items:center;gap:8px;padding:18px 16px 10px}
.dta-drawerTitle{margin:0;font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary)}
.dta-drawerClose{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;margin-left:auto;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;cursor:pointer}
.dta-drawerClose:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dta-drawerSearchWrap{display:flex;align-items:center;gap:8px;padding:0 16px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1)}
.dta-searchField{position:relative;display:flex;align-items:center;flex:1 1 auto;min-width:0}
.dta-searchIcon{position:absolute;left:9px;color:var(--dsw-alias-label-secondary);pointer-events:none}
.dta-searchField .dta-input{box-sizing:border-box;width:100%;flex:1 1 auto;min-width:0;padding:0 28px 0 28px}
.dta-searchField .dta-input::-webkit-search-cancel-button{display:none}
.dta-searchClear{position:absolute;right:3px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer}
.dta-searchClear:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.dta-drawerBody{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:10px 10px 14px}
.dta-drawerEmpty{margin:8px 6px;padding:18px 12px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px}
.dta-drawerFoot{flex:none;padding:10px 16px 14px;border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}
.dta-versionsBtn{flex:none;padding:0 8px}
.dta-drawer--versions{width:min(420px,94vw)}
.dta-versionBar{display:flex;align-items:center;gap:8px;padding:0 16px 12px}
.dta-versionBar .dta-btn{flex:1 1 auto;justify-content:center}
.dta-versionCurrent{display:flex;flex-direction:column;gap:5px;margin:0 4px 8px;padding:10px 11px;border-radius:var(--dsw-radius-md,8px);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}
.dta-versionCurrentLabel{font-size:12.5px;line-height:18px;font-weight:500;color:var(--dsw-alias-brand-primary)}
.dta-versionTop{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dta-versionTag{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1;white-space:nowrap}
.dta-versionTag[data-kind="initial"]{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.dta-versionTag[data-kind="optimize"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}
.dta-versionTag[data-kind="retranslate"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent)}
.dta-versionTime{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}
.dta-versionDiff{margin-left:auto;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);opacity:.8;white-space:nowrap}
.dta-versionRow[data-current="true"] .dta-versionDiff{opacity:1;color:var(--dsw-alias-brand-primary)}
.dta-versionText{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}
.dta-versionList{list-style:none;display:flex;flex-direction:column;gap:2px;margin:0;padding:0}
.dta-versionRow{display:flex;flex-direction:column;gap:5px;padding:9px 10px;border-radius:var(--dsw-radius-md,8px);background:transparent}
.dta-versionRow:hover{background:var(--dsw-alias-bg-layer-2)}
.dta-versionRow[data-current="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,transparent)}
.dta-versionActions{display:flex;align-items:center;gap:6px;margin-top:1px}
.dta-versionActions .dta-btn{flex:none}
.dta-historyList{list-style:none;display:flex;flex-direction:column;gap:2px;margin:0;padding:0}
.dta-historyRow{position:relative;display:flex;align-items:center;gap:6px;padding:7px 6px 7px 11px;border-radius:var(--dsw-radius-md,8px);background:transparent}
.dta-historyRow:hover{background:var(--dsw-alias-bg-layer-2)}
.dta-historyRow[data-active="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent)}
.dta-historyRow[data-active="true"]::before{content:"";position:absolute;left:2px;top:9px;bottom:9px;width:2.5px;border-radius:2px;background:var(--dsw-alias-brand-primary)}
.dta-historyRow[data-active="true"] .dta-historyTitle{color:var(--dsw-alias-brand-primary);font-weight:500}
.dta-historyOpen{display:flex;flex:1 1 auto;min-width:0;flex-direction:column;gap:3px;padding:1px 0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.dta-historyOpen:disabled{cursor:default;opacity:.6}
.dta-historyTitle{display:block;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dta-historyMeta{display:block;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dta-historyDelete{flex:none;height:24px;padding:0 7px;font-size:11.5px}
.dta-historyPin{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.45}
.dta-historyPin:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);opacity:1}
.dta-historyPin[data-pinned="true"]{opacity:1;color:var(--dsw-alias-brand-primary)}
.dta-historyRow:hover .dta-historyPin,.dta-historyRow:focus-within .dta-historyPin{opacity:1}
.dta-historySnippet{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:1px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dta-hl{padding:0 1px;border-radius:2px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 36%,transparent);color:var(--dsw-alias-label-primary)}
.dta-historyRow:not([data-active="true"]) .dta-historyDelete{opacity:0}
.dta-historyRow:hover .dta-historyDelete,.dta-historyRow:focus-within .dta-historyDelete{opacity:1}
.dta-historyRow .dta-historyDelete[data-arm="true"]{opacity:1}
@media (hover:none){.dta-historyRow:not([data-active="true"]) .dta-historyDelete{opacity:.75}.dta-historyPin{opacity:.9}}
.dta-btn--danger{color:var(--dsw-alias-state-error-primary)}
.dta-btn--danger[data-arm="true"]{border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}
/* Hover must not wash out the armed (destructive) state: the generic
   .dta-btn:hover rule is more specific than bare [data-arm="true"]. */
.dta-btn--danger[data-arm="true"]:hover:not(:disabled){border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent);color:var(--dsw-alias-state-error-primary)}
.dta-btn--danger[data-arm="true"]:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}
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
.dta-btn[aria-pressed="true"],.dta-btn[data-active="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
.dta-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.dta-toolbarSpacer{flex:1 1 0;min-width:0}
.dta-tabs{display:inline-flex;gap:2px;padding:2px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}
.dta-tab{height:26px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}
.dta-tab[aria-selected="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}
.dta-count{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}
.dta-transMode{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap;cursor:pointer;user-select:none}
.dta-transMode:hover{color:var(--dsw-alias-label-primary)}
.dta-transMode select{max-width:130px}
.dta-modeHelp{position:relative;display:inline-flex;align-items:center;color:var(--dsw-alias-label-secondary);cursor:help}
.dta-modeHelp:hover{color:var(--dsw-alias-label-primary)}
.dta-modeBubble{position:absolute;top:calc(100% + 8px);right:-4px;z-index:40;width:250px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.7;white-space:normal;text-align:left;cursor:default;box-shadow:0 6px 20px rgba(0,0,0,.16);visibility:hidden;opacity:0;transition:opacity .12s ease}
.dta-modeHelp:hover .dta-modeBubble,.dta-modeHelp[data-open="true"] .dta-modeBubble{visibility:visible;opacity:1}
.dta-fileChip{display:inline-flex;align-items:center;gap:5px;max-width:min(280px,50vw);height:22px;padding:0 3px 0 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1}
.dta-fileName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dta-fileClear{display:inline-flex;flex:none;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer}
.dta-fileClear:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
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
.dta-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch}
.dta-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.dta-colHead{display:flex;flex:none;align-items:center;gap:8px;min-height:16px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:16px}
.dta-colHint{color:var(--dsw-alias-label-secondary);opacity:.7;font-size:11px;white-space:nowrap}
.dta-sourceText{box-sizing:border-box;flex:1 1 auto;margin:0;padding:9px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.7}
.dta-translationText{box-sizing:border-box;flex:1 1 auto;width:100%;min-height:86px;padding:9px 10px;field-sizing:content;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.7;outline:none}
.dta-translationText:focus{border-color:var(--dsw-alias-brand-primary)}
.dta-promptBox{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}
.dta-promptCount{color:var(--dsw-alias-label-secondary);opacity:.75;font-size:11px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}
.dta-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}
.dta-scoreLine{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0;padding-top:8px;border-top:.5px dashed var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dta-scoreText{flex:0 1 auto;min-width:0}
.dta-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.dta-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:dta-pulse 1s ease-in-out infinite}
.dta-page button:focus-visible,.dta-page select:focus-visible,.dta-page textarea:focus-visible,.dta-page input:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}
.dta-fullText{box-sizing:border-box;width:100%;min-height:340px;padding:14px;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.8;outline:none}
.dta-fullText:focus{border-color:var(--dsw-alias-brand-primary)}
.dta-fullSource{box-sizing:border-box;flex:1 1 auto;width:100%;min-height:340px;margin:0;padding:14px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.8}
.dta-fullText--pane{flex:1 1 auto}
@keyframes dta-pulse{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes dta-slide{from{opacity:.5;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes dta-fade{from{opacity:0}to{opacity:1}}
@media (max-width:760px){.dta-columns{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.dta-dot{animation:none}.dta-drawer,.dta-drawerMask{animation:none}}
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
        const storedSession = readStorage(SESSION_STORAGE, {}) || {};
        let history = readHistory();
        if (history.length === 0) {
          // 1.1.x kept a single document in its own key; adopt it on first boot.
          const legacyDoc = normalizeDoc(readStorage(DOC_STORAGE, null));
          if (legacyDoc) history = [makeEntry(legacyDoc)];
        }
        const wanted = typeof storedSession.currentId === 'string' ? storedSession.currentId : null;
        // Pinned entries sort first, but a fresh boot still opens the document
        // that was actually used last.
        const latest = history.reduce((best, entry) => (
          !best || entry.updatedAt > best.updatedAt ? entry : best
        ), null);
        const current = history.find((entry) => entry.id === wanted) || latest;
        return {
          history,
          currentId: current ? current.id : null,
          doc: current ? current.doc : null,
          prefs: {
            sourceLanguage: typeof storedPrefs.sourceLanguage === 'string' ? storedPrefs.sourceLanguage : 'auto',
            targetLanguage: typeof storedPrefs.targetLanguage === 'string' ? storedPrefs.targetLanguage : '中文',
            view: storedPrefs.view === 'sentences' || storedPrefs.view === 'full' ? storedPrefs.view : 'paragraphs',
            // The full-text card opens on the translation, like the viewer expects.
            fullMode: storedPrefs.fullMode === 'source' || storedPrefs.fullMode === 'both' ? storedPrefs.fullMode : 'translation',
            route: storedRoutePreference(storedPrefs.route),
            // How the source goes to the model. Sessions that predate the
            // three-way switch only stored the wholeDoc boolean: false meant
            // batched, anything else whole-document.
            transMode: TRANS_MODES.includes(storedPrefs.transMode)
              ? storedPrefs.transMode
              : storedPrefs.wholeDoc === false ? 'batch' : 'whole',
          },
        };
      }, []);

      const [doc, setDoc] = React.useState(bootstrap.doc);
      const [draft, setDraft] = React.useState(bootstrap.doc ? bootstrap.doc.sourceText : '');
      const [sourceLanguage, setSourceLanguage] = React.useState(bootstrap.doc ? bootstrap.doc.sourceLanguage : bootstrap.prefs.sourceLanguage);
      const [targetLanguage, setTargetLanguage] = React.useState(bootstrap.doc ? bootstrap.doc.targetLanguage : bootstrap.prefs.targetLanguage);
      const [view, setView] = React.useState(bootstrap.prefs.view);
      const [fullMode, setFullMode] = React.useState(bootstrap.prefs.fullMode);
      const [transMode, setTransModeState] = React.useState(bootstrap.prefs.transMode);
      const [history, setHistory] = React.useState(bootstrap.history);
      const [currentId, setCurrentId] = React.useState(bootstrap.currentId);
      const [historyOpen, setHistoryOpen] = React.useState(false);
      const [versionsOpen, setVersionsOpen] = React.useState(false);
      const [confirmDeleteId, setConfirmDeleteId] = React.useState(null);
      const [confirmDeleteVersion, setConfirmDeleteVersion] = React.useState(null);
      const [historyQuery, setHistoryQuery] = React.useState('');
      // Scores are hidden by default on every mount; a button reveals them.
      const [showScores, setShowScores] = React.useState(false);
      const [status, setStatus] = React.useState(null);
      const [busy, setBusy] = React.useState({});
      const [errors, setErrors] = React.useState({});
      const [promptFor, setPromptFor] = React.useState(null);
      const [promptText, setPromptText] = React.useState('');
      const [notice, setNotice] = React.useState(null);
      // The translation-mode help bubble; native `title` tooltips do not
      // surface inside the Harness webview, so the icon draws its own.
      const [modeHelpOpen, setModeHelpOpen] = React.useState(false);
      const [engineModel, setEngineModel] = React.useState(null);
      const [engineState, setEngineState] = React.useState('unknown');
      // Models the Host can route to, and the one this page picked. `null`
      // means “follow the default route”, which keeps the page in step with
      // the profile's own model selection.
      const [routes, setRoutes] = React.useState([]);
      const [route, setRoute] = React.useState(bootstrap.prefs.route);
      const [defaultModel, setDefaultModel] = React.useState(null);
      // Providers whose model listing failed: the picker stays hidden when a
      // single route is all that could be discovered, so the reason has to be
      // visible somewhere.
      const [modelFailures, setModelFailures] = React.useState([]);
      const [copied, setCopied] = React.useState(null);
      const [fullScoreBusy, setFullScoreBusy] = React.useState(false);
      // Name of the imported file, kept so the translation can be downloaded
      // under the same name; it is also stored on the document itself.
      const [fileName, setFileName] = React.useState(bootstrap.doc ? bootstrap.doc.fileName : '');
      const copyTimer = React.useRef(null);
      const fileInputRef = React.useRef(null);
      const docInputRef = React.useRef(null);
      const historySearchRef = React.useRef(null);
      // Set when a document is loaded instead of edited, so loading an entry
      // does not bump its `updatedAt` and reshuffle the list.
      const skipSync = React.useRef(bootstrap.currentId);

      React.useEffect(() => {
        let cancelled = false;
        fetch(`${API}/health`, { headers: { accept: 'application/json' } })
          .then((response) => (response.ok ? response.json() : Promise.reject(new Error('unavailable'))))
          .then((data) => {
            if (cancelled) return;
            // `default` is the profile's own selection, which stays meaningful
            // after the page picks another model; `model` is the route the
            // Host would use right now. Prefer the former for the “follow the
            // default” label, fall back to the latter on older Hosts.
            const fallback = data && data.default
              && typeof data.default.provider === 'string' && typeof data.default.model === 'string'
              ? `${data.default.provider}/${data.default.model}`
              : null;
            const model = typeof (data && data.model) === 'string' ? data.model : null;
            setEngineModel(model);
            setDefaultModel(fallback || model);
            setEngineState(model || fallback ? 'ok' : 'unknown');
            const list = Array.isArray(data && data.models)
              ? data.models
                .filter((entry) => entry && typeof entry.provider === 'string' && typeof entry.model === 'string')
                .map((entry) => ({
                  provider: entry.provider,
                  model: entry.model,
                  ...(typeof entry.label === 'string' && entry.label ? { label: entry.label } : {}),
                  ...(typeof entry.providerLabel === 'string' && entry.providerLabel
                    ? { providerLabel: entry.providerLabel }
                    : {}),
                }))
              : [];
            setRoutes(list);
            const failed = Array.isArray(data && data.modelFailures)
              ? data.modelFailures
                .filter((item) => item && typeof item.provider === 'string')
                .map((item) => ({
                  provider: item.provider,
                  message: typeof item.message === 'string' && item.message ? item.message : t('modelUnknown'),
                }))
              : [];
            setModelFailures(failed);
            // A stored pick that has disappeared from the catalog would make
            // every request fail, so fall back to the default route instead.
            if (route && list.length > 0 && !list.some((entry) => sameRoute(entry, route))) {
              setRoute(null);
              setNotice({ kind: 'info', text: t('modelMissing') });
            } else if (list.length <= 1 && failed.length > 0) {
              // Explains an empty picker instead of leaving the page with a
              // bare model name and no way to change it.
              setNotice({
                kind: 'info',
                text: `${t('modelUnavailable')}: ${failed
                  .map((item) => `${item.provider} — ${item.message}`)
                  .join('; ')}`,
              });
            }
          })
          .catch(() => {
            if (!cancelled) setEngineState('unknown');
          });
        return () => {
          cancelled = true;
        };
      }, []);

      React.useEffect(() => {
        writeStorage(HISTORY_STORAGE, history);
      }, [history]);

      React.useEffect(() => {
        writeStorage(SESSION_STORAGE, currentId ? { currentId } : null);
      }, [currentId]);

      React.useEffect(() => {
        // Migrated into history on boot; the legacy key is no longer written.
        writeStorage(DOC_STORAGE, null);
      }, []);

      // Keep the open history entry in sync with every edit of the document.
      React.useEffect(() => {
        if (!doc || !currentId) return;
        if (skipSync.current === currentId) {
          skipSync.current = null;
          return;
        }
        const now = Date.now();
        setHistory((list) => list.map((entry) => (
          entry.id === currentId ? { ...entry, doc, updatedAt: now } : entry
        )));
      }, [doc, currentId]);

      React.useEffect(() => {
        writeStorage(PREFS_STORAGE, {
          sourceLanguage,
          targetLanguage,
          view,
          fullMode,
          route: route ? { provider: route.provider, model: route.model } : null,
          transMode,
        });
      }, [sourceLanguage, targetLanguage, view, fullMode, route, transMode]);

      // Escape closes the side drawer, like a native dialog.
      React.useEffect(() => {
        if (!historyOpen) return undefined;
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
        const onKey = (event) => {
          if (event && event.key === 'Escape') closeHistory();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [historyOpen]);

      // The revisions drawer follows the same dismissal rule.
      React.useEffect(() => {
        if (!versionsOpen) return undefined;
        if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return undefined;
        const onKey = (event) => {
          if (event && event.key === 'Escape') closeVersions();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [versionsOpen]);

      // Focusing the search box makes “open history, type a word” one gesture.
      React.useEffect(() => {
        if (!historyOpen) return;
        const node = historySearchRef.current;
        if (node && typeof node.focus === 'function') node.focus();
      }, [historyOpen]);

      // Search records are built only while a query is active, and cached per
      // entry version so typing a filter does not re-scan the whole history.
      const searchCache = React.useRef(new Map());
      const keywords = searchKeywords(historyQuery);
      /**
       * @param {object} entry - history entry.
       * @returns {{ text: string, lower: string }} cached search record.
       */
      function searchRecord(entry) {
        const key = `${entry.id}:${entry.updatedAt}`;
        const cache = searchCache.current;
        let record = cache.get(key);
        if (!record) {
          const text = historySearchText(entry);
          record = { text, lower: text.toLowerCase() };
          if (cache.size > 600) cache.clear();
          cache.set(key, record);
        }
        return record;
      }
      const sortedHistory = React.useMemo(() => sortEntries(history), [history]);
      // Revisions belong to the open document, so they are read through the
      // entry rather than kept in their own state.
      const versions = React.useMemo(() => {
        const entry = history.find((item) => item.id === currentId);
        return entry && Array.isArray(entry.versions) ? entry.versions : [];
      }, [history, currentId]);
      const visibleHistory = React.useMemo(() => {
        if (keywords.length === 0) return sortedHistory;
        return sortedHistory.filter((entry) => {
          const record = searchRecord(entry);
          return keywords.every((word) => record.lower.includes(word));
        });
      }, [sortedHistory, historyQuery]);

      React.useEffect(() => () => {
        if (copyTimer.current) clearTimeout(copyTimer.current);
      }, []);

      const collectionKey = view === 'sentences' ? 'sentences' : 'paragraphs';
      const fullTranslation = buildFullTranslation(doc);
      const fullSourceLength = doc ? doc.sourceText.length : 0;
      const fullScore = doc ? doc.documentScore : null;
      const items = doc ? doc[collectionKey] : [];
      const sourceOption = sourceLanguage === 'auto' ? undefined : sourceLanguage;
      const activeRoute = route ? routes.find((entry) => sameRoute(entry, route)) : null;
      const routeLabel = route
        ? (activeRoute && activeRoute.label) || routeId(route)
        : engineModel || defaultModel || t('modelUnknown');
      const canSwitchModel = routes.length > 1;
      // Tooltip for the model chip: the online state, plus why the picker is
      // missing when discovery came back short.
      const engineTitle = engineState === 'ok'
        ? [t('engineOnline'), !canSwitchModel && modelFailures.length > 0 ? t('modelUnavailable') : '']
          .filter(Boolean)
          .join(' · ')
        : t('engineOffline');
      // Group the candidates the way the Host names its providers: a flat list
      // mixes `deepseek-account/deepseek-flash` with another provider's models
      // and hides which family a name belongs to.
      const routeGroups = React.useMemo(() => {
        const groups = [];
        const byProvider = new Map();
        for (const entry of routes) {
          let group = byProvider.get(entry.provider);
          if (!group) {
            group = { provider: entry.provider, label: entry.providerLabel || entry.provider, items: [] };
            byProvider.set(entry.provider, group);
            groups.push(group);
          }
          group.items.push(entry);
        }
        return groups;
      }, [routes]);
      const isWorking = Boolean(status);
      const charCount = (count) => `${count} ${count === 1 ? t('charUnitOne') : t('charUnitMany')}`;
      const sentenceCount = (count) => `${count} ${count === 1 ? t('sentenceUnitOne') : t('sentenceUnitMany')}`;
      const paragraphCount = (count) => `${count} ${count === 1 ? t('paragraphUnitOne') : t('paragraphUnitMany')}`;
      const statusText = !status
        ? ''
        : status.kind === 'translating'
          ? (status.total
            ? format(t('translateProgress'), { done: status.done ?? 0, total: status.total })
            : status.array
              ? t('translateArrayBusy')
              : status.whole ? t('translateWholeBusy') : t('translating'))
          : status.kind === 'ocr'
            ? t('ocrReading')
            : status.kind === 'reading'
              ? t('fileReading')
              : status.kind === 'scoring'
                ? format(t('scoreAllProgress'), { done: status.done ?? 0, total: status.total ?? 0 })
              : status.kind === 'optimizing'
                ? format(t('optimizeProgress'), { done: status.done ?? 0, total: status.total ?? 0 })
                // Whole-document retranslate has no top status line: the
                // retranslate button in the full-text toolbar already shows
                // the same progress right where the action lives.
                : '';

      /**
       * Model fields for a Host request. Omitted while following the default
       * route so the Host keeps resolving it on its own.
       * @returns {{ route?: { provider: string, model: string } }} request fragment.
       */
      function routePayload() {
        return route ? { route: { provider: route.provider, model: route.model } } : {};
      }

      /**
       * Point later requests at another model.
       * @param {string} value - option value: `default` or `provider/model`.
       */
      function handleRouteChange(value) {
        if (value === 'default') {
          setRoute(null);
          setNotice({
            kind: 'info',
            text: format(t('modelSwitchHint'), { model: defaultModel || t('modelFollowDefault') }),
          });
          return;
        }
        const entry = routes.find((item) => routeId(item) === value);
        if (!entry) return;
        setRoute({ provider: entry.provider, model: entry.model });
        setNotice({
          kind: 'info',
          text: format(t('modelSwitchHint'), { model: entry.label || routeId(entry) }),
        });
      }

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
          const next = {
            ...current,
            ...(edited ? { documentScore: null } : {}),
            [collection]: current[collection].map((item) => (
              item.id === id ? { ...item, ...patch } : item
            )),
          };
          // Keep the other views in step: a sentence edit rebuilds the paragraph
          // around it, a paragraph edit is spread back over its sentences.
          if (!edited) return next;
          return collection === 'sentences'
            ? syncSentenceToParagraph(next, id)
            : syncParagraphToSentences(next, id);
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

      /**
       * Land a whole-document reply: write one translation per paragraph,
       * derive the sentence boxes, and record the history entry.
       * @param {string} text - source text.
       * @param {{ fileName?: string }} meta - imported file name to remember.
       * @param {{ sentences: string[], paragraphs: string[] }} shape - the
       *   splits the caller computed for the same text.
       * @param {string[]} pieces - one trimmed translation per paragraph.
       * @param {string | null} model - model label from the reply, if any.
       * @returns {boolean} true (the caller keeps its control flow flat).
       */
      function applyDocumentPieces(text, meta, shape, pieces, model) {
        // Sentence boxes follow the paragraph translations, cut to the same
        // sentence count the source paragraph was split into.
        const sentenceTranslations = [];
        shape.paragraphs.forEach((source, index) => {
          sentenceTranslations.push(...splitTranslationPieces(pieces[index], splitSentences(source).length));
        });
        const nextDoc = {
          sourceText: text,
          fileName: typeof meta.fileName === 'string' ? meta.fileName : '',
          sourceLanguage,
          targetLanguage,
          documentScore: null,
          sentences: shape.sentences.map((source, index) => ({
            id: `s${index}`,
            source,
            translation: sentenceTranslations[index] ?? '',
            score: null,
          })),
          paragraphs: shape.paragraphs.map((source, index) => ({
            id: `p${index}`,
            source,
            translation: pieces[index],
            score: null,
          })),
        };
        setDoc(nextDoc);
        setFileName(nextDoc.fileName);
        // Every successful translation becomes a history entry.
        const entry = makeEntry(nextDoc);
        skipSync.current = entry.id;
        setCurrentId(entry.id);
        setHistory((list) => trimHistory([entry, ...list]));
        setStatus(null);
        if (model) {
          setEngineModel(model);
          setEngineState('ok');
        }
        return true;
      }

      /**
       * Translate the whole text in one request so the model sees the full
       * context. The source goes out as-is — the Host prompt asks the model
       * to keep the paragraph structure — and the reply is split back into
       * paragraphs on blank lines; the sentence boxes are derived per
       * paragraph.
       * @param {string} text - source text.
       * @param {{ fileName?: string }} meta - imported file name to remember.
       * @param {{ sentences: string[], paragraphs: string[] }} shape - the
       *   splits the caller computed for the same text.
       * @returns {Promise<boolean>} true when the translation landed; false
       *   when the reply did not line up with the paragraphs (the caller then
       *   falls back to the batched path).
       * @throws when the request fails or the reply is unusable.
       */
      async function translateWholeDocument(text, meta, shape) {
        setNotice(null);
        setErrors({});
        setPromptFor(null);
        setStatus({ kind: 'translating', whole: true });
        const data = await requestJson('translate', {
          document: text,
          targetLanguage,
          ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          ...routePayload(),
        });
        if (typeof data.document !== 'string' || !data.document.trim()) {
          throw localError(t('translateFailed'));
        }
        const pieces = data.document
          .trim()
          .split(/\n{2,}/)
          .map((part) => part.trim())
          .filter(Boolean);
        if (pieces.length !== shape.paragraphs.length) return false;
        return applyDocumentPieces(text, meta, shape, pieces, data.model ? String(data.model) : null);
      }

      /**
       * Translate the whole text in one request that carries the paragraphs
       * as a JSON array. The Host answers with an equally long array, so
       * every paragraph lands on its own translation without trusting the
       * model to reproduce a layout; the sentence boxes are derived per
       * paragraph.
       * @param {string} text - source text.
       * @param {{ fileName?: string }} meta - imported file name to remember.
       * @param {{ sentences: string[], paragraphs: string[] }} shape - the
       *   splits the caller computed for the same text.
       * @returns {Promise<boolean>} true when the translation landed; false
       *   when the reply did not line up with the paragraphs (the caller then
       *   falls back to the batched path).
       * @throws when the request fails or the reply is unusable.
       */
      async function translateArrayDocument(text, meta, shape) {
        setNotice(null);
        setErrors({});
        setPromptFor(null);
        setStatus({ kind: 'translating', array: true });
        const data = await requestJson('translate', {
          document: shape.paragraphs,
          targetLanguage,
          ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
          ...routePayload(),
        });
        const reply = Array.isArray(data.paragraphs) ? data.paragraphs : null;
        if (!reply || reply.length !== shape.paragraphs.length) return false;
        const pieces = reply.map((item) => String(item ?? '').trim());
        if (!pieces.every(Boolean)) return false;
        return applyDocumentPieces(text, meta, shape, pieces, data.model ? String(data.model) : null);
      }

      /**
       * Validate one block of text and translate it into the comparison view.
       * @param {string} rawText - source text.
       * @param {{ fileName?: string }} [meta] - imported file name to remember.
       * @returns {Promise<boolean>} true when the translation landed.
       */
      async function translateText(rawText, meta = {}) {
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
        // The whole-document request sends the text as-is, so the raw length
        // is what counts against the Host's document budget. The array
        // request wraps every paragraph in JSON quotes and commas instead.
        const wholeDocChars = text.length;
        const arrayChars = totalChars + paragraphs.length * 4 + 2;
        if (transMode === 'whole' && wholeDocChars <= MAX_WHOLE_DOC_CHARS) {
          try {
            const landed = await translateWholeDocument(text, meta, { sentences, paragraphs });
            if (landed) return true;
          } catch (error) {
            if (Number(error && error.status) !== 400) {
              setStatus(null);
              setNotice({ kind: 'error', text: describeError(error, t) });
              return false;
            }
            // The running Host rejected the document request — an older
            // version that only knows the segment lists. The batched path
            // below still gets the job done, so no error is shown.
          }
          // The whole-document reply did not line up with the paragraphs;
          // the batched path below still gets the job done.
        } else if (transMode === 'array' && arrayChars <= MAX_WHOLE_DOC_CHARS) {
          try {
            const landed = await translateArrayDocument(text, meta, { sentences, paragraphs });
            if (landed) return true;
          } catch (error) {
            if (Number(error && error.status) !== 400) {
              setStatus(null);
              setNotice({ kind: 'error', text: describeError(error, t) });
              return false;
            }
            // Same fallback contract as whole-document mode: an older Host
            // that does not know the array protocol leads to the batched
            // path below, without an error.
          }
          // The reply was not an aligned array; the batched path below still
          // gets the job done.
        }
        setNotice(null);
        setErrors({});
        setPromptFor(null);
        // Chunk like the Host does (16 sentences / 6 paragraphs per request),
        // three chunks in flight, so the counter moves while a long document
        // is translating. Each client chunk lands as one Host chunk. The
        // progress counter tracks paragraphs only — sentences are translated
        // by the same pass but never shown as their own steps.
        const totalItems = sentences.length + paragraphs.length;
        const chunks = [];
        for (let index = 0; index < sentences.length; index += 16) {
          chunks.push({ kind: 'sentences', offset: index, items: sentences.slice(index, index + 16) });
        }
        for (let index = 0; index < paragraphs.length; index += 6) {
          chunks.push({ kind: 'paragraphs', offset: index, items: paragraphs.slice(index, index + 6) });
        }
        const results = {
          sentences: new Array(sentences.length).fill(''),
          paragraphs: new Array(paragraphs.length).fill(''),
        };
        let done = 0;
        let failed = 0;
        let lastError = null;
        // The Host echoes the model that served the request; the batched pass
        // spans several requests, so remember the last one that answered.
        let replyModel = null;
        setStatus({ kind: 'translating', done: 0, total: paragraphs.length });
        try {
          await mapLimit(chunks, 3, async (chunk) => {
            try {
              const data = await requestJson('translate', {
                [chunk.kind]: chunk.items,
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
                ...routePayload(),
              });
              if (typeof data.model === 'string' && data.model) replyModel = data.model;
              const list = chunk.kind === 'sentences' ? data.sentences : data.paragraphs;
              if (Array.isArray(list)) {
                list.forEach((translated, index) => {
                  const at = chunk.offset + index;
                  if (at < results[chunk.kind].length && typeof translated === 'string' && translated.trim()) {
                    results[chunk.kind][at] = translated.trim();
                  }
                });
              } else {
                failed += chunk.items.length;
              }
            } catch (error) {
              failed += chunk.items.length;
              lastError = error;
            }
            if (chunk.kind === 'paragraphs') done += chunk.items.length;
            setStatus({ kind: 'translating', done, total: paragraphs.length });
          });
          if (failed >= totalItems) {
            setStatus(null);
            setNotice({ kind: 'error', text: lastError ? describeError(lastError, t) : t('translateFailed') });
            return false;
          }
          if (failed > 0) {
            setNotice({ kind: 'warn', text: format(t('translatePartial'), { failed }) });
          }
          const nextDoc = {
            sourceText: text,
            fileName: typeof meta.fileName === 'string' ? meta.fileName : '',
            sourceLanguage,
            targetLanguage,
            documentScore: null,
            sentences: sentences.map((source, index) => ({
              id: `s${index}`,
              source,
              translation: results.sentences[index],
              score: null,
            })),
            paragraphs: paragraphs.map((source, index) => ({
              id: `p${index}`,
              source,
              translation: results.paragraphs[index],
              score: null,
            })),
          };
          setDoc(nextDoc);
          setFileName(nextDoc.fileName);
          // Every successful translation becomes a history entry.
          const entry = makeEntry(nextDoc);
          skipSync.current = entry.id;
          setCurrentId(entry.id);
          setHistory((list) => trimHistory([entry, ...list]));
          setStatus(null);
          if (replyModel) {
            setEngineModel(replyModel);
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
        await translateText(draft, { fileName });
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
            ...routePayload(),
          });
          const text = typeof data.text === 'string' ? data.text.trim() : '';
          setStatus(null);
          if (!text) {
            setNotice({ kind: 'warn', text: t('ocrEmpty') });
            return;
          }
          setDraft(text);
          setFileName('');
          await translateText(text, { fileName: '' });
        } catch (error) {
          setStatus(null);
          setNotice({ kind: 'error', text: describeError(error, t) });
        }
      }

      /** Open the hidden image picker. */
      function handlePickImage() {
        if (fileInputRef.current) fileInputRef.current.click();
      }

      /** Open the hidden document picker. */
      function handlePickDocument() {
        if (docInputRef.current) docInputRef.current.click();
      }

      /**
       * Map a file-reading failure onto the localized hint that explains it.
       * @param {unknown} error - thrown value.
       * @returns {string} message.
       */
      function describeFileError(error) {
        if (error && error.code === 'DOCX_UNSUPPORTED') return t('fileUnsupported');
        if (error && error.code === 'FILE_LEGACY_DOC') return t('fileLegacyDoc');
        if (error && error.code === 'DOCX_INVALID') return t('fileUnreadable');
        return describeError(error, t);
      }

      /**
       * Read a text or Word file, put it in the source box, then translate it.
       * @param {File} file - picked or dropped file.
       */
      async function handleDocumentFile(file) {
        if (!file) return;
        const extension = fileExtension(file.name);
        if (extension === 'doc' || (file.type === 'application/msword')) {
          setNotice({ kind: 'warn', text: t('fileLegacyDoc') });
          return;
        }
        if (extension !== 'docx' && file.type !== DOCX_MIME && !isTextImport(file)) {
          setNotice({ kind: 'warn', text: t('fileTypeError') });
          return;
        }
        if (Number(file.size) > MAX_IMPORT_BYTES) {
          setNotice({ kind: 'warn', text: t('fileTooBig') });
          return;
        }
        setNotice(null);
        setStatus({ kind: 'reading' });
        try {
          const text = await extractImportText(file);
          setStatus(null);
          if (!text) {
            setNotice({ kind: 'warn', text: t('fileEmpty') });
            return;
          }
          if (text.length > MAX_TOTAL_CHARS) {
            setNotice({ kind: 'warn', text: t('fileTooLong') });
            return;
          }
          setDraft(text);
          setFileName(file.name);
          await translateText(text, { fileName: file.name });
        } catch (error) {
          setStatus(null);
          setNotice({ kind: 'error', text: describeFileError(error) });
        }
      }

      /** Drop a file onto the source box to import it. */
      function handleSourceDrop(event) {
        const files = event.dataTransfer && event.dataTransfer.files;
        if (!files || files.length === 0) return;
        event.preventDefault();
        handleDocumentFile(files[0]);
      }

      /** Forget the imported file name, keeping the text in the box. */
      function handleClearFile() {
        setFileName('');
        setNotice(null);
      }

      /** Save the current translation as a text file. */
      function handleDownload() {
        if (!doc) return;
        const text = buildFullTranslation(doc).trim();
        if (!text) {
          setNotice({ kind: 'warn', text: t('noTranslationFull') });
          return;
        }
        const name = downloadFileName(doc);
        const html = /\.(html?|xhtml)$/i.test(doc.fileName || '');
        try {
          if (typeof Blob !== 'function' || typeof document === 'undefined'
            || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
            throw new Error('download is unavailable');
          }
          const payload = html ? buildHtmlExport(doc, name) : `${text}\n`;
          const type = html ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8';
          const href = URL.createObjectURL(new Blob([payload], { type }));
          const anchor = document.createElement('a');
          anchor.href = href;
          anchor.download = name;
          if (document.body && typeof document.body.appendChild === 'function') document.body.appendChild(anchor);
          anchor.click();
          if (typeof anchor.remove === 'function') anchor.remove();
          if (typeof URL.revokeObjectURL === 'function') setTimeout(() => URL.revokeObjectURL(href), 0);
          setNotice({ kind: 'info', text: format(t('downloaded'), { name }) });
        } catch {
          setNotice({ kind: 'error', text: t('downloadFailed') });
        }
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
            ...routePayload(),
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

      /**
       * Turn a stored score back into an instruction the model can act on:
       * the number plus the reviewer's feedback, or the number alone.
       * @param {{value?: number, comment?: string} | null} score - segment score.
       * @returns {string} instruction text.
       */
      function suggestionFor(score) {
        const value = score && Number.isFinite(Number(score.value)) ? Math.round(Number(score.value)) : null;
        const comment = String((score && score.comment) || '').trim();
        return comment
          ? format(t('optimizePrompt'), { score: value ?? '—', comment })
          : format(t('optimizePromptScore'), { score: value ?? '—' });
      }

      /** Rewrite one segment from its own score and feedback. */
      async function handleOptimize(collection, item) {
        if (!item.score) return;
        await handleRetranslate(collection, item, suggestionFor(item.score), {
          limit: MAX_SUGGESTION_CHARS,
          busyKind: 'optimize',
        });
      }

      /**
       * Run a batch of optimistic rewrites, three in flight at a time, while the
       * toolbar reports progress. Every entry carries its own instruction.
       * @param {'sentences' | 'paragraphs'} collection - target collection.
       * @param {{id: string, source: string, translation: string, instruction: string}[]} snapshot - work list.
       */
      async function runOptimizeBatch(collection, snapshot) {
        if (snapshot.length === 0) return;
        setNotice(null);
        setStatus({ kind: 'optimizing', done: 0, total: snapshot.length });
        // One snapshot for the whole batch: the state before the first rewrite,
        // not thirty rows for one click.
        const before = doc;
        let rewritten = 0;
        let done = 0;
        try {
          await mapLimit(snapshot, 3, async (item) => {
            try {
              const data = await requestJson('retranslate', {
                source: item.source,
                ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
                extraPrompt: item.instruction,
                kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
                ...routePayload(),
              });
              if (typeof data.translation === 'string' && data.translation.trim()) {
                patchSegment(collection, item.id, { translation: data.translation.trim(), score: null });
                rewritten += 1;
              } else {
                setErrors((current) => ({ ...current, [item.id]: t('retranslateFailed') }));
              }
            } catch (error) {
              setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
            }
            done += 1;
            setStatus({ kind: 'optimizing', done, total: snapshot.length });
          });
          if (rewritten > 0) recordVersion(before, 'optimize');
        } finally {
          setStatus(null);
        }
      }

      /** Apply every available suggestion in the current view. */
      async function handleOptimizeAll() {
        if (!doc || status) return;
        const collection = collectionKey;
        const snapshot = items
          .filter((item) => item.translation.trim() && item.score)
          .map((item) => ({
            id: item.id,
            source: item.source,
            translation: item.translation,
            instruction: suggestionFor(item.score),
          }));
        await runOptimizeBatch(collection, snapshot);
      }

      /**
       * Apply the whole-document feedback: the document score speaks about every
       * paragraph, so each one is rewritten under that same instruction.
       */
      async function handleOptimizeFull() {
        if (!doc || status || !fullScore) return;
        const instruction = suggestionFor(fullScore);
        const snapshot = doc.paragraphs
          .filter((item) => item.translation.trim())
          .map((item) => ({
            id: item.id,
            source: item.source,
            translation: item.translation,
            instruction,
          }));
        if (snapshot.length === 0) {
          setNotice({ kind: 'warn', text: t('noTranslationYet') });
          return;
        }
        await runOptimizeBatch('paragraphs', snapshot);
      }

      /**
       * Retranslate the document from the full-text view. Batched mode
       * retranslates every paragraph on its own, three in flight at a time;
       * whole-document and segment-array modes send one request so the model
       * sees the full context (the array protocol is a translate-side
       * guarantee, retranslation keeps the marked-document protocol).
       * Either way the pass leaves one revision snapshot.
       * @param {string} [extraPrompt] - optional instruction, capped like the
       *   per-segment prompt box.
       */
      async function runFullRetranslate(extraPrompt) {
        if (!doc || status) return;
        if (!doc.sourceText.trim() || doc.paragraphs.length === 0) {
          setNotice({ kind: 'warn', text: t('noSource') });
          return;
        }
        if (transMode !== 'batch') {
          await retranslateWholeDocument(extraPrompt);
          return;
        }
        await retranslateSegmentsPass(extraPrompt);
      }

      /**
       * Whole-document retranslate: the full source goes out at once (the
       * existing translation as reference), and the reply is split back into
       * paragraphs on blank lines.
       * @param {string} [extraPrompt] - optional instruction.
       */
      async function retranslateWholeDocument(extraPrompt) {
        const instruction = String(extraPrompt ?? '').trim().slice(0, MAX_PROMPT_CHARS);
        const collection = doc.paragraphs.some((item) => item.translation.trim())
          ? 'paragraphs'
          : 'sentences';
        const segments = doc[collection];
        const reference = buildFullTranslation(doc);
        const before = doc;
        setNotice(null);
        setPromptFor(null);
        setPromptText('');
        // `array` marks the segment-array mode, so the busy label can name
        // the mode instead of the whole-document wording.
        setStatus({ kind: 'retranslatingFull', array: transMode === 'array' });
        try {
          const data = await requestJson('retranslate', {
            source: doc.sourceText,
            ...(reference.trim() ? { translation: reference.trim() } : {}),
            ...(instruction ? { extraPrompt: instruction } : {}),
            kind: 'document',
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
            ...routePayload(),
          });
          if (typeof data.translation !== 'string' || !data.translation.trim()) {
            setNotice({ kind: 'error', text: t('retranslateFailed') });
            return;
          }
          const parts = data.translation
            .trim()
            .split(/\n{2,}/)
            .map((part) => part.trim())
            .filter(Boolean);
          // The Host prompt asks for the same paragraph count; a mismatch
          // cannot be mapped back faithfully, so nothing is written.
          if (parts.length !== segments.length) {
            setNotice({
              kind: 'warn',
              text: format(t('fullRetranslateMismatch'), { got: parts.length, want: segments.length }),
            });
            return;
          }
          segments.forEach((item, index) => {
            patchSegment(collection, item.id, { translation: parts[index], score: null });
          });
          recordVersion(before, 'retranslate');
        } catch (error) {
          setNotice({ kind: 'error', text: describeError(error, t) });
        } finally {
          setStatus(null);
        }
      }

      /**
       * Per-paragraph retranslate, three in flight at a time. Existing
       * translations ride along as reference, each reply replaces its own
       * paragraph, and the pass leaves one revision snapshot.
       * @param {string} [extraPrompt] - optional instruction.
       */
      async function retranslateSegmentsPass(extraPrompt) {
        const instruction = String(extraPrompt ?? '').trim().slice(0, MAX_PROMPT_CHARS);
        const snapshot = doc.paragraphs
          .filter((item) => item.translation.trim() || item.source.trim())
          .map((item) => ({
            id: item.id,
            source: item.source,
            translation: item.translation,
          }));
        const before = doc;
        let rewritten = 0;
        let failed = 0;
        let done = 0;
        setNotice(null);
        setPromptFor(null);
        setPromptText('');
        setStatus({ kind: 'retranslatingFull', done: 0, total: snapshot.length });
        try {
          await mapLimit(snapshot, 3, async (item) => {
            try {
              const data = await requestJson('retranslate', {
                source: item.source,
                ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
                ...(instruction ? { extraPrompt: instruction } : {}),
                kind: 'paragraph',
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
                ...routePayload(),
              });
              if (typeof data.translation === 'string' && data.translation.trim()) {
                patchSegment('paragraphs', item.id, { translation: data.translation.trim(), score: null });
                rewritten += 1;
              } else {
                failed += 1;
              }
            } catch (error) {
              failed += 1;
              setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
            }
            done += 1;
            setStatus({ kind: 'retranslatingFull', done, total: snapshot.length });
          });
          if (rewritten > 0) recordVersion(before, 'retranslate');
          // The full-text view has no per-segment rows to hang errors on, so a
          // partial or total failure is reported as one notice instead.
          if (failed > 0) {
            setNotice({
              kind: rewritten > 0 ? 'warn' : 'error',
              text: rewritten > 0
                ? format(t('retranslatePartial'), { failed })
                : t('retranslateFailed'),
            });
          }
        } finally {
          setStatus(null);
        }
      }

      /**
       * Retranslate one sentence or paragraph, optionally with an instruction.
       * @param {'sentences' | 'paragraphs'} collection - target collection.
       * @param {object} item - segment.
       * @param {string} [extraPrompt] - instruction text.
       * @param {{limit?: number, busyKind?: string}} [options] - instruction cap and busy label.
       */
      async function handleRetranslate(collection, item, extraPrompt, options = {}) {
        const id = item.id;
        const limit = options.limit ?? MAX_PROMPT_CHARS;
        const busyKind = options.busyKind ?? 'retranslate';
        const instruction = String(extraPrompt ?? '').trim().slice(0, limit);
        // The text that is about to be replaced, so a finished rewrite can be
        // rolled back to exactly what the user saw before it.
        const before = doc;
        clearSegmentError(id);
        setBusy((current) => ({ ...current, [id]: busyKind }));
        try {
          const data = await requestJson('retranslate', {
            source: item.source,
            ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
            ...(instruction ? { extraPrompt: instruction } : {}),
            kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
            ...routePayload(),
          });
          if (typeof data.translation !== 'string' || !data.translation.trim()) {
            throw localError(t('retranslateFailed'));
          }
          patchSegment(collection, id, { translation: data.translation.trim(), score: null });
          recordVersion(before, busyKind === 'optimize' ? 'optimize' : 'retranslate');
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
            ...routePayload(),
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
                ...routePayload(),
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

      /** Clear the transient per-segment state (errors, spinners, prompt box). */
      function resetSegmentState() {
        setErrors({});
        setBusy({});
        setPromptFor(null);
        setPromptText('');
        setStatus(null);
        setConfirmDeleteId(null);
      }

      /** Open the history drawer with a clean search state. */
      function openHistory() {
        setHistoryQuery('');
        setConfirmDeleteId(null);
        closeVersions();
        setHistoryOpen(true);
      }

      /** Close the history drawer and forget any search or armed delete. */
      function closeHistory() {
        setHistoryOpen(false);
        setConfirmDeleteId(null);
        setHistoryQuery('');
        // The search index is rebuilt on demand, so do not keep it alive.
        searchCache.current.clear();
      }

      /** Leave the current document and return to an empty input form. */
      function handleNewTranslation() {
        if (isWorking) return;
        if (!doc && draft.trim()) {
          const message = t('discardDraft');
          if (typeof window.confirm === 'function' && !window.confirm(message)) return;
        }
        skipSync.current = null;
        setDoc(null);
        setCurrentId(null);
        setDraft('');
        setFileName('');
        setNotice(null);
        resetSegmentState();
        closeHistory();
        closeVersions();
        writeStorage(DOC_STORAGE, null);
      }

      /**
       * Open one history entry in the comparison view.
       * @param {object} entry - history entry.
       */
      function handleOpenEntry(entry) {
        if (!entry || !entry.doc || isWorking) return;
        if (entry.id !== currentId) skipSync.current = entry.id;
        setCurrentId(entry.id);
        setDoc(entry.doc);
        setDraft(entry.doc.sourceText);
        setFileName(entry.doc.fileName);
        setSourceLanguage(entry.doc.sourceLanguage);
        setTargetLanguage(entry.doc.targetLanguage);
        setNotice(null);
        resetSegmentState();
        closeHistory();
        closeVersions();
      }

      /**
       * Pin or unpin one entry. Pinned entries keep their `updatedAt`, so the
       * order inside each group still reflects real use rather than the click.
       * @param {string} entryId - history entry id.
       */
      function handleTogglePin(entryId) {
        setHistory((list) => list.map((entry) => (
          entry.id === entryId ? { ...entry, pinned: !entry.pinned } : entry
        )));
      }

      /**
       * Delete a history entry after a second, arming click.
       * @param {string} entryId - history entry id.
       */
      function handleDeleteEntry(entryId) {
        if (isWorking) return;
        if (confirmDeleteId !== entryId) {
          setConfirmDeleteId(entryId);
          return;
        }
        setConfirmDeleteId(null);
        const rest = history.filter((entry) => entry.id !== entryId);
        setHistory(rest);
        if (entryId !== currentId) return;
        const next = sortEntries(rest)[0] || null;
        if (next) {
          skipSync.current = next.id;
          setCurrentId(next.id);
          setDoc(next.doc);
          setDraft(next.doc.sourceText);
          setSourceLanguage(next.doc.sourceLanguage);
          setTargetLanguage(next.doc.targetLanguage);
        } else {
          skipSync.current = null;
          setCurrentId(null);
          setDoc(null);
          setDraft('');
        }
        setNotice(null);
        resetSegmentState();
      }

      /** Open the revisions drawer for the document that is on screen. */
      function openVersions() {
        if (!doc) return;
        setConfirmDeleteVersion(null);
        closeHistory();
        setVersionsOpen(true);
      }

      /** Close the revisions drawer and forget any armed delete. */
      function closeVersions() {
        setVersionsOpen(false);
        setConfirmDeleteVersion(null);
      }

      /**
       * Store a copy of a document in the current entry's revisions.
       * @param {object | null} source - document to snapshot.
       * @param {'initial' | 'retranslate' | 'optimize' | 'restore' | 'manual'} kind - what creates the snapshot.
       */
      function recordVersion(source, kind) {
        if (!source || !currentId) return;
        const version = makeVersion(source, kind);
        setHistory((list) => trimHistory(list.map((entry) => (
          entry.id === currentId ? { ...entry, versions: addVersion(entry.versions, version) } : entry
        )), currentId));
      }

      /** Save the current translation as a revision the user can return to. */
      function handleSaveVersion() {
        if (!doc || isWorking) return;
        recordVersion(doc, 'manual');
        setNotice({ kind: 'info', text: t('versionSaved') });
      }

      /**
       * Roll the open document back to one stored revision. The outgoing text
       * is snapshotted first, so a rollback can itself be undone.
       * @param {object} version - revision snapshot.
       */
      function handleRestoreVersion(version) {
        if (!doc || !version || isWorking) return;
        const restored = normalizeDoc(version.doc);
        if (!restored) return;
        recordVersion(doc, 'restore');
        setDoc(restored);
        setDraft(restored.sourceText);
        setSourceLanguage(restored.sourceLanguage);
        setTargetLanguage(restored.targetLanguage);
        setNotice({
          kind: 'info',
          text: format(t('versionRestored'), { label: versionLabel(version.kind, t) }),
        });
        resetSegmentState();
        closeVersions();
      }

      /**
       * Delete one revision after a second, arming click.
       * @param {string} versionId - revision id.
       */
      function handleDeleteVersion(versionId) {
        if (isWorking) return;
        if (confirmDeleteVersion !== versionId) {
          setConfirmDeleteVersion(versionId);
          return;
        }
        setConfirmDeleteVersion(null);
        setHistory((list) => list.map((entry) => (
          entry.id === currentId
            ? { ...entry, versions: (entry.versions || []).filter((item) => item.id !== versionId) }
            : entry
        )));
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

      /**
       * Switch the translation mode. The differences live on the help icon
       * next to the picker, so switching itself stays silent.
       * @param {string} next - `whole`, `array`, or `batch`.
       */
      function setTransMode(next) {
        if (!TRANS_MODES.includes(next)) return;
        setTransModeState(next);
      }

      /**
       * The translation-mode picker with its help icon. Clicking the icon
       * (or hovering it) opens a small bubble that spells out how the three
       * modes differ, so nothing else needs to.
       * @returns {object} virtual DOM node.
       */
      function transModePicker() {
        return h('label', { className: 'dta-transMode' },
          t('transModeLabel'),
          h('select', {
            className: 'dta-select',
            value: transMode,
            onChange: (event) => setTransMode(event.target.value),
            'aria-label': t('transModeLabel'),
          },
            h('option', { value: 'whole' }, t('modeWhole')),
            h('option', { value: 'array' }, t('modeArray')),
            h('option', { value: 'batch' }, t('modeBatch')),
          ),
          h('span', {
            className: 'dta-modeHelp',
            'data-open': modeHelpOpen,
            'aria-expanded': modeHelpOpen,
            onClick: (event) => {
              if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
              setModeHelpOpen(!modeHelpOpen);
            },
          },
            h('svg', { viewBox: '0 0 16 16', width: 12, height: 12, 'aria-hidden': true },
              h('circle', { cx: 8, cy: 8, r: 6.6, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3 }),
              h('path', {
                d: 'M6.2 6.1c.1-1 .9-1.6 1.8-1.6 1 0 1.8.6 1.8 1.6 0 .7-.4 1.1-.9 1.4-.5.3-.8.6-.8 1.2v.3',
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': 1.3,
                'stroke-linecap': 'round',
              }),
              h('circle', { cx: 8.1, cy: 11.2, r: 0.9, fill: 'currentColor' }),
            ),
            // Always in the DOM; CSS shows it on hover or when opened by a
            // click. Native `title` tooltips never surface in the Harness
            // webview, and a document-level click-to-close races the
            // framework's own event delegation, so neither is relied on.
            h('span', { className: 'dta-modeBubble', role: 'tooltip' }, t('transModeHint')),
          ),
        );
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
            transModePicker(),
            h('span', { className: 'dta-count' }, charCount(draft.length)),
            fileName
              ? h('span', { className: 'dta-fileChip', title: t('fileChipHint') },
                h('svg', {
                  viewBox: '0 0 16 16',
                  width: 12,
                  height: 12,
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.5,
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'aria-hidden': true,
                },
                  h('path', { d: 'M9 1.9H4.6a1.2 1.2 0 0 0-1.2 1.2v9.8a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.4z' }),
                  h('path', { d: 'M9 1.9v3.5h3.6' }),
                ),
                h('span', { className: 'dta-fileName' }, fileName),
                h('button', {
                  type: 'button',
                  className: 'dta-fileClear',
                  title: t('fileRemove'),
                  'aria-label': t('fileRemove'),
                  onClick: handleClearFile,
                }, '×'),
              )
              : null,
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
            onDrop: handleSourceDrop,
            onDragOver: (event) => {
              // Accepting the drag is what makes the drop event fire.
              if (event && typeof event.preventDefault === 'function') event.preventDefault();
            },
          }),
          h('div', { className: 'dta-actions' },
            h('span', { className: 'dta-hint' }, t('fileHint')),
            h('input', {
              ref: docInputRef,
              type: 'file',
              accept: `.txt,.text,.md,.markdown,.log,.html,.htm,.xhtml,.docx,${DOCX_MIME},text/plain,text/markdown,text/html`,
              style: { display: 'none' },
              onChange: (event) => {
                const file = event.target.files && event.target.files[0];
                event.target.value = '';
                if (file) handleDocumentFile(file);
              },
            }),
            h('button', {
              type: 'button',
              className: 'dta-btn',
              disabled: isWorking,
              onClick: handlePickDocument,
            }, t('fileTranslate')),
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
              status && (status.kind === 'translating' || status.kind === 'ocr' || status.kind === 'reading')
                ? h(BusyDot, null)
                : null,
              status && (status.kind === 'translating' || status.kind === 'ocr' || status.kind === 'reading')
                ? statusText
                : t('translate'),
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
        // The suggestion reads the score, so it belongs where the score and its
        // comment are shown, not in the row of segment actions.
        const optimizeButton = showScores && score
          ? h('button', {
            type: 'button',
            className: 'dta-btn dta-btn--sm',
            title: t('optimizeHint'),
            disabled: busyKind === 'retranslate' || busyKind === 'optimize',
            onClick: () => handleOptimize(collection, item),
          }, busyKind === 'optimize' ? t('optimizing') : t('optimize'))
          : null;
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
                disabled: busyKind === 'retranslate' || busyKind === 'optimize',
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
                maxLength: MAX_PROMPT_CHARS,
                placeholder: t('promptPlaceholder'),
                'aria-label': t('promptPlaceholder'),
                onChange: (event) => setPromptText(String(event.target.value).slice(0, MAX_PROMPT_CHARS)),
                onKeyDown: (event) => {
                  if (event.key !== 'Enter') return;
                  if (event.nativeEvent && event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (promptText.trim()) handleRetranslate(collection, item, promptText);
                },
              }),
              h('span', { className: 'dta-promptCount' }, `${promptText.length}/${MAX_PROMPT_CHARS}`),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--primary',
                disabled: !promptText.trim() || busyKind === 'retranslate' || busyKind === 'optimize',
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
            ? h('div', { className: 'dta-scoreLine' },
              h('span', { className: 'dta-scoreText' }, `${t('scoreLabel')} ${score.value} · ${score.comment}`),
              optimizeButton,
            )
            : optimizeButton
              ? h('div', { className: 'dta-scoreLine' }, optimizeButton)
              : null,
        );
      }

      /** Format one history entry's secondary line. */
      function entryMeta(entry) {
        const doc = entry.doc;
        const sourceLabel = doc.sourceLanguage && doc.sourceLanguage !== 'auto'
          ? doc.sourceLanguage
          : t('autoDetect');
        return [
          formatStamp(entry.updatedAt, t),
          `${sourceLabel} → ${doc.targetLanguage}`,
          `${paragraphCount(doc.paragraphs.length)} / ${sentenceCount(doc.sentences.length)}`,
        ].join(' · ');
      }

      /** Render one row of the history list. */
      function renderHistoryRow(entry) {
        const active = entry.id === currentId;
        const armed = confirmDeleteId === entry.id;
        const pinned = entry.pinned === true;
        const title = entryTitle(entry.doc, t);
        // While searching, quote the hit in context instead of the first line.
        let snippet = null;
        if (keywords.length > 0) {
          const record = searchRecord(entry);
          snippet = snippetAround(record.text, record.lower, keywords);
        }
        return h('li', {
          key: entry.id,
          className: 'dta-historyRow',
          'data-active': active ? 'true' : 'false',
          'data-pinned': pinned ? 'true' : 'false',
        },
          h('button', {
            type: 'button',
            className: 'dta-historyOpen',
            disabled: isWorking,
            'aria-current': active ? 'true' : undefined,
            title,
            onClick: () => handleOpenEntry(entry),
          },
            h('span', { className: 'dta-historyTitle' }, highlightText(title, keywords)),
            h('span', { className: 'dta-historyMeta' }, entryMeta(entry)),
            snippet
              ? h('span', { className: 'dta-historySnippet' }, highlightText(snippet, keywords))
              : null,
          ),
          h('button', {
            type: 'button',
            className: 'dta-historyPin',
            'data-pinned': pinned ? 'true' : 'false',
            'aria-pressed': pinned,
            'aria-label': pinned ? t('unpinEntry') : t('pinEntry'),
            title: pinned ? t('unpinEntry') : t('pinEntry'),
            onClick: () => handleTogglePin(entry.id),
          },
            h('svg', {
              viewBox: '0 0 24 24',
              width: 14,
              height: 14,
              fill: pinned ? 'currentColor' : 'none',
              stroke: 'currentColor',
              strokeWidth: 1.7,
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': true,
            },
              h('path', { d: 'M12 17v5' }),
              h('path', {
                d: 'M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z',
              }),
            ),
          ),
          h('button', {
            type: 'button',
            className: 'dta-btn dta-btn--sm dta-btn--ghost dta-btn--danger dta-historyDelete',
            'data-arm': armed ? 'true' : 'false',
            'aria-label': armed ? t('confirmDelete') : t('deleteEntry'),
            title: armed ? t('historyDeleteHint') : t('deleteEntry'),
            disabled: isWorking,
            onClick: () => handleDeleteEntry(entry.id),
          }, armed ? t('confirmDelete') : t('deleteEntry')),
        );
      }

      /** Render the history side drawer, opened from the header. */
      function renderHistoryDrawer() {
        const total = history.length;
        const searching = keywords.length > 0;
        const summary = searching
          ? format(t('historyMatchCount'), { count: visibleHistory.length })
          : format(t('historyCount'), { count: total });
        return h('div', { className: 'dta-drawerLayer' },
          h('div', {
            className: 'dta-drawerMask',
            'aria-hidden': true,
            onClick: closeHistory,
          }),
          h('aside', {
            className: 'dta-drawer',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('historyTitle'),
          },
            h('div', { className: 'dta-drawerHead' },
              h('h2', { className: 'dta-drawerTitle' }, t('historyTitle')),
              total ? h('span', { className: 'dta-count' }, summary) : null,
              h('button', {
                type: 'button',
                className: 'dta-drawerClose',
                title: t('closePanel'),
                'aria-label': t('closePanel'),
                onClick: closeHistory,
              }, '×'),
            ),
            h('div', { className: 'dta-drawerSearchWrap' },
              h('div', { className: 'dta-searchField' },
                h('svg', {
                  className: 'dta-searchIcon',
                  viewBox: '0 0 16 16',
                  width: 14,
                  height: 14,
                  fill: 'none',
                  'aria-hidden': true,
                },
                  h('circle', { cx: 7, cy: 7, r: 4.5, stroke: 'currentColor', strokeWidth: 1.4 }),
                  h('path', {
                    d: 'm10.4 10.4 3.2 3.2',
                    stroke: 'currentColor',
                    strokeWidth: 1.4,
                    strokeLinecap: 'round',
                  }),
                ),
                h('input', {
                  className: 'dta-input dta-historySearch',
                  type: 'search',
                  ref: historySearchRef,
                  value: historyQuery,
                  placeholder: t('historySearchPlaceholder'),
                  'aria-label': t('historySearch'),
                  onChange: (event) => setHistoryQuery(event.target.value),
                  onKeyDown: (event) => {
                    // Enter opens the newest match, so search can replace browsing.
                    if (!event || event.key !== 'Enter' || visibleHistory.length === 0) return;
                    if (typeof event.preventDefault === 'function') event.preventDefault();
                    handleOpenEntry(visibleHistory[0]);
                  },
                }),
                historyQuery
                  ? h('button', {
                    type: 'button',
                    className: 'dta-searchClear',
                    title: t('historyClearSearch'),
                    'aria-label': t('historyClearSearch'),
                    onClick: () => setHistoryQuery(''),
                  }, '×')
                  : null,
              ),
            ),
            h('div', { className: 'dta-drawerBody' },
              total === 0
                ? h('p', { className: 'dta-drawerEmpty' }, t('historyEmpty'))
                : (visibleHistory.length === 0
                  ? h('p', { className: 'dta-drawerEmpty' }, t('historyNoMatch'))
                  : h('ul', { className: 'dta-historyList' }, visibleHistory.map(renderHistoryRow))),
            ),
            h('p', { className: 'dta-drawerFoot' }, format(t('historyHint'), { max: MAX_HISTORY_ENTRIES })),
          ),
        );
      }

      /**
       * Render one stored revision of the open document.
       * @param {object} version - revision snapshot.
       * @returns {object} element.
       */
      function renderVersionRow(version) {
        const armed = confirmDeleteVersion === version.id;
        const diff = doc ? versionDiffCount(version.doc, doc) : 0;
        const head = translationHead(version.doc);
        const score = version.doc.documentScore;
        const scoreText = score ? ` · ${t('scoreLabel')} ${score.value}` : '';
        return h('li', {
          key: version.id,
          className: 'dta-versionRow',
          'data-current': diff === 0 ? 'true' : 'false',
        },
          h('div', { className: 'dta-versionTop' },
            h('span', { className: 'dta-versionTag', 'data-kind': version.kind }, versionLabel(version.kind, t)),
            h('span', { className: 'dta-versionTime' }, formatStamp(version.at, t)),
            h('span', {
              className: 'dta-versionDiff',
              title: score && score.comment ? `${t('scoreLabel')} ${score.value} · ${score.comment}` : '',
            },
              diff === 0 ? t('versionSame') : format(t('versionDiff'), { count: diff }),
              scoreText,
            ),
          ),
          head ? h('p', { className: 'dta-versionText' }, head) : null,
          h('div', { className: 'dta-versionActions' },
            h('button', {
              type: 'button',
              className: 'dta-btn dta-btn--sm',
              disabled: isWorking || diff === 0,
              title: diff === 0 ? t('versionSame') : t('versionRestore'),
              onClick: () => handleRestoreVersion(version),
            }, t('versionRestore')),
            h('button', {
              type: 'button',
              className: 'dta-btn dta-btn--sm dta-btn--ghost dta-btn--danger',
              'data-arm': armed ? 'true' : 'false',
              title: armed ? t('historyDeleteHint') : t('versionDelete'),
              disabled: isWorking,
              onClick: () => handleDeleteVersion(version.id),
            }, armed ? t('confirmDelete') : t('versionDelete')),
          ),
        );
      }

      /** Render the revisions drawer: the current text plus every snapshot. */
      function renderVersionsDrawer() {
        const total = versions.length;
        const head = translationHead(doc);
        const currentScore = doc ? doc.documentScore : null;
        return h('div', { className: 'dta-drawerLayer' },
          h('div', {
            className: 'dta-drawerMask',
            'aria-hidden': true,
            onClick: closeVersions,
          }),
          h('aside', {
            className: 'dta-drawer dta-drawer--versions',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('versions'),
          },
            h('div', { className: 'dta-drawerHead' },
              h('h2', { className: 'dta-drawerTitle' }, t('versions')),
              total ? h('span', { className: 'dta-count' }, format(t('versionsCount'), { count: total })) : null,
              h('button', {
                type: 'button',
                className: 'dta-drawerClose',
                title: t('closePanel'),
                'aria-label': t('closePanel'),
                onClick: closeVersions,
              }, '×'),
            ),
            h('div', { className: 'dta-versionBar' },
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                title: t('versionSaveHint'),
                disabled: isWorking,
                onClick: handleSaveVersion,
              }, t('versionSave')),
            ),
            h('div', { className: 'dta-drawerBody' },
              doc
                ? h('div', { className: 'dta-versionCurrent' },
                  h('div', { className: 'dta-versionTop' },
                    h('span', { className: 'dta-versionCurrentLabel' }, t('versionCurrent')),
                    h('span', { className: 'dta-versionTime' },
                      `${paragraphCount(doc.paragraphs.length)} / ${sentenceCount(doc.sentences.length)}`),
                    currentScore
                      ? h('span', { className: 'dta-versionDiff' }, `${t('scoreLabel')} ${currentScore.value}`)
                      : null,
                  ),
                  head ? h('p', { className: 'dta-versionText' }, head) : null,
                )
                : null,
              total === 0
                ? h('p', { className: 'dta-drawerEmpty' }, t('versionsEmpty'))
                : h('ul', { className: 'dta-versionList' }, versions.map(renderVersionRow)),
            ),
            h('p', { className: 'dta-drawerFoot' }, format(t('versionsFoot'), { max: MAX_VERSIONS })),
          ),
        );
      }

      /** Render the comparison workspace. */
      function renderDocument() {
        const scoringStatus = status && status.kind === 'scoring';
        const optimizingStatus = status && status.kind === 'optimizing';
        // Once every translated segment already carries a score, the batch action
        // turns into a rescore instead of pretending nothing has been scored yet.
        const allScored = items.length > 0
          && items.some((item) => item.translation.trim())
          && items.every((item) => !item.translation.trim()
            || (item.score && Number.isFinite(Number(item.score.value))));
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
                  'aria-selected': view === 'paragraphs',
                  onClick: () => setView('paragraphs'),
                }, t('paragraphs')),
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
                  'aria-selected': view === 'full',
                  onClick: () => setView('full'),
                }, t('fullText')),
              ),
              h('div', { className: 'dta-toolbarSpacer' }),
              // An imported document keeps showing where it came from, so the
              // download name and the source file stay obvious after a reload.
              doc && doc.fileName
                ? h('span', { className: 'dta-fileChip', title: t('fileChipHint') },
                  h('svg', {
                    viewBox: '0 0 16 16',
                    width: 12,
                    height: 12,
                    fill: 'none',
                    stroke: 'currentColor',
                    'stroke-width': 1.5,
                    'stroke-linecap': 'round',
                    'stroke-linejoin': 'round',
                    'aria-hidden': true,
                  },
                    h('path', { d: 'M9 1.9H4.6a1.2 1.2 0 0 0-1.2 1.2v9.8a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.4z' }),
                    h('path', { d: 'M9 1.9v3.5h3.6' }),
                  ),
                  h('span', { className: 'dta-fileName' }, doc.fileName),
                )
                : null,
              h('span', { className: 'dta-count' },
                view === 'full'
                  ? charCount(fullMode === 'source' ? fullSourceLength : fullTranslation.length)
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
                : h(React.Fragment, null,
                  h('button', {
                    type: 'button',
                    className: 'dta-btn',
                    disabled: isWorking,
                    onClick: handleScoreAll,
                  }, scoringStatus
                    ? format(t('scoreAllProgress'), { done: status.done, total: status.total })
                    : allScored ? t('rescore') : t('scoreAll')),
                  // Suggestions are only as good as the scores behind them, so
                  // the batch action waits until the whole view has been scored
                  // and the scores are actually visible.
                  showScores && allScored
                    ? h('button', {
                      type: 'button',
                      className: 'dta-btn',
                      title: t('optimizeAllHint'),
                      disabled: isWorking,
                      onClick: handleOptimizeAll,
                    }, optimizingStatus
                      ? format(t('optimizeProgress'), { done: status.done, total: status.total })
                      : t('optimizeAll'))
                    : null,
                ),
            ),
            status && statusText
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

      /**
       * Write an edit made in the full-text box back onto the segments it was
       * rendered from, so switching views shows the same wording.
       * @param {string} text - edited full text.
       */
      function handleFullTranslationChange(text) {
        setDoc((current) => applyFullTranslationEdit(current, text));
      }

      /** Render the copy-friendly full text in the chosen display mode. */
      function renderFullText() {
        const fullSource = doc ? doc.sourceText : '';
        const optimizing = status && status.kind === 'optimizing';
        const fullRetranslating = status && status.kind === 'retranslatingFull';
        const modes = [
          { key: 'translation', label: t('fullModeTranslation') },
          { key: 'source', label: t('fullModeSource') },
          { key: 'both', label: t('fullModeBoth') },
        ];
        const translationBox = h('textarea', {
          className: cx('dta-fullText', fullMode === 'both' && 'dta-fullText--pane'),
          value: fullTranslation,
          rows: fullMode === 'both' ? 18 : 20,
          spellCheck: false,
          placeholder: t('emptyFull'),
          'aria-label': t('fullText'),
          onChange: (event) => handleFullTranslationChange(event.target.value),
        });
        return h('section', { className: 'dta-card' },
          h('div', { className: 'dta-toolbar' },
            h('div', { className: 'dta-tabs', role: 'tablist', 'aria-label': t('fullModeLabel') },
              modes.map((mode) => h('button', {
                key: mode.key,
                type: 'button',
                role: 'tab',
                className: 'dta-tab',
                'aria-selected': fullMode === mode.key,
                onClick: () => setFullMode(mode.key),
              }, mode.label)),
            ),
            showScores && fullScore
              ? h('span', { className: 'dta-scoreBadge', 'data-tone': scoreTone(fullScore.value), title: fullScore.comment || '' },
                `${t('scoreLabel')} ${fullScore.value}`)
              : null,
            h('div', { className: 'dta-toolbarSpacer' }),
            transModePicker(),
            h('button', {
              type: 'button',
              className: 'dta-btn',
              title: t('fullRetranslateHint'),
              disabled: isWorking,
              onClick: () => runFullRetranslate(''),
            }, fullRetranslating
              ? (status.total
                ? format(t('retranslateAllProgress'), { done: status.done, total: status.total })
                : status.array ? t('retranslateArrayBusy') : t('retranslateFullBusy'))
              : t('retranslate')),
            h('button', {
              type: 'button',
              className: 'dta-btn',
              'aria-expanded': promptFor === 'full',
              disabled: isWorking,
              onClick: () => {
                setPromptFor(promptFor === 'full' ? null : 'full');
                setPromptText('');
              },
            }, t('addPrompt')),
            h('button', {
              type: 'button',
              className: 'dta-btn',
              title: t('downloadTranslation'),
              onClick: handleDownload,
            },
              h('svg', {
                viewBox: '0 0 16 16',
                width: 12,
                height: 12,
                fill: 'none',
                stroke: 'currentColor',
                'stroke-width': 1.6,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                'aria-hidden': true,
              },
                h('path', { d: 'M8 2.8v7.4' }),
                h('path', { d: 'M5 7.2 8 10.2l3-3' }),
                h('path', { d: 'M3 12.6h10' }),
              ),
              h('span', null, t('downloadTranslation')),
            ),
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
          promptFor === 'full'
            ? h('div', { className: 'dta-promptBox' },
              h('input', {
                className: 'dta-input',
                value: promptText,
                autoFocus: true,
                maxLength: MAX_PROMPT_CHARS,
                placeholder: t('promptPlaceholder'),
                'aria-label': t('promptPlaceholder'),
                onChange: (event) => setPromptText(String(event.target.value).slice(0, MAX_PROMPT_CHARS)),
                onKeyDown: (event) => {
                  if (event.key !== 'Enter') return;
                  if (event.nativeEvent && event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (promptText.trim() && !isWorking) runFullRetranslate(promptText);
                },
              }),
              h('span', { className: 'dta-promptCount' }, `${promptText.length}/${MAX_PROMPT_CHARS}`),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--primary',
                disabled: !promptText.trim() || isWorking,
                onClick: () => runFullRetranslate(promptText),
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
          fullMode === 'both'
            ? h('div', { className: 'dta-columns dta-fullCols' },
              h('div', { className: 'dta-col' },
                h('div', { className: 'dta-colHead' }, t('sourceLabel')),
                h('div', { className: 'dta-fullSource' }, fullSource),
              ),
              h('div', { className: 'dta-col' },
                h('div', { className: 'dta-colHead' },
                  t('translationLabel'),
                  h('span', { className: 'dta-colHint' }, t('editHint')),
                ),
                translationBox,
              ),
            )
            : fullMode === 'source'
              ? h('div', { className: 'dta-fullSource', role: 'textbox', 'aria-readonly': true, 'aria-label': t('sourceLabel') }, fullSource)
              : translationBox,
          // The document suggestion reads the full-text feedback, so it sits at
          // the end of the score line that shows that feedback.
          showScores && fullScore
            ? h('div', { className: 'dta-scoreLine' },
              fullScore.comment
                ? h('span', { className: 'dta-scoreText' }, `${t('scoreLabel')} ${fullScore.value} · ${fullScore.comment}`)
                : null,
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                title: t('optimizeFullHint'),
                disabled: isWorking,
                onClick: handleOptimizeFull,
              }, optimizing
                ? format(t('optimizeProgress'), { done: status.done, total: status.total })
                : t('optimize')),
            )
            : null,
          h('p', { className: 'dta-hint' }, t('fullTextHint')),
        );
      }

      // The header entry names the open document instead of counting entries.
      const headDocTitle = doc ? entryTitle(doc, t) : '';

      return h(React.Fragment, null,
        h('style', { key: 'dta-styles' }, CSS),
        h('div', { className: 'dta-page' },
          h('header', { className: 'dta-head' },
            h('div', { className: 'dta-headTop' },
              h('h1', { className: 'dta-title' }, t('title')),
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm dta-histBtn',
                'aria-expanded': historyOpen,
                'data-active': historyOpen ? 'true' : 'false',
                'aria-label': doc
                  ? `${t('historyTitle')} · ${t('historyCurrent')}: ${headDocTitle}`
                  : t('historyTitle'),
                title: doc ? `${headDocTitle} · ${t('historySwitchHint')}` : t('historySwitchHint'),
                onClick: () => {
                  if (historyOpen) closeHistory();
                  else openHistory();
                },
              },
                h('svg', {
                  className: 'dta-histIcon',
                  viewBox: '0 0 16 16',
                  width: 13,
                  height: 13,
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.5,
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'aria-hidden': true,
                },
                  h('path', { d: 'M2.6 8a5.4 5.4 0 1 0 1.8-4' }),
                  h('path', { d: 'M2.1 2.3v2.6h2.6' }),
                  h('path', { d: 'M8 5.4V8l1.9 1.2' }),
                ),
                h('span', { className: 'dta-histLabel' }, doc ? headDocTitle : t('historyTitle')),
                h('svg', {
                  className: 'dta-histCaret',
                  viewBox: '0 0 16 16',
                  width: 11,
                  height: 11,
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.7,
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'aria-hidden': true,
                },
                  h('path', { d: 'M4.4 6.4 8 10l3.6-3.6' }),
                ),
              ),
              // Starting a new document belongs next to the history switcher:
              // both move between documents, not between segments.
              doc ? h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm dta-btn--ghost dta-newBtn',
                disabled: isWorking,
                title: t('newTranslationHint'),
                onClick: handleNewTranslation,
              },
                h('svg', {
                  viewBox: '0 0 16 16',
                  width: 12,
                  height: 12,
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.8,
                  'stroke-linecap': 'round',
                  'aria-hidden': true,
                },
                  h('path', { d: 'M8 3.4v9.2' }),
                  h('path', { d: 'M3.4 8h9.2' }),
                ),
                h('span', null, t('newTranslation')),
              ) : null,
              // Revisions describe the open document's own text, so the entry
              // sits with the document actions rather than in the toolbar.
              doc ? h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm dta-btn--ghost dta-versionsBtn',
                'aria-expanded': versionsOpen,
                'aria-label': versions.length
                  ? `${t('versions')} · ${format(t('versionsCount'), { count: versions.length })}`
                  : t('versions'),
                'data-active': versionsOpen ? 'true' : 'false',
                title: t('versionsHint'),
                onClick: () => {
                  if (versionsOpen) closeVersions();
                  else openVersions();
                },
              },
                h('svg', {
                  viewBox: '0 0 16 16',
                  width: 12,
                  height: 12,
                  fill: 'none',
                  stroke: 'currentColor',
                  'stroke-width': 1.6,
                  'stroke-linecap': 'round',
                  'stroke-linejoin': 'round',
                  'aria-hidden': true,
                },
                  h('circle', { cx: 8, cy: 8, r: 5.4 }),
                  h('path', { d: 'M8 4.9v3.4l2.2 1.3' }),
                ),
                h('span', null, versions.length ? `${t('versions')} ${versions.length}` : t('versions')),
              ) : null,
              h('span', {
                className: cx('dta-engine', canSwitchModel && 'dta-engine--picker'),
                'data-state': engineState,
                title: engineTitle,
              },
                h('span', { className: 'dta-engineDot', 'aria-hidden': true }),
                canSwitchModel
                  ? h('select', {
                    className: 'dta-modelSelect',
                    value: route ? routeId(route) : 'default',
                    'aria-label': t('modelPicker'),
                    title: t('modelPicker'),
                    onChange: (event) => handleRouteChange(event.target.value),
                  },
                    h('option', { value: 'default' },
                      `${t('modelFollowDefault')} · ${defaultModel ? defaultModel.split('/').pop() : t('modelUnknown')}`),
                    routeGroups.length > 1
                      ? routeGroups.map((group) => h('optgroup', {
                        key: group.provider,
                        label: group.label,
                      }, group.items.map((entry) => h('option', {
                        key: routeId(entry),
                        value: routeId(entry),
                        title: routeId(entry),
                      }, entry.label || entry.model))))
                      : routes.map((entry) => h('option', {
                        key: routeId(entry),
                        value: routeId(entry),
                        title: routeId(entry),
                      }, entry.label || entry.model)),
                  )
                  : h('span', null, `${t('modelLabel')}: ${routeLabel}`),
              ),
            ),
            h('p', { className: 'dta-intro' }, t('intro')),
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
        historyOpen ? renderHistoryDrawer() : null,
        versionsOpen ? renderVersionsDrawer() : null,
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
