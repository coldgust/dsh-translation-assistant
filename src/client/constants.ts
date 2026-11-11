// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
    export const NS = 'translationAssistant';
    export const PANEL_ID = 'translation-assistant';
    export const API = '/dsh-translation/api';
    export const DOC_STORAGE = 'dsh-translation-assistant:document:v1';
    export const PREFS_STORAGE = 'dsh-translation-assistant:prefs:v2';
    export const HISTORY_STORAGE = 'dsh-translation-assistant:history:v1';
    export const SESSION_STORAGE = 'dsh-translation-assistant:session:v1';
    // Per-folder translation marks for the workspace file list, keyed by the
    // absolute root so switching folders never shows stale badges.
    export const WORKSPACE_STORAGE = 'dsh-translation-assistant:workspace:v1';
    // History caps: a count limit plus a rough character budget so a long
    // document list cannot exhaust the ~5 MB localStorage quota.
    export const MAX_HISTORY_ENTRIES = 200;
    export const MAX_HISTORY_CHARS = 2_000_000;
    // Mirrors the Host request limits so an oversized document fails with a
    // localized hint before a round trip.
    export const MAX_SEGMENTS = 400;
    export const MAX_TOTAL_CHARS = 120_000;
    // Whole-document requests are capped tighter than the segment budget:
    // mirrors the Host's MAX_DOCUMENT_CHARS so an oversized text goes straight
    // to the batched path instead of being rejected.
    export const MAX_WHOLE_DOC_CHARS = 60_000;
    export const MAX_FULL_SCORE_CHARS = 60_000;
    // Custom retranslation instructions are short by design; the field caps the
    // text so an accidental paste cannot bloat the request.
    export const MAX_PROMPT_CHARS = 100;
    // Suggestions built from a score plus its feedback are machine-written, so
    // they get a larger budget than the hand-typed prompt box.
    export const MAX_SUGGESTION_CHARS = 400;
    // Revision snapshots kept per document. A snapshot copies the whole
    // document, so the caps keep both the drawer and the storage quota sane.
    export const MAX_VERSIONS = 100;
    export const MAX_VERSION_CHARS = 200_000;
    // What created a snapshot; also the key the drawer colours its tag by.
    export const VERSION_KINDS = ['initial', 'retranslate', 'optimize', 'restore', 'manual'];
    // How the source goes to the model: `whole` = one request carrying the
    // full text as-is, `array` = one request carrying the paragraphs as a
    // JSON array, `batch` = chunked concurrent requests.
    export const TRANS_MODES = ['whole', 'array', 'batch'];

    export const LANGUAGES = [
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
