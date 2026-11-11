// @ts-nocheck - migrated verbatim from the single-file client; precise types follow in a later phase.
import { zh } from '../locales.ts';
import * as React from 'react';
import CSS from '../styles.css';
import { DOCX_MIME, MAX_IMPORT_BYTES, abortedError, addVersion, applyFullTranslationEdit, buildFullTranslation, buildHtmlExport, buildWsTree, bytesToBase64, cx, decodeBase64Bytes, describeError, downloadFileName, entryTitle, extractImportText, fileExtension, format, formatStamp, highlightText, historySearchText, isTextImport, localError, makeEntry, makeVersion, mapLimit, normalizeDoc, normalizeImportedText, readDocxText, readHistory, readStorage, readWsSettings, requestJson, routeId, rowsFor, sameRoute, scoreTone, searchKeywords, snippetAround, sortEntries, splitParagraphs, splitSentences, splitTranslationPieces, storedRoutePreference, syncParagraphToSentences, syncSentenceToParagraph, translationHead, trimHistory, versionDiffCount, versionLabel, writeStorage, wsFormatSize, API, DOC_STORAGE, HISTORY_STORAGE, MAX_FULL_SCORE_CHARS, MAX_HISTORY_ENTRIES, MAX_PROMPT_CHARS, MAX_SEGMENTS, MAX_SUGGESTION_CHARS, MAX_TOTAL_CHARS, MAX_VERSIONS, MAX_WHOLE_DOC_CHARS, PREFS_STORAGE, SESSION_STORAGE, TRANS_MODES, WORKSPACE_STORAGE } from '../core/index.ts';
import { BusyDot, LanguageSelect } from '../components.tsx';
const h = React.createElement;

    export function TranslationPage(props) {
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
            wsRoot: typeof storedPrefs.wsRoot === 'string' ? storedPrefs.wsRoot : '',
            wsWorkspaceId: typeof storedPrefs.wsWorkspaceId === 'string' ? storedPrefs.wsWorkspaceId : '',
            wsSettings: readWsSettings(storedPrefs.wsSettings),
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
      // The AbortController of the pass that is currently running (translate,
      // retranslate, optimize). The stop button beside the progress aborts it;
      // null means nothing is running.
      const abortRef = React.useRef(null);
      // One controller per segment row that is rewriting right now, keyed by
      // segment id — several rows can run at the same time, each with its own
      // stop button.
      const segmentAborts = React.useRef(new Map());
      const [errors, setErrors] = React.useState({});
      const [promptFor, setPromptFor] = React.useState(null);
      const [promptText, setPromptText] = React.useState('');
      // Message-style toast: every hint, success, and error surfaces here,
      // auto-dismisses by kind (success 3s, info 5s, error 7s), and can be
      // closed early with its own × button.
      const [notice, setNotice] = React.useState(null);
      React.useEffect(() => {
        if (!notice) return undefined;
        const duration = notice.kind === 'success' ? 3000
          : notice.kind === 'error' ? 7000
            : 5000;
        const timer = setTimeout(() => setNotice(null), duration);
        return () => clearTimeout(timer);
      }, [notice]);
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
      // ---- Workspace: a folder on disk whose files can be translated and
      // ---- proofread one at a time, or in one batch pass.
      const [wsOpen, setWsOpen] = React.useState(false);
      const [wsRoot, setWsRoot] = React.useState(bootstrap.prefs.wsRoot);
      const [wsRootDraft, setWsRootDraft] = React.useState(bootstrap.prefs.wsRoot);
      // Harness workspace registry snapshot: null until the first load,
      // then { available, workspaces: [{ id, title, path }] }.
      const [wsRegistry, setWsRegistry] = React.useState(null);
      const [wsWorkspaceId, setWsWorkspaceId] = React.useState(bootstrap.prefs.wsWorkspaceId);
      const [wsManualOpen, setWsManualOpen] = React.useState(false);
      const [wsFiles, setWsFiles] = React.useState([]);
      const [wsSettings, setWsSettings] = React.useState(bootstrap.prefs.wsSettings);
      const [wsStatuses, setWsStatuses] = React.useState(() => {
        const stored = readStorage(WORKSPACE_STORAGE, null);
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
      });
      // Non-null while a batch pass over the file list is running.
      const [wsBatch, setWsBatch] = React.useState(null);
      // Collapsed folders of the workspace tree; folders missing from the map
      // start expanded, so a fresh workspace opens fully unfolded.
      const [wsCollapsed, setWsCollapsed] = React.useState({});
      // The workspace file the open document belongs to; null when the
      // document came from the landing form, a file import, or history.
      const [wsTarget, setWsTarget] = React.useState(null);
      // Name of the workspace file currently translating on its own, so the
      // drawer can say which file is in flight instead of a generic label.
      const [wsTranslatingName, setWsTranslatingName] = React.useState('');
      // Guideline documents (.translation-spec/*.md) of the open workspace;
      // null until the first load, [] means none.
      const [wsSpec, setWsSpec] = React.useState(null);
      // Spec manager state: the open editor, the create form, and the name
      // waiting for a delete confirmation.
      const [wsSpecEditor, setWsSpecEditor] = React.useState(null);
      const [wsSpecCreating, setWsSpecCreating] = React.useState(false);
      const [wsSpecDraftName, setWsSpecDraftName] = React.useState('');
      const [wsSpecConfirm, setWsSpecConfirm] = React.useState('');
      // The guideline drawer is its own layer; opening it yields the
      // workspace drawer's slot and closing hands it back.
      const [wsSpecOpen, setWsSpecOpen] = React.useState(false);
      // Spec text for the translation pass in flight; set only while a
      // workspace file is translating, because the document is not open yet.
      const specRef = React.useRef('');
      const wsBatchRef = React.useRef(null);
      const wsSaveTimer = React.useRef(null);
      // The document the last successful translation landed, so the batch
      // pass can save it without waiting for the state update.
      const landedDocRef = React.useRef(null);
      // True when the pass that just failed was stopped by the user, so the
      // batch loop can tell a stop from a request failure.
      const passAbortedRef = React.useRef(false);
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
          wsRoot,
          wsWorkspaceId,
          wsSettings,
        });
      }, [sourceLanguage, targetLanguage, view, fullMode, route, transMode, wsRoot, wsWorkspaceId, wsSettings]);

      React.useEffect(() => {
        writeStorage(WORKSPACE_STORAGE, wsStatuses);
      }, [wsStatuses]);

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

      // Auto-save writes proofread edits back to the workspace file, debounced
      // so typing a few characters does not produce a write per keystroke.
      React.useEffect(() => {
        if (!wsTarget || !wsSettings.autoSave || !doc || status) return undefined;
        // Preview mode writes nothing, so auto-save is a no-op there.
        if (wsTarget.plan && wsTarget.plan.preview) return undefined;
        if (wsSaveTimer.current) clearTimeout(wsSaveTimer.current);
        wsSaveTimer.current = setTimeout(() => {
          wsSaveTimer.current = null;
          saveWorkspaceFile(wsTarget.root, wsTarget, wsTarget.plan, null, { quiet: true, mark: 'translated' });
        }, 900);
        return () => {
          if (wsSaveTimer.current) {
            clearTimeout(wsSaveTimer.current);
            wsSaveTimer.current = null;
          }
        };
      }, [doc, status, wsTarget, wsSettings.autoSave]);

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
                // Whole-document retranslate never reaches the landing form;
                // its progress lives on the retranslate button in the
                // full-text toolbar.
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
       * Join the loaded guideline documents into one prompt string.
       * @returns {string} concatenated documents, '' when none apply.
       */
      function specText() {
        if (!wsSpec || !wsSettings.useSpec || !wsSpec.docs.length) return '';
        return wsSpec.docs
          .map((entry) => `### ${entry.name}\n\n${String(entry.text ?? '').trim()}`)
          .join('\n\n');
      }

      /**
       * Spec fragment for model requests. A translating workspace file rides
       * `specRef` (the document is not open yet); otherwise guidelines apply
       * when the open document belongs to the workspace.
       * @returns {{ spec?: string }} request fragment.
       */
      function specPayload() {
        const text = specRef.current || (wsTarget && doc ? specText() : '');
        return text ? { spec: text } : {};
      }

      /**
       * Point later requests at another model.
       * @param {string} value - option value: `default` or `provider/model`.
       */
      function handleRouteChange(value) {
        if (value === 'default') {
          setRoute(null);
          setNotice({
            kind: 'success',
            text: format(t('modelSwitchHint'), { model: defaultModel || t('modelFollowDefault') }),
          });
          return;
        }
        const entry = routes.find((item) => routeId(item) === value);
        if (!entry) return;
        setRoute({ provider: entry.provider, model: entry.model });
        setNotice({
          kind: 'success',
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
        // Remember what landed so the workspace batch pass can save it to
        // disk without waiting for the state update to propagate.
        landedDocRef.current = nextDoc;
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
       * Open one abort scope for the running pass: remember the controller so
       * the header stop button can fire it, and hand the signal to the pass.
       * @returns {AbortSignal} signal to pass into every request of the pass.
       */
      function beginAbortable() {
        const controller = new AbortController();
        abortRef.current = controller;
        return controller.signal;
      }

      /** Close the abort scope once the pass has settled. */
      function endAbortable() {
        abortRef.current = null;
      }

      /**
       * True when this failure is only the user stopping the pass, not a
       * request error that deserves a failure notice.
       * @param {unknown} error - thrown value.
       * @returns {boolean} true when the pass was stopped on purpose.
       */
      function isAborted(error) {
        return Boolean(error) && error.code === 'ABORTED';
      }

      /** Stop the pass that is currently running, keeping what already landed. */
      function handleStopTranslation() {
        const controller = abortRef.current;
        if (controller) controller.abort();
      }

      /**
       * The stop button, rendered right next to whichever progress display
       * the running pass owns. Every busy action button gets one beside it.
       * @param {() => void} [onStop] - handler; defaults to the whole pass.
       * @returns {object} button element.
       */
      function renderStopButton(onStop = handleStopTranslation) {
        return h('button', {
          type: 'button',
          className: 'dta-btn dta-btn--sm dta-btn--ghost dta-btn--danger dta-stopBtn',
          'aria-label': t('stopTranslationHint'),
          title: t('stopTranslationHint'),
          onClick: onStop,
        },
          h('svg', {
            viewBox: '0 0 16 16',
            width: 11,
            height: 11,
            fill: 'currentColor',
            stroke: 'none',
            'aria-hidden': true,
          },
            h('rect', { x: 3.5, y: 3.5, width: 9, height: 9, rx: 1.6 }),
          ),
          h('span', null, t('stopTranslation')),
        );
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
        const signal = beginAbortable();
        try {
          const data = await requestJson('translate', {
            document: text,
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
            ...routePayload(),
            ...specPayload(),
          }, { signal });
          if (signal.aborted) throw abortedError();
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
        } finally {
          endAbortable();
        }
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
        const signal = beginAbortable();
        try {
          const data = await requestJson('translate', {
            document: shape.paragraphs,
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
            ...routePayload(),
            ...specPayload(),
          }, { signal });
          if (signal.aborted) throw abortedError();
          const reply = Array.isArray(data.paragraphs) ? data.paragraphs : null;
          if (!reply || reply.length !== shape.paragraphs.length) return false;
          const pieces = reply.map((item) => String(item ?? '').trim());
          if (!pieces.every(Boolean)) return false;
          return applyDocumentPieces(text, meta, shape, pieces, data.model ? String(data.model) : null);
        } finally {
          endAbortable();
        }
      }

      /**
       * Validate one block of text and translate it into the comparison view.
       * @param {string} rawText - source text.
       * @param {{ fileName?: string }} [meta] - imported file name to remember.
       * @returns {Promise<boolean>} true when the translation landed.
       */
      async function translateText(rawText, meta = {}) {
        const text = String(rawText ?? '').trim();
        passAbortedRef.current = false;
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
            // Stopping is deliberate: the button vanishing and the progress
            // clearing is feedback enough, so no notice is raised here.
            if (isAborted(error)) {
              passAbortedRef.current = true;
              setStatus(null);
              return false;
            }
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
            if (isAborted(error)) {
              passAbortedRef.current = true;
              setStatus(null);
              return false;
            }
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
        const signal = beginAbortable();
        try {
          await mapLimit(chunks, 3, async (chunk) => {
            // A stop is already in flight: do not start any further chunks.
            if (signal.aborted) return;
            try {
              const data = await requestJson('translate', {
                [chunk.kind]: chunk.items,
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
                ...routePayload(),
                ...specPayload(),
              }, { signal });
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
              // Stopped chunks are neither failures nor progress; the pass
              // unwinds right after.
              if (isAborted(error)) return;
              failed += chunk.items.length;
              lastError = error;
            }
            if (chunk.kind === 'paragraphs') done += chunk.items.length;
            setStatus({ kind: 'translating', done, total: paragraphs.length });
          });
          if (signal.aborted) {
            passAbortedRef.current = true;
            setStatus(null);
            return false;
          }
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
          landedDocRef.current = nextDoc;
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
        } finally {
          endAbortable();
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
          setNotice({ kind: 'success', text: format(t('downloaded'), { name }) });
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
            ...specPayload(),
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
        const signal = beginAbortable();
        try {
          await mapLimit(snapshot, 3, async (item) => {
            if (signal.aborted) return;
            try {
              const data = await requestJson('retranslate', {
                source: item.source,
                ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
                extraPrompt: item.instruction,
                kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
                ...routePayload(),
                ...specPayload(),
              }, { signal });
              if (typeof data.translation === 'string' && data.translation.trim()) {
                patchSegment(collection, item.id, { translation: data.translation.trim(), score: null });
                rewritten += 1;
              } else {
                setErrors((current) => ({ ...current, [item.id]: t('retranslateFailed') }));
              }
            } catch (error) {
              if (isAborted(error)) return;
              setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
            }
            done += 1;
            setStatus({ kind: 'optimizing', done, total: snapshot.length });
          });
          if (rewritten > 0) recordVersion(before, 'optimize');
        } finally {
          endAbortable();
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
        const signal = beginAbortable();
        try {
          const data = await requestJson('retranslate', {
            source: doc.sourceText,
            ...(reference.trim() ? { translation: reference.trim() } : {}),
            ...(instruction ? { extraPrompt: instruction } : {}),
            kind: 'document',
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
            ...routePayload(),
            ...specPayload(),
          }, { signal });
          if (signal.aborted) throw abortedError();
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
          // Stopping is deliberate; no notice is raised for it.
          if (!isAborted(error)) {
            setNotice({ kind: 'error', text: describeError(error, t) });
          }
        } finally {
          endAbortable();
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
        const signal = beginAbortable();
        try {
          await mapLimit(snapshot, 3, async (item) => {
            if (signal.aborted) return;
            try {
              const data = await requestJson('retranslate', {
                source: item.source,
                ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
                ...(instruction ? { extraPrompt: instruction } : {}),
                kind: 'paragraph',
                targetLanguage,
                ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
                ...routePayload(),
                ...specPayload(),
              }, { signal });
              if (typeof data.translation === 'string' && data.translation.trim()) {
                patchSegment('paragraphs', item.id, { translation: data.translation.trim(), score: null });
                rewritten += 1;
              } else {
                failed += 1;
              }
            } catch (error) {
              if (isAborted(error)) return;
              failed += 1;
              setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
            }
            done += 1;
            setStatus({ kind: 'retranslatingFull', done, total: snapshot.length });
          });
          if (signal.aborted) {
            // Stopped on purpose: rewrites that already landed stay, and the
            // failure counts are not reported as an error.
          } else if (failed > 0) {
            // The full-text view has no per-segment rows to hang errors on, so
            // a partial or total failure is reported as one notice instead.
            setNotice({
              kind: rewritten > 0 ? 'warn' : 'error',
              text: rewritten > 0
                ? format(t('retranslatePartial'), { failed })
                : t('retranslateFailed'),
            });
          }
          if (rewritten > 0) recordVersion(before, 'retranslate');
        } finally {
          endAbortable();
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
        const controller = new AbortController();
        segmentAborts.current.set(id, controller);
        const signal = controller.signal;
        try {
          const data = await requestJson('retranslate', {
            source: item.source,
            ...(item.translation.trim() ? { translation: item.translation.trim() } : {}),
            ...(instruction ? { extraPrompt: instruction } : {}),
            kind: collection === 'paragraphs' ? 'paragraph' : 'sentence',
            targetLanguage,
            ...(sourceOption ? { sourceLanguage: sourceOption } : {}),
            ...routePayload(),
            ...specPayload(),
          }, { signal });
          if (signal.aborted) throw abortedError();
          if (typeof data.translation !== 'string' || !data.translation.trim()) {
            throw localError(t('retranslateFailed'));
          }
          patchSegment(collection, id, { translation: data.translation.trim(), score: null });
          recordVersion(before, busyKind === 'optimize' ? 'optimize' : 'retranslate');
          setPromptFor(null);
          setPromptText('');
        } catch (error) {
          // Stopping is deliberate; no notice is raised for it.
          if (!isAborted(error)) {
            setErrors((current) => ({ ...current, [id]: describeError(error, t) }));
          }
        } finally {
          segmentAborts.current.delete(id);
          setBusy((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
        }
      }

      /** Stop one segment's rewrite; the request has not landed, so nothing changes. */
      function handleStopSegment(id) {
        const controller = segmentAborts.current.get(id);
        if (controller) controller.abort();
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
            ...specPayload(),
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
                ...specPayload(),
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
        setWsTarget(null);
        resetSegmentState();
        closeHistory();
        closeVersions();
        writeStorage(DOC_STORAGE, null);
      }

      // -------------------------------------------------------------------
      // Workspace: open a folder, translate any file in it, proofread the
      // translation in the comparison view, and write the result back to
      // disk. The Host confines every operation to the folder root.
      // -------------------------------------------------------------------

      /** @param {string} relPath - workspace-relative file path. @returns {string} status mark. */
      function wsStatusOf(root, relPath) {
        const bucket = wsStatuses[root];
        return (bucket && bucket[relPath]) || '';
      }

      /**
       * Record (or clear) the translation mark for one file.
       * @param {string} root - workspace root.
       * @param {string} relPath - workspace-relative file path.
       * @param {string} value - '', 'translated', or 'done'.
       */
      function setWsStatusFor(root, relPath, value) {
        setWsStatuses((current) => {
          const bucket = { ...(current[root] || {}) };
          if (value) bucket[relPath] = value;
          else delete bucket[relPath];
          return { ...current, [root]: bucket };
        });
      }

      /**
       * Map a workspace failure onto a localized message; server codes cover
       * the common cases, everything else falls back to the generic mapping.
       * @param {unknown} error - thrown value.
       * @returns {string} localized message.
       */
      function wsDescribeError(error) {
        const keys = {
          ROOT_MISSING: 'wsRootMissing',
          ROOT_NOT_FOLDER: 'wsRootMissing',
          WORKSPACE_NOT_REGISTERED: 'wsNotRegistered',
          PATH_ESCAPES: 'wsPathEscape',
          EXTENSION: 'wsExtUnsupported',
          TOO_LARGE: 'wsTooLargeFile',
          FILE_MISSING: 'wsFileMissing',
          NOT_FILE: 'wsFileMissing',
          EXISTS: 'wsExists',
        };
        const key = error && keys[error.code];
        return key ? t(key) : describeError(error, t);
      }

      /**
       * Compute where a file's translation lands under the current settings.
       * `.docx` has no writer, so its translation always becomes `.md`.
       * Preview mode writes nothing: the plan carries a `preview` flag and an
       * empty path, and every save path checks that flag.
       * @param {object} entry - workspace file entry.
       * @returns {{ relPath: string, overwrite: boolean, preview?: boolean }} output plan.
       */
      function wsPlanOutput(entry) {
        const outExt = entry.ext === 'docx' ? 'md' : entry.ext;
        const stem = String(entry.name ?? '').replace(/\.[^.]+$/, '');
        const slash = entry.relPath.lastIndexOf('/');
        const dir = slash >= 0 ? `${entry.relPath.slice(0, slash + 1)}` : '';
        if (wsSettings.output === 'preview') {
          return { relPath: '', overwrite: false, preview: true };
        }
        if (wsSettings.output === 'overwrite' && entry.ext !== 'docx') {
          return { relPath: entry.relPath, overwrite: true };
        }
        if (wsSettings.output === 'suffix') {
          const suffix = wsSettings.suffix || 'zh';
          return { relPath: `${dir}${stem}.${suffix}.${outExt}`, overwrite: true };
        }
        return { relPath: `${dir}${t('wsSubfolderName')}/${stem}.${outExt}`, overwrite: true };
      }

      /**
       * Read one workspace file as plain text; `.docx` arrives as base64 and
       * is unpacked with the same reader the file import uses.
       * @param {object} entry - workspace file entry.
       * @returns {Promise<string>} normalized text.
       */
      async function wsReadText(entry) {
        const data = await requestJson('workspace/read', { root: wsRoot, relPath: entry.relPath });
        if (data.encoding === 'base64') {
          return normalizeImportedText(await readDocxText(decodeBase64Bytes(data.content)));
        }
        return normalizeImportedText(typeof data.content === 'string' ? data.content : '');
      }

      /**
       * List the folder and remember it as the workspace root.
       * @param {string} rootValue - absolute folder path.
       */
      async function openWorkspaceRoot(rootValue) {
        const root = String(rootValue ?? '').trim();
        if (!root || isWorking) return;
        try {
          const data = await requestJson('workspace/list', { root });
          const resolved = typeof data.root === 'string' && data.root ? data.root : root;
          setWsRoot(resolved);
          setWsRootDraft(resolved);
          setWsFiles(Array.isArray(data.entries) ? data.entries : []);
          setNotice(null);
          // Guidelines load on their own; a missing endpoint (older Host) or
          // a missing folder just means there are none.
          loadWorkspaceSpec(resolved);
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsListFailed'), { message: wsDescribeError(error) }) });
        }
      }

      /**
       * Load the workspace's guideline documents from `.translation-spec`.
       * @param {string} rootValue - workspace root.
       */
      async function loadWorkspaceSpec(rootValue) {
        try {
          const data = await requestJson('workspace/spec', { root: rootValue });
          setWsSpec({
            available: data.available === true,
            docs: Array.isArray(data.docs) ? data.docs : [],
            skipped: Array.isArray(data.skipped) ? data.skipped : [],
          });
        } catch {
          setWsSpec({ available: false, docs: [], skipped: [] });
        }
      }

      /**
       * Normalize a draft spec file name into `<base>.md`; '' when invalid.
       * @param {string} raw - user input.
       * @returns {string} safe file name or ''.
       */
      function validateSpecName(raw) {
        const base = String(raw ?? '').trim().replace(/\.md$/i, '');
        return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(base) ? `${base}.md` : '';
      }

      /** Open the guideline drawer; the workspace drawer yields its layer. */
      function openSpecDrawer() {
        setWsOpen(false);
        setWsSpecEditor(null);
        setWsSpecCreating(false);
        setWsSpecDraftName('');
        setWsSpecConfirm('');
        setWsSpecOpen(true);
      }

      /** Close the guideline drawer and hand the layer back to the workspace. */
      function closeSpecDrawer() {
        setWsSpecOpen(false);
        setWsSpecEditor(null);
        setWsSpecCreating(false);
        setWsSpecDraftName('');
        setWsSpecConfirm('');
        setWsOpen(true);
      }

      /** Reset the drawer to the create form. */
      function startSpecCreate() {
        setWsSpecEditor(null);
        setWsSpecDraftName('');
        setWsSpecConfirm('');
        setWsSpecCreating(true);
      }

      /**
       * Open the spec editor with a document's current content.
       * @param {string} name - spec file name.
       */
      async function openSpecEditor(name) {
        if (isWorking) return;
        setWsSpecCreating(false);
        setWsSpecConfirm('');
        const known = wsSpec && wsSpec.docs.find((entry) => entry.name === name);
        if (known) {
          setWsSpecEditor({ name, content: known.text });
          return;
        }
        try {
          const data = await requestJson('workspace/read', {
            root: wsRoot,
            relPath: `.translation-spec/${name}`,
          });
          setWsSpecEditor({ name, content: typeof data.content === 'string' ? data.content : '' });
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsReadFailed'), { name, message: wsDescribeError(error) }) });
        }
      }

      /** Create an empty spec document and open it in the editor. */
      async function handleSpecCreate() {
        if (!wsRoot || isWorking) return;
        const name = validateSpecName(wsSpecDraftName);
        if (!name) {
          setNotice({ kind: 'warn', text: t('wsSpecNameInvalid') });
          return;
        }
        try {
          await requestJson('workspace/write', {
            root: wsRoot,
            relPath: `.translation-spec/${name}`,
            content: '',
            overwrite: false,
          });
          setWsSpecCreating(false);
          setWsSpecDraftName('');
          await loadWorkspaceSpec(wsRoot);
          setWsSpecEditor({ name, content: '' });
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsWriteFailed'), { message: wsDescribeError(error) }) });
        }
      }

      /** Save the open spec editor back to its file and refresh the list. */
      async function handleSpecSave() {
        if (!wsRoot || !wsSpecEditor || isWorking) return;
        try {
          await requestJson('workspace/write', {
            root: wsRoot,
            relPath: `.translation-spec/${wsSpecEditor.name}`,
            content: wsSpecEditor.content,
            overwrite: true,
          });
          setNotice({ kind: 'success', text: format(t('wsSpecSaved'), { name: wsSpecEditor.name }) });
          setWsSpecEditor(null);
          await loadWorkspaceSpec(wsRoot);
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsWriteFailed'), { message: wsDescribeError(error) }) });
        }
      }

      /** Delete a spec document; the first click only asks for confirmation. */
      async function handleSpecDelete(name) {
        if (!wsRoot || isWorking) return;
        if (wsSpecConfirm !== name) {
          setWsSpecConfirm(name);
          return;
        }
        setWsSpecConfirm('');
        try {
          await requestJson('workspace/spec/delete', { root: wsRoot, name });
          if (wsSpecEditor && wsSpecEditor.name === name) setWsSpecEditor(null);
          setNotice({ kind: 'success', text: format(t('wsSpecDeleted'), { name }) });
          await loadWorkspaceSpec(wsRoot);
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsDeleteFailed'), { message: wsDescribeError(error) }) });
        }
      }

      /** Toggle the workspace view; the registry loads on first open. */
      function toggleWorkspace() {
        if (wsOpen) {
          setWsOpen(false);
          return;
        }
        setWsOpen(true);
        if (!wsRegistry) {
          loadWorkspaceRegistry();
        } else if (wsRoot && wsFiles.length === 0) {
          openWorkspaceRoot(wsRoot);
        }
      }

      /**
       * Load the Harness workspace registry and pick a workspace. The saved
       * id wins; a legacy saved root that matches a registered path maps to
       * that workspace; otherwise the first workspace opens.
       * @returns {Promise<object>} the registry snapshot.
       */
      async function loadWorkspaceRegistry() {
        let registry;
        try {
          const data = await requestJson('workspace/registry', {});
          registry = {
            available: data.available === true,
            workspaces: Array.isArray(data.workspaces) ? data.workspaces : [],
          };
        } catch (error) {
          // A 404 means the page updated but the Host side did not — the
          // endpoint only exists after a Harness restart.
          registry = {
            available: false,
            staleHost: error && error.status === 404,
            workspaces: [],
          };
        }
        setWsRegistry(registry);
        if (!registry.available || registry.workspaces.length === 0) return registry;
        const saved = registry.workspaces.find((entry) => entry.id === wsWorkspaceId)
          || registry.workspaces.find((entry) => entry.path === bootstrap.prefs.wsRoot)
          || registry.workspaces[0];
        if (wsRoot && chosenSameWorkspace(saved)) {
          // The saved root is already this workspace; just make sure its file
          // tree is loaded (it may not be on a fresh session).
          if (wsFiles.length === 0) await openWorkspaceRoot(wsRoot);
          return registry;
        }
        await selectWorkspace(saved);
        return registry;
      }

      /** True when the saved root already points at this workspace. */
      function chosenSameWorkspace(entry) {
        return wsRoot === entry.path;
      }

      /**
       * Display name of the current workspace: the registered title when the
       * registry knows this root, otherwise the folder's own name.
       * @returns {string} a short label, or '' when no root is open.
       */
      function wsDisplayName() {
        if (!wsRoot) return '';
        const match = wsRegistry && Array.isArray(wsRegistry.workspaces)
          ? wsRegistry.workspaces.find((entry) => entry.path === wsRoot)
          : null;
        if (match && match.title) return match.title;
        const trimmed = wsRoot.replace(/\/+$/, '');
        const slash = trimmed.lastIndexOf('/');
        return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
      }

      /**
       * Switch to one registered workspace and load its file tree.
       * @param {object} entry - registry entry { id, title, path }.
       */
      async function selectWorkspace(entry) {
        if (!entry || !entry.path || isWorking) return;
        setWsWorkspaceId(entry.id || '');
        setWsRoot(entry.path);
        setWsRootDraft(entry.path);
        await openWorkspaceRoot(entry.path);
      }

      /** Re-run the registry detection from the empty-state button. */
      async function refreshWorkspaceRegistry() {
        setWsRegistry(null);
        await loadWorkspaceRegistry();
      }

      /**
       * Write the translation of one workspace file back to disk.
       * @param {string} root - workspace root.
       * @param {object} entry - workspace file entry (relPath and name).
       * @param {object} plan - output plan from wsPlanOutput.
       * @param {object | null} docValue - document to save; null reads the ref.
       * @param {{ quiet?: boolean, mark?: string }} [options] - quiet skips
       *   the success notice; mark sets the list badge ('translated' for
       *   machine-saved output, 'done' after a manual save).
       * @returns {Promise<boolean>} true when the file was written.
       */
      async function saveWorkspaceFile(root, entry, plan, docValue, options = {}) {
        const source = docValue || landedDocRef.current;
        const text = source ? buildFullTranslation(source) : '';
        if (!text.trim()) {
          if (!options.quiet) setNotice({ kind: 'warn', text: t('wsNothingToSave') });
          return false;
        }
        try {
          await requestJson('workspace/write', { root, relPath: plan.relPath, content: `${text}\n`, overwrite: true });
          setWsStatusFor(root, entry.relPath, options.mark === 'translated' ? 'translated' : 'done');
          if (!options.quiet) {
            setNotice({ kind: 'success', text: format(t('wsSaved'), { path: plan.relPath }) });
          }
          return true;
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsWriteFailed'), { message: wsDescribeError(error) }) });
          return false;
        }
      }

      /**
       * Translate one workspace file. On success the document is open in the
       * comparison view (single mode auto-opens it) and the file is marked
       * for proofreading; batch mode also saves the raw translation to disk.
       * @param {object} entry - workspace file entry.
       * @param {{ autoOpen?: boolean, saveNow?: boolean, quiet?: boolean }} [options] - flow flags.
       * @returns {Promise<{ ok: boolean, aborted: boolean }>} outcome.
       */
      async function translateWorkspaceFile(entry, options = {}) {
        if (isWorking) return { ok: false, aborted: false };
        let text;
        try {
          text = await wsReadText(entry);
        } catch (error) {
          if (isAborted(error)) passAbortedRef.current = true;
          if (!options.quiet) {
            setNotice({ kind: 'error', text: format(t('wsReadFailed'), { name: entry.name, message: wsDescribeError(error) }) });
          }
          return { ok: false, aborted: isAborted(error) };
        }
        if (!text) {
          if (!options.quiet) setNotice({ kind: 'warn', text: t('noSource') });
          return { ok: false, aborted: false };
        }
        landedDocRef.current = null;
        setWsTranslatingName(entry.name);
        specRef.current = specText();
        let landed;
        try {
          landed = await translateText(text, { fileName: entry.name });
        } finally {
          setWsTranslatingName('');
          specRef.current = '';
        }
        if (!landed) return { ok: false, aborted: passAbortedRef.current };
        const root = wsRoot;
        const plan = wsPlanOutput(entry);
        setWsStatusFor(root, entry.relPath, 'translated');
        // Preview mode keeps the translation on the page only; the plan
        // carries no path and nothing is written to disk.
        if (options.saveNow && !plan.preview) {
          const saved = await saveWorkspaceFile(root, entry, plan, landedDocRef.current, {
            quiet: Boolean(options.quiet),
            mark: 'translated',
          });
          if (!saved) return { ok: false, aborted: false };
        }
        if (options.autoOpen) {
          setWsTarget({ root, relPath: entry.relPath, name: entry.name, plan });
          setWsOpen(false);
        }
        return { ok: true, aborted: false };
      }

      /**
       * Open a translated workspace file for proofreading without running
       * the model again: the source comes from the file, the translation
       * from its saved output. An overwrite-mode file was replaced on disk,
       * so the last history entry for that name is reopened instead.
       * @param {object} entry - workspace file entry.
       */
      async function openWorkspaceProofread(entry) {
        if (isWorking) return;
        const plan = wsPlanOutput(entry);
        // Preview and overwrite both leave no separate output file to read
        // back, so the last on-page translation for this name reopens.
        if (plan.preview || (wsSettings.output === 'overwrite' && plan.overwrite)) {
          const match = [...history].reverse().find((item) => item.doc && item.doc.fileName === entry.name);
          if (match) {
            handleOpenEntry(match);
            setWsTarget({ root: wsRoot, relPath: entry.relPath, name: entry.name, plan });
            setWsOpen(false);
            return;
          }
          setNotice({ kind: 'warn', text: t('wsNoTranslation') });
          return;
        }
        try {
          const source = await wsReadText(entry);
          if (!source) {
            setNotice({ kind: 'warn', text: t('noSource') });
            return;
          }
          let translation = '';
          try {
            const data = await requestJson('workspace/read', { root: wsRoot, relPath: plan.relPath });
            translation = typeof data.content === 'string' ? data.content : '';
          } catch (error) {
            if (Number(error && error.status) !== 404) throw error;
          }
          if (!translation.trim()) {
            setNotice({ kind: 'warn', text: t('wsNoTranslation') });
            return;
          }
          const shape = { sentences: splitSentences(source), paragraphs: splitParagraphs(source) };
          const parts = translation.trim().split(/\n{2,}/).map((part) => part.trim());
          while (parts.length < shape.paragraphs.length) parts.push('');
          applyDocumentPieces(
            source,
            { fileName: entry.name },
            shape,
            parts.slice(0, shape.paragraphs.length),
            null,
          );
          setWsTarget({ root: wsRoot, relPath: entry.relPath, name: entry.name, plan });
          setWsOpen(false);
        } catch (error) {
          setNotice({ kind: 'error', text: format(t('wsReadFailed'), { name: entry.name, message: wsDescribeError(error) }) });
        }
      }

      /** Stop the batch: abort the in-flight file and skip the rest. */
      function handleWsStopBatch() {
        const batch = wsBatchRef.current;
        if (batch) batch.stopped = true;
        handleStopTranslation();
      }

      /** Translate every untranslated file in the list, one after another. */
      async function handleWsTranslateAll() {
        if (isWorking || wsBatch) return;
        const root = wsRoot;
        const pending = wsFiles.filter((entry) => !wsStatusOf(root, entry.relPath));
        if (pending.length === 0) {
          setNotice({ kind: 'success', text: t('wsAllTranslated') });
          return;
        }
        const batch = { stopped: false };
        wsBatchRef.current = batch;
        setWsBatch({ done: 0, total: pending.length });
        let failed = 0;
        for (const entry of pending) {
          if (batch.stopped) break;
          const result = await translateWorkspaceFile(entry, { saveNow: true, quiet: true });
          if (result.aborted || batch.stopped) break;
          if (!result.ok) failed += 1;
          setWsBatch((current) => (current ? { ...current, done: current.done + 1 } : current));
        }
        wsBatchRef.current = null;
        setWsBatch(null);
        if (failed > 0) {
          setNotice({ kind: 'warn', text: format(t('wsBatchPartial'), { failed }) });
        }
      }

      /** Save the open workspace document back to its output file. */
      async function handleWsSave() {
        if (!wsTarget || !doc || isWorking) return;
        if (wsTarget.plan && wsTarget.plan.preview) return;
        await saveWorkspaceFile(wsTarget.root, wsTarget, wsTarget.plan, doc);
      }

      /**
       * Progress text for the file currently translating inside the workspace.
       * The file name leads the label, so it cannot read like a count of the
       * pending files next to it.
       */
      function wsTranslatingText() {
        if (!status || status.kind !== 'translating') return '';
        const progress = status.total
          ? format(t('translateProgress'), { done: status.done ?? 0, total: status.total })
          : t('translateWholeBusy');
        return wsTranslatingName ? `${wsTranslatingName} · ${progress}` : progress;
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
        setWsTarget(null);
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
        setNotice({ kind: 'success', text: t('versionSaved') });
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
          kind: 'success',
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
      /**
       * Strip above the comparison view while a workspace file is open: it
       * names the source file and where its translation saves, with the
       * manual save button and the way back to the list.
       * @returns {object | null} banner element.
       */
      /** Fold or unfold one folder of the workspace tree. */
      function toggleWsDir(path) {
        setWsCollapsed((current) => ({ ...current, [path]: !current[path] }));
      }

      /**
       * Folder icon used by the tree and the workspace header.
       * @param {{ size?: number, className?: string }} [options] - styling.
       * @returns {object} svg element.
       */
      function renderFolderIcon(options = {}) {
        const size = options.size || 14;
        return h('svg', {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'currentColor',
          stroke: 'none',
          'aria-hidden': true,
          className: options.className,
        },
          h('path', { d: 'M1.75 3.5A1.5 1.5 0 0 1 3.25 2h3l1.5 2h5A1.5 1.5 0 0 1 14.25 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5v-9Z' }),
        );
      }

      /**
       * Render the workspace file tree, one flat row list with indentation.
       * @param {Array<object>} nodes - tree nodes from buildWsTree.
       * @param {number} depth - nesting depth, drives the left padding.
       * @returns {Array<object>} row elements.
       */
      function renderWsNodes(nodes, depth) {
        return nodes.flatMap((node) => {
          if (node.kind === 'dir') {
            const collapsed = Boolean(wsCollapsed[node.path]);
            return [
              h('li', { className: 'dta-wsDir', key: `dir:${node.path}`, style: { '--dta-depth': depth } },
                h('button', {
                  type: 'button',
                  className: 'dta-wsDirToggle',
                  'aria-expanded': !collapsed,
                  title: node.path,
                  onClick: () => toggleWsDir(node.path),
                },
                  h('svg', {
                    viewBox: '0 0 16 16',
                    width: 12,
                    height: 12,
                    fill: 'currentColor',
                    stroke: 'none',
                    'aria-hidden': true,
                    className: 'dta-wsChevron',
                    'data-collapsed': collapsed ? 'true' : 'false',
                  },
                    h('path', { d: 'M6 3.5 11 8l-5 4.5v-9Z' }),
                  ),
                  renderFolderIcon({ size: 13, className: 'dta-wsDirIcon' }),
                  h('span', { className: 'dta-wsDirName' }, node.name),
                  h('span', { className: 'dta-wsDirCount' }, String(node.count)),
                ),
              ),
              ...(!collapsed ? renderWsNodes(node.children, depth + 1) : []),
            ];
          }
          const entry = node.entry;
          const state = wsStatusOf(wsRoot, entry.relPath);
          // One click on the file name is the whole flow: untranslated files
          // start translating, translated ones reopen for proofreading.
          const openFile = () => (state
            ? openWorkspaceProofread(entry)
            : translateWorkspaceFile(entry, { autoOpen: true }));
          return [h('li', {
            className: 'dta-wsRow',
            key: entry.relPath,
            style: { '--dta-depth': depth },
          },
            renderFolderIcon({ size: 12, className: 'dta-wsFileIcon' }),
            h('button', {
              type: 'button',
              className: 'dta-wsName',
              title: entry.relPath,
              onClick: openFile,
            }, node.name),
            h('span', { className: 'dta-wsSize' }, wsFormatSize(entry.size)),
            h('div', { className: 'dta-wsRowActions' },
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                disabled: isWorking,
                onClick: () => translateWorkspaceFile(entry, { autoOpen: true }),
              }, state ? t('wsRetranslate') : t('wsTranslate')),
            ),
          )];
        });
      }

      function renderWorkspaceBanner() {
        if (!wsTarget || !doc) return null;
        const preview = Boolean(wsTarget.plan && wsTarget.plan.preview);
        const specNames = wsSettings.useSpec && wsSpec && wsSpec.docs.length
          ? wsSpec.docs.map((entry) => entry.name)
          : [];
        return h('div', { className: 'dta-wsBanner' },
          h('span', { className: 'dta-wsBannerTag' }, t('workspace')),
          h('span', { className: 'dta-wsBannerName', title: wsTarget.relPath }, wsTarget.name),
          h('span', { className: 'dta-wsBannerArrow', 'aria-hidden': true }, '→'),
          preview
            ? h('span', { className: 'dta-wsBannerPath' }, t('wsBannerPreview'))
            : h('span', { className: 'dta-wsBannerPath', title: wsTarget.plan.relPath },
              `${t('wsBannerTarget')} ${wsTarget.plan.relPath}`),
          specNames.length
            ? h('span', {
              className: 'dta-wsBannerSpec',
              title: specNames.join(' · '),
            },
              h('span', { className: 'dta-wsBannerSpecDivider', 'aria-hidden': true }),
              h('span', { className: 'dta-wsBannerSpecLabel' }, t('wsBannerSpec')),
              specNames.map((name) => h('span', {
                key: name,
                className: 'dta-wsBannerSpecChip',
              }, name)),
            )
            : null,
          h('div', { className: 'dta-wsBannerActions' },
            preview
              ? null
              : h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm dta-btn--primary',
                disabled: isWorking,
                onClick: handleWsSave,
              }, t('wsSaveToFile')),
            h('button', {
              type: 'button',
              className: 'dta-btn dta-btn--sm',
              disabled: isWorking,
              onClick: () => setWsOpen(true),
            }, t('wsBackToList')),
          ),
        );
      }

      /** Render the workspace as a collapsible side drawer. */
      function renderWorkspaceDrawer() {
        const singleTranslating = Boolean(status && status.kind === 'translating' && !wsBatch);
        const pendingCount = wsFiles.filter((entry) => !wsStatusOf(wsRoot, entry.relPath)).length;
        return h('div', { className: 'dta-drawerLayer' },
          h('div', {
            className: 'dta-drawerMask',
            'aria-hidden': true,
            onClick: () => setWsOpen(false),
          }),
          h('aside', {
            className: 'dta-drawer dta-drawer--workspace',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('workspace'),
          },
            h('div', { className: 'dta-drawerHead' },
              renderFolderIcon({ size: 15, className: 'dta-wsHeadIcon' }),
              h('h2', { className: 'dta-drawerTitle' }, t('workspace')),
              wsFiles.length
                ? h('span', { className: 'dta-wsCount' }, format(t('wsCount'), { count: wsFiles.length }))
                : null,
              wsRoot
                ? h('button', {
                  type: 'button',
                  className: 'dta-btn dta-btn--sm',
                  disabled: isWorking,
                  onClick: () => openWorkspaceRoot(wsRoot),
                }, t('wsRefresh'))
                : null,
              h('button', {
                type: 'button',
                className: 'dta-drawerClose',
                title: t('closePanel'),
                'aria-label': t('closePanel'),
                onClick: () => setWsOpen(false),
              }, '×'),
            ),
            h('div', { className: 'dta-drawerBody dta-ws' },
              wsRegistry && wsRegistry.available && wsRegistry.workspaces.length
                ? h('div', { className: 'dta-wsRegistry' },
                  h('label', { className: 'dta-wsField' },
                    h('span', null, t('wsSelectLabel')),
                    h('select', {
                      className: 'dta-wsSelect',
                      value: wsRegistry.workspaces.some((entry) => entry.id === wsWorkspaceId)
                        ? wsWorkspaceId
                        : wsRegistry.workspaces[0].id,
                      disabled: isWorking,
                      onChange: (event) => {
                        const chosen = wsRegistry.workspaces.find((entry) => entry.id === event.target.value);
                        if (chosen) selectWorkspace(chosen);
                      },
                    },
                      wsRegistry.workspaces.map((entry) => h('option', { key: entry.id, value: entry.id },
                        entry.title || entry.path)),
                    ),
                  ),
                  wsRoot
                    ? h('p', { className: 'dta-wsRootPath', title: wsRoot }, wsRoot)
                    : null,
                )
                : null,
              wsRegistry && wsRegistry.available && wsRegistry.workspaces.length === 0
                ? h('div', { className: 'dta-wsRegistryEmpty' },
                  h('p', { className: 'dta-wsEmpty' }, t('wsEmptyRegistry')),
                  h('button', {
                    type: 'button',
                    className: 'dta-btn dta-btn--sm',
                    disabled: isWorking,
                    onClick: refreshWorkspaceRegistry,
                  }, t('wsReloadRegistry')),
                )
                : null,
              wsRegistry && !wsRegistry.available
                ? h('div', { className: 'dta-wsFallback' },
                  h('p', { className: 'dta-wsHint' },
                    wsRegistry.staleHost ? t('wsHostStale') : t('wsUnavailable')),
                  wsManualOpen
                    ? h('div', { className: 'dta-wsOpenRow' },
                      h('input', {
                        className: 'dta-wsPath',
                        type: 'text',
                        value: wsRootDraft,
                        placeholder: t('wsRootPlaceholder'),
                        spellCheck: false,
                        'aria-label': t('workspaceHint'),
                        disabled: isWorking,
                        onChange: (event) => setWsRootDraft(event.target.value),
                        onKeyDown: (event) => {
                          if (event.key === 'Enter') openWorkspaceRoot(wsRootDraft);
                        },
                      }),
                      h('button', {
                        type: 'button',
                        className: 'dta-btn',
                        disabled: isWorking,
                        onClick: () => openWorkspaceRoot(wsRootDraft),
                      }, t('wsOpen')),
                    )
                    : h('button', {
                      type: 'button',
                      className: 'dta-btn dta-btn--sm',
                      disabled: isWorking,
                      onClick: () => setWsManualOpen(true),
                    }, t('wsManualToggle')),
                )
                : null,
          wsRoot
            ? h('div', { className: 'dta-wsSettings' },
              h('label', { className: 'dta-wsField' },
                h('span', null, t('wsOutputLabel')),
                h('select', {
                  className: 'dta-wsSelect',
                  value: wsSettings.output,
                  disabled: isWorking,
                  onChange: (event) => setWsSettings((current) => ({ ...current, output: event.target.value })),
                },
                  h('option', { value: 'subfolder' }, t('wsOutputSubfolder')),
                  h('option', { value: 'suffix' }, t('wsOutputSuffix')),
                  h('option', { value: 'overwrite' }, t('wsOutputOverwrite')),
                  h('option', { value: 'preview' }, t('wsOutputPreview')),
                ),
              ),
              wsSettings.output === 'suffix'
                ? h('label', { className: 'dta-wsField' },
                  h('span', null, t('wsSuffixLabel')),
                  h('input', {
                    className: 'dta-wsSuffix',
                    type: 'text',
                    value: wsSettings.suffix,
                    maxLength: 24,
                    spellCheck: false,
                    disabled: isWorking,
                    onChange: (event) => setWsSettings((current) => ({ ...current, suffix: event.target.value })),
                  }),
                )
                : null,
              h('label', { className: 'dta-wsField dta-wsCheck' },
                h('input', {
                  type: 'checkbox',
                  checked: wsSettings.autoSave,
                  // Preview mode writes nothing, so auto-save cannot apply.
                  disabled: isWorking || wsSettings.output === 'preview',
                  onChange: (event) => setWsSettings((current) => ({ ...current, autoSave: event.target.checked })),
                }),
                h('span', null, t('wsAutoSave')),
              ),
              h('label', { className: 'dta-wsField dta-wsCheck' },
                h('input', {
                  type: 'checkbox',
                  checked: wsSettings.useSpec,
                  // Nothing to attach when the workspace has no guidelines.
                  disabled: isWorking || Boolean(wsSpec && !wsSpec.docs.length),
                  onChange: (event) => setWsSettings((current) => ({ ...current, useSpec: event.target.checked })),
                }),
                h('span', null, t('wsSpecToggle')),
              ),
            )
            : null,
          wsRoot
            ? h('div', { className: 'dta-wsSpecBar' },
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm dta-btn--primary',
                disabled: isWorking,
                onClick: openSpecDrawer,
              }, wsSpec && wsSpec.docs.length
                ? format(t('wsSpecCount'), { count: wsSpec.docs.length })
                : t('wsSpecTitle')),
            )
            : null,
          wsRoot && wsFiles.length
            ? h('div', { className: 'dta-wsBatch' },
              h('button', {
                type: 'button',
                className: 'dta-btn',
                title: t('wsTranslateAllHint'),
                disabled: isWorking || Boolean(wsBatch) || pendingCount === 0,
                onClick: handleWsTranslateAll,
              }, t('wsTranslateAll')),
              wsBatch
                ? h('span', { className: 'dta-wsBatchInfo' },
                  format(t('wsBatchProgress'), { done: wsBatch.done, total: wsBatch.total }))
                : h('span', { className: 'dta-wsBatchInfo' },
                  pendingCount ? format(t('wsPendingCount'), { count: pendingCount }) : t('wsAllTranslated')),
              singleTranslating
                ? h('span', { className: 'dta-wsBatchInfo' }, wsTranslatingText())
                : null,
              wsBatch || singleTranslating
                ? renderStopButton(wsBatch ? handleWsStopBatch : handleStopTranslation)
                : null,
            )
            : null,
          wsRoot && wsFiles.length === 0
            ? h('p', { className: 'dta-wsEmpty' }, t('wsEmpty'))
            : null,
          wsFiles.length
            ? h('ul', { className: 'dta-wsList', 'aria-label': t('wsTreeLabel') },
              renderWsNodes(buildWsTree(wsFiles), 0),
            )
            : null,
          ),
          ),
        );
      }

      /**
       * Render the guideline drawer: the document list, or the editor pane
       * while a document is open. Shares the visual language of the other
       * drawers so it reads as one more panel of the same family.
       */
      function renderSpecDrawer() {
        const docs = wsSpec && Array.isArray(wsSpec.docs) ? wsSpec.docs : [];
        const skipped = wsSpec && Array.isArray(wsSpec.skipped) ? wsSpec.skipped : [];
        return h('div', { className: 'dta-drawerLayer' },
          h('div', {
            className: 'dta-drawerMask',
            'aria-hidden': true,
            onClick: closeSpecDrawer,
          }),
          h('aside', {
            className: 'dta-drawer dta-drawer--spec',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': t('wsSpecTitle'),
          },
            h('div', { className: 'dta-drawerHead' },
              renderFolderIcon({ size: 15, className: 'dta-wsHeadIcon' }),
              h('h2', { className: 'dta-drawerTitle' }, t('wsSpecTitle')),
              docs.length
                ? h('span', { className: 'dta-wsCount' }, format(t('wsSpecCount'), { count: docs.length }))
                : null,
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm',
                disabled: isWorking,
                onClick: startSpecCreate,
              }, t('wsSpecAdd')),
              h('button', {
                type: 'button',
                className: 'dta-drawerClose',
                title: t('closePanel'),
                'aria-label': t('closePanel'),
                onClick: closeSpecDrawer,
              }, '×'),
            ),
            h('div', { className: 'dta-drawerBody dta-wsSpec' },
              h('p', { className: 'dta-wsRootPath', title: '.translation-spec/' }, '.translation-spec/'),
              wsSpecCreating
                ? h('div', { className: 'dta-wsSpecCreate' },
                  h('input', {
                    className: 'dta-wsSpecInput',
                    type: 'text',
                    placeholder: t('wsSpecNamePlaceholder'),
                    value: wsSpecDraftName,
                    maxLength: 64,
                    spellCheck: false,
                    disabled: isWorking,
                    onChange: (event) => setWsSpecDraftName(event.target.value),
                  }),
                  h('button', {
                    type: 'button',
                    className: 'dta-btn dta-btn--sm dta-btn--primary',
                    disabled: isWorking,
                    onClick: handleSpecCreate,
                  }, t('wsSpecCreate')),
                  h('button', {
                    type: 'button',
                    className: 'dta-btn dta-btn--sm',
                    disabled: isWorking,
                    onClick: () => setWsSpecCreating(false),
                  }, t('promptCancel')),
                )
                : null,
              wsSpecEditor
                ? h('div', { className: 'dta-wsSpecEditor' },
                  h('div', { className: 'dta-wsSpecEditorHead' },
                    h('button', {
                      type: 'button',
                      className: 'dta-btn dta-btn--sm',
                      disabled: isWorking,
                      onClick: () => setWsSpecEditor(null),
                    }, t('wsSpecBack')),
                    h('span', { className: 'dta-wsSpecEditorName', title: wsSpecEditor.name }, wsSpecEditor.name),
                    h('div', { className: 'dta-wsSpecHeadActions' },
                      h('button', {
                        type: 'button',
                        className: 'dta-btn dta-btn--sm dta-btn--primary',
                        disabled: isWorking,
                        onClick: handleSpecSave,
                      }, t('wsSpecSave')),
                      h('button', {
                        type: 'button',
                        className: 'dta-btn dta-btn--sm',
                        disabled: isWorking,
                        onClick: () => handleSpecDelete(wsSpecEditor.name),
                      }, wsSpecConfirm === wsSpecEditor.name
                        ? t('wsSpecConfirmDelete')
                        : t('wsSpecDelete')),
                    ),
                  ),
                  h('textarea', {
                    className: 'dta-wsSpecText',
                    value: wsSpecEditor.content,
                    rows: 14,
                    spellCheck: false,
                    disabled: isWorking,
                    onChange: (event) => setWsSpecEditor(
                      (current) => (current ? { ...current, content: event.target.value } : current),
                    ),
                  }),
                )
                : h('div', { className: 'dta-wsSpecList' },
                  docs.length
                    ? docs.map((entry) => h('button', {
                      key: entry.name,
                      type: 'button',
                      className: 'dta-wsSpecCard',
                      disabled: isWorking,
                      title: entry.name,
                      onClick: () => openSpecEditor(entry.name),
                    },
                      h('span', { className: 'dta-wsSpecCardName' }, entry.name),
                      h('span', { className: 'dta-wsSpecCardSize' }, wsFormatSize(entry.bytes)),
                      h('span', { className: 'dta-wsSpecCardChevron', 'aria-hidden': true }, '›'),
                    ))
                    : h('p', { className: 'dta-wsEmpty' }, t('wsSpecEmpty')),
                  skipped.length
                    ? h('div', { className: 'dta-wsSpecSkipped' },
                      skipped.map((entry) => h('p', {
                        key: entry.name,
                        className: 'dta-wsSpecSkip',
                      }, format(t('wsSpecSkipped'), { name: entry.name }))),
                    )
                    : null,
                ),
            ),
          ),
        );
      }

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
            // The stop lives with the progress it belongs to: right beside the
            // button that shows it. OCR and file reads are quick and unstoppable.
            status && status.kind === 'translating' ? renderStopButton() : null,
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
          ? h(React.Fragment, null,
            h('button', {
              type: 'button',
              className: 'dta-btn dta-btn--sm',
              title: t('optimizeHint'),
              disabled: busyKind === 'retranslate' || busyKind === 'optimize',
              onClick: () => handleOptimize(collection, item),
            }, busyKind === 'optimize' ? t('optimizing') : t('optimize')),
            busyKind === 'optimize' ? renderStopButton(() => handleStopSegment(item.id)) : null,
          )
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
              busyKind === 'retranslate' ? renderStopButton(() => handleStopSegment(item.id)) : null,
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
                    ? h(React.Fragment, null,
                      h('button', {
                        type: 'button',
                        className: 'dta-btn',
                        title: t('optimizeAllHint'),
                        disabled: isWorking,
                        onClick: handleOptimizeAll,
                      }, optimizingStatus
                        ? format(t('optimizeProgress'), { done: status.done, total: status.total })
                        : t('optimizeAll')),
                      optimizingStatus ? renderStopButton() : null,
                    )
                    : null,
                ),
            ),
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
            h(React.Fragment, null,
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
              fullRetranslating ? renderStopButton() : null,
            ),
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
              h(React.Fragment, null,
                h('button', {
                  type: 'button',
                  className: 'dta-btn dta-btn--sm',
                  title: t('optimizeFullHint'),
                  disabled: isWorking,
                  onClick: handleOptimizeFull,
                }, optimizing
                  ? format(t('optimizeProgress'), { done: status.done, total: status.total })
                  : t('optimize')),
                optimizing ? renderStopButton() : null,
              ),
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
              // The workspace toggle lives with the document-level actions:
              // it replaces the page body, not the current document.
              h('button', {
                type: 'button',
                className: 'dta-btn dta-btn--sm dta-btn--ghost dta-wsBtn',
                'data-active': wsOpen ? 'true' : 'false',
                'aria-pressed': wsOpen,
                title: t('workspaceHint'),
                onClick: toggleWorkspace,
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
                  h('path', { d: 'M1.9 4.4a1.2 1.2 0 0 1 1.2-1.2h2.8l1.5 1.6h5.5a1.2 1.2 0 0 1 1.2 1.2v6a1.2 1.2 0 0 1-1.2 1.2H3.1a1.2 1.2 0 0 1-1.2-1.2z' }),
                ),
                // While a workspace file is open, the button names the
                // workspace instead of the generic label.
                h('span', null, (wsTarget && doc && wsDisplayName()) || t('workspace')),
              ),
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
          h(React.Fragment, null,
            wsTarget && doc ? renderWorkspaceBanner() : null,
            doc ? renderDocument() : renderLanding(),
          ),
          h('footer', { className: 'dta-footer' },
            h('span', null, t('saveHint')),
            h('span', null, t('footerHint')),
          ),
        ),
        historyOpen ? renderHistoryDrawer() : null,
        versionsOpen ? renderVersionsDrawer() : null,
        wsOpen ? renderWorkspaceDrawer() : null,
        wsSpecOpen ? renderSpecDrawer() : null,
        notice
          ? h('div', { className: `dta-toast dta-toast--${notice.kind}`, role: 'status' },
            h('span', { className: 'dta-toastText' }, notice.text),
            h('button', {
              type: 'button',
              className: 'dta-toastClose',
              'aria-label': t('toastClose'),
              onClick: () => setNotice(null),
            }, '×'),
          )
          : null,
      );
    }