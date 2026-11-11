window.__ModuleLoader__.load({ id: "dsh-translation-assistant", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);

// src/client/constants.ts
var NS = "translationAssistant";
var PANEL_ID = "translation-assistant";
var API = "/dsh-translation/api";
var DOC_STORAGE = "dsh-translation-assistant:document:v1";
var PREFS_STORAGE = "dsh-translation-assistant:prefs:v2";
var HISTORY_STORAGE = "dsh-translation-assistant:history:v1";
var SESSION_STORAGE = "dsh-translation-assistant:session:v1";
var WORKSPACE_STORAGE = "dsh-translation-assistant:workspace:v1";
var MAX_HISTORY_ENTRIES = 200;
var MAX_HISTORY_CHARS = 2e6;
var MAX_SEGMENTS = 400;
var MAX_TOTAL_CHARS = 12e4;
var MAX_WHOLE_DOC_CHARS = 6e4;
var MAX_FULL_SCORE_CHARS = 6e4;
var MAX_PROMPT_CHARS = 100;
var MAX_SUGGESTION_CHARS = 400;
var MAX_VERSIONS = 100;
var MAX_VERSION_CHARS = 2e5;
var VERSION_KINDS = ["initial", "retranslate", "optimize", "restore", "manual"];
var TRANS_MODES = ["whole", "array", "batch"];
var LANGUAGES = [
  "\u4E2D\u6587",
  "\u7E41\u9AD4\u4E2D\u6587",
  "English",
  "\u65E5\u672C\u8A9E",
  "\uD55C\uAD6D\uC5B4",
  "Fran\xE7ais",
  "Deutsch",
  "Espa\xF1ol",
  "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"
];

// src/client/locales.ts
var zh = {
  panel: "\u7FFB\u8BD1\u52A9\u624B",
  title: "\u7FFB\u8BD1\u52A9\u624B",
  intro: "AI \u8D77\u7A3F\uFF0C\u4F60\u6765\u5BA1\u6821\uFF1A\u7C98\u8D34\u539F\u6587\u6216\u5BFC\u5165\u6587\u4EF6\uFF0C\u9010\u6BB5\u6216\u9010\u53E5\u5BF9\u7167\u7FFB\u8BD1\uFF1B\u8BD1\u6587\u53EF\u76F4\u63A5\u6539\uFF0C\u4E5F\u80FD\u6253\u5206\u7559\u8A00\u8BA9 AI \u91CD\u5199\uFF0C\u8FD8\u80FD\u6362\u4E00\u4E2A\u6A21\u578B\u8BC4\u5BA1\u3002\u7FFB\u8BD1\u81EA\u52A8\u5B58\u8FDB\u672C\u673A\u5386\u53F2\uFF0CAI \u6539\u52A8\u524D\u7559\u4FEE\u6539\u8BB0\u5F55\uFF0C\u968F\u65F6\u56DE\u9000\uFF1B\u56FE\u7247\u53D6\u5B57\u3001\u5168\u6587\u590D\u5236\u3001\u4E0B\u8F7D\u548C\u8BC4\u5206\u90FD\u9F50\u4E86\u3002",
  sourceLanguage: "\u539F\u6587\u8BED\u8A00",
  targetLanguage: "\u76EE\u6807\u8BED\u8A00",
  autoDetect: "\u81EA\u52A8\u68C0\u6D4B",
  sourcePlaceholder: "\u7C98\u8D34\u539F\u6587\uFF0C\u7A7A\u884C\u5206\u6BB5\uFF1B\u4E5F\u53EF\u62D6\u5165\u6587\u4EF6\u3001\u7C98\u8D34\u622A\u56FE\u6216\u9009\u62E9\u56FE\u7247\u8BC6\u522B\u7FFB\u8BD1\u3002",
  targetPlaceholder: "AI \u8BD1\u6587\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\uFF0C\u53EF\u76F4\u63A5\u4FEE\u6539",
  translate: "\u5F00\u59CB\u7FFB\u8BD1",
  translating: "\u6B63\u5728\u7FFB\u8BD1\u2026",
  translateWholeBusy: "\u6574\u7BC7\u7FFB\u8BD1\u4E2D\u2026",
  translateProgress: "\u7FFB\u8BD1\u4E2D {done}/{total}",
  translatePartial: "{failed} \u6BB5\u7FFB\u8BD1\u5931\u8D25\uFF0C\u5176\u4F59\u6BB5\u843D\u5DF2\u5B8C\u6210\u3002",
  footerHint: "\u8BC4\u5206\u7531 AI \u5224\u65AD\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF1B\u70B9\u201CAI \u8BC4\u5206\u201D\u6216\u201C\u5168\u6587\u8BC4\u5206\u201D\u83B7\u53D6\u3002",
  newTranslation: "\u65B0\u5EFA\u7FFB\u8BD1",
  newTranslationHint: "\u5F00\u59CB\u4E00\u7BC7\u65B0\u7FFB\u8BD1\uFF0C\u5F53\u524D\u6587\u6863\u4F1A\u7559\u5728\u5386\u53F2\u91CC",
  stopTranslation: "\u505C\u6B62",
  stopTranslationHint: "\u505C\u6B62\u6B63\u5728\u8FDB\u884C\u7684\u7FFB\u8BD1\u6216\u91CD\u8BD1",
  historyTitle: "\u7FFB\u8BD1\u5386\u53F2",
  historyCount: "\u5171 {count} \u6761",
  historySwitchHint: "\u6253\u5F00\u7FFB\u8BD1\u5386\u53F2\uFF0C\u5207\u6362\u5230\u5176\u5B83\u6587\u6863",
  historyCurrent: "\u5F53\u524D\u6587\u6863",
  historyEmpty: "\u8FD8\u6CA1\u6709\u5386\u53F2\u8BB0\u5F55\u3002\u7FFB\u8BD1\u4E00\u6B21\u5C31\u4F1A\u5B58\u5230\u672C\u673A\uFF0C\u4E4B\u540E\u53EF\u968F\u65F6\u5207\u56DE\u7EE7\u7EED\u4FEE\u6539\u3002",
  historyHint: "\u5386\u53F2\u4FDD\u5B58\u5728\u672C\u673A\u6D4F\u89C8\u5668\uFF0C\u6700\u591A\u4FDD\u7559 {max} \u6761\uFF1B\u7F6E\u9876\u4F18\u5148\uFF0C\u5176\u4F59\u6309\u6700\u8FD1\u4F7F\u7528\u6392\u5E8F\uFF1B\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D\u3002",
  historySearch: "\u641C\u7D22\u5386\u53F2",
  historySearchPlaceholder: "\u641C\u7D22\u539F\u6587\u6216\u8BD1\u6587\u2026",
  historyNoMatch: "\u6CA1\u6709\u5339\u914D\u7684\u5386\u53F2\u8BB0\u5F55\uFF0C\u6362\u4E2A\u5173\u952E\u8BCD\u8BD5\u8BD5\u3002",
  historyClearSearch: "\u6E05\u7A7A",
  historyMatchCount: "\u5339\u914D {count} \u6761",
  historyDeleteHint: "\u5220\u9664\u540E\u4E0D\u53EF\u6062\u590D",
  versions: "\u4FEE\u6539\u8BB0\u5F55",
  versionsHint: "\u67E5\u770B\u8FD9\u4EFD\u6587\u6863\u6539\u8FC7\u7684\u7248\u672C\uFF0C\u968F\u65F6\u56DE\u9000",
  versionsCount: "\u5171 {count} \u4EFD",
  versionsEmpty: "\u8FD8\u6CA1\u6709\u4FEE\u6539\u8BB0\u5F55\u3002AI \u91CD\u8BD1\u6216\u6309\u5EFA\u8BAE\u4F18\u5316\u524D\u4F1A\u81EA\u52A8\u5B58\u4E00\u4EFD\uFF0C\u4E5F\u53EF\u4EE5\u70B9\u201C\u4FDD\u5B58\u5F53\u524D\u7248\u672C\u201D\u624B\u52A8\u5B58\u3002",
  versionsFoot: "\u8BB0\u5F55\u4FDD\u5B58\u5728\u672C\u673A\uFF0C\u6BCF\u4EFD\u6587\u6863\u6700\u591A\u4FDD\u7559 {max} \u4EFD\uFF1B\u56DE\u9000\u524D\u4E5F\u4F1A\u81EA\u52A8\u5B58\u4E00\u4EFD\uFF0C\u6240\u4EE5\u56DE\u9000\u672C\u8EAB\u4E5F\u80FD\u64A4\u56DE\u3002",
  versionCurrent: "\u5F53\u524D\u7248\u672C",
  versionSave: "\u4FDD\u5B58\u5F53\u524D\u7248\u672C",
  versionSaveHint: "\u628A\u5F53\u524D\u8BD1\u6587\u5B58\u8FDB\u4FEE\u6539\u8BB0\u5F55\uFF0C\u4E4B\u540E\u53EF\u56DE\u9000",
  versionSaved: "\u5DF2\u4FDD\u5B58\u5F53\u524D\u7248\u672C\u3002",
  versionRestore: "\u56DE\u9000\u5230\u8FD9\u91CC",
  versionRestored: "\u5DF2\u56DE\u9000\u5230\u300C{label}\u300D\uFF0C\u56DE\u9000\u524D\u7684\u8BD1\u6587\u4E5F\u5B58\u8FDB\u4E86\u4FEE\u6539\u8BB0\u5F55\u3002",
  versionSame: "\u4E0E\u5F53\u524D\u4E00\u81F4",
  versionDiff: "{count} \u5904\u4E0E\u5F53\u524D\u4E0D\u540C",
  versionDelete: "\u5220\u9664",
  versionLabelInitial: "\u521D\u59CB\u7FFB\u8BD1",
  versionLabelRetranslate: "\u91CD\u8BD1\u524D",
  versionLabelOptimize: "\u4F18\u5316\u524D",
  versionLabelRestore: "\u56DE\u9000\u524D",
  versionLabelManual: "\u624B\u52A8\u4FDD\u5B58",
  pinEntry: "\u7F6E\u9876",
  unpinEntry: "\u53D6\u6D88\u7F6E\u9876",
  deleteEntry: "\u5220\u9664",
  confirmDelete: "\u786E\u8BA4\u5220\u9664",
  closePanel: "\u6536\u8D77",
  yesterday: "\u6628\u5929",
  untitled: "\u672A\u547D\u540D",
  discardDraft: "\u5F53\u524D\u539F\u6587\u8FD8\u6CA1\u6709\u7FFB\u8BD1\uFF0C\u65B0\u5EFA\u4F1A\u6E05\u7A7A\u5B83\u3002",
  sourceLabel: "\u539F\u6587",
  translationLabel: "\u8BD1\u6587",
  editHint: "\u53EF\u76F4\u63A5\u7F16\u8F91",
  paragraphs: "\u9010\u6BB5\u5BF9\u6BD4",
  sentences: "\u9010\u53E5\u5BF9\u6BD4",
  viewLabel: "\u5BF9\u7167\u89C6\u56FE",
  sentenceUnitOne: "\u53E5",
  sentenceUnitMany: "\u53E5",
  paragraphUnitOne: "\u6BB5",
  paragraphUnitMany: "\u6BB5",
  retranslate: "AI \u91CD\u8BD1",
  retranslating: "\u91CD\u8BD1\u4E2D\u2026",
  addPrompt: "\u63D0\u793A\u8BCD\u91CD\u8BD1",
  promptPlaceholder: "\u4F8B\u5982\uFF1A\u66F4\u53E3\u8BED\u5316\u3001\u4FDD\u7559\u672F\u8BED\u3001\u8BED\u6C14\u66F4\u6B63\u5F0F",
  promptConfirm: "\u91CD\u8BD1",
  promptCancel: "\u53D6\u6D88",
  scoreLabel: "AI \u8BC4\u5206",
  score: "AI \u8BC4\u5206",
  rescore: "\u91CD\u65B0\u8BC4\u5206",
  scoring: "\u8BC4\u5206\u4E2D\u2026",
  scoreAll: "\u5168\u90E8\u8BC4\u5206",
  scoreAllProgress: "\u8BC4\u5206\u4E2D {done}/{total}",
  optimize: "\u6309\u5EFA\u8BAE\u4F18\u5316",
  optimizing: "\u4F18\u5316\u4E2D\u2026",
  optimizeHint: "\u6309\u8FD9\u4E00\u6BB5\u7684 AI \u8BC4\u5206\u548C\u8BC4\u8BED\u6539\u8FDB\u8BD1\u6587",
  optimizeAll: "\u5168\u90E8\u4F18\u5316",
  optimizeAllHint: "\u6309\u6BCF\u6BB5\u7684 AI \u8BC4\u5206\u548C\u8BC4\u8BED\u9010\u6BB5\u6539\u8FDB",
  optimizeFullHint: "\u6309\u5168\u6587\u8BC4\u5206\u548C\u8BC4\u8BED\u91CD\u8BD1\u6574\u7BC7",
  optimizeProgress: "\u4F18\u5316\u4E2D {done}/{total}",
  optimizePrompt: "\u4E0A\u4E00\u7248 AI \u8BC4\u5206 {score} \u5206\uFF0C\u8BC4\u8BED\uFF1A{comment}\u3002\u8BF7\u6309\u8BC4\u8BED\u6539\u8FDB\u8FD9\u7248\u8BD1\u6587\uFF0C\u4FDD\u7559\u539F\u610F\u548C\u5B8C\u6574\u4FE1\u606F\u3002",
  optimizePromptScore: "\u4E0A\u4E00\u7248 AI \u8BC4\u5206 {score} \u5206\u3002\u8BF7\u5728\u4FDD\u7559\u539F\u610F\u7684\u524D\u63D0\u4E0B\u6253\u78E8\u8FD9\u7248\u8BD1\u6587\u3002",
  showScores: "\u663E\u793A\u8BC4\u5206",
  hideScores: "\u9690\u85CF\u8BC4\u5206",
  noSource: "\u8BF7\u5148\u8F93\u5165\u539F\u6587\u3002",
  noTranslationYet: "\u8FD9\u4E00\u6BB5\u8FD8\u6CA1\u6709\u8BD1\u6587\uFF0C\u8BF7\u5148\u7FFB\u8BD1\u6216\u624B\u52A8\u586B\u5199\u3002",
  requestFailed: "\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
  networkError: "\u65E0\u6CD5\u8FDE\u63A5\u7FFB\u8BD1\u670D\u52A1\uFF0C\u8BF7\u786E\u8BA4\u63D2\u4EF6\u5DF2\u542F\u7528\u540E\u5237\u65B0\u9875\u9762\u3002",
  retranslateFailed: "\u91CD\u8BD1\u6CA1\u6709\u8FD4\u56DE\u6709\u6548\u8BD1\u6587\u3002",
  translateFailed: "\u7FFB\u8BD1\u6CA1\u6709\u8FD4\u56DE\u6709\u6548\u8BD1\u6587\u3002",
  scoreFailed: "\u8BC4\u5206\u6CA1\u6709\u8FD4\u56DE\u6709\u6548\u7ED3\u679C\u3002",
  invalidRequest: "\u8BF7\u6C42\u5185\u5BB9\u4E0D\u7B26\u5408\u8981\u6C42\uFF0C\u8BF7\u68C0\u67E5\u539F\u6587\u540E\u91CD\u8BD5\u3002",
  tooLarge: "\u5185\u5BB9\u8FC7\u5927\uFF0C\u8BF7\u538B\u7F29\u56FE\u7247\u6216\u62C6\u5206\u6587\u672C\u540E\u91CD\u8BD5\u3002",
  tooLongDoc: "\u539F\u6587\u8FC7\u957F\uFF1A\u5355\u6B21\u6700\u591A 400 \u53E5/\u6BB5\u6216\u7EA6 12 \u4E07\u5B57\u7B26\uFF0C\u8BF7\u62C6\u5206\u540E\u5206\u6B21\u7FFB\u8BD1\u3002",
  noModelAvailable: "\u670D\u52A1\u6216\u6A21\u578B\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u786E\u8BA4\u5DF2\u5728\u8BBE\u7F6E\u4E2D\u9009\u62E9\u9ED8\u8BA4\u6A21\u578B\u3002",
  engineFailed: "AI \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
  requestRejected: "\u8BF7\u6C42\u88AB\u62D2\u7EDD\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  languageChangeHint: "\u8BED\u8A00\u5207\u6362\u53EA\u5F71\u54CD\u4E4B\u540E\u7684\u91CD\u8BD1\u3001\u8BC4\u5206\u548C\u56FE\u7247\u8BC6\u522B\uFF1B\u8981\u6574\u7BC7\u91CD\u8BD1\uFF0C\u8BF7\u70B9\u201C\u65B0\u5EFA\u7FFB\u8BD1\u201D\u3002",
  saveHint: "\u7F16\u8F91\u5185\u5BB9\u4F1A\u81EA\u52A8\u4FDD\u5B58\u5728\u672C\u673A\u6D4F\u89C8\u5668\u3002",
  modelLabel: "\u6A21\u578B",
  modelUnknown: "\u672A\u68C0\u6D4B\u5230\u53EF\u7528\u6A21\u578B",
  modelPicker: "\u5207\u6362\u6A21\u578B",
  modelFollowDefault: "\u8DDF\u968F\u9ED8\u8BA4\u6A21\u578B",
  modelSwitchHint: "\u540E\u7EED\u7FFB\u8BD1\u3001\u91CD\u8BD1\u3001\u8BC4\u5206\u548C\u56FE\u7247\u8BC6\u522B\u90FD\u4F1A\u7528\u300C{model}\u300D\uFF1B\u5DF2\u7ECF\u7FFB\u597D\u7684\u5185\u5BB9\u4E0D\u4F1A\u81EA\u52A8\u91CD\u505A\u3002",
  modelMissing: "\u4E4B\u524D\u9009\u62E9\u7684\u6A21\u578B\u73B0\u5728\u4E0D\u53EF\u7528\uFF0C\u5DF2\u5207\u56DE\u9ED8\u8BA4\u6A21\u578B\u3002",
  modelUnavailable: "\u8BFB\u4E0D\u5230\u53EF\u5207\u6362\u7684\u6A21\u578B\u5217\u8868",
  engineOnline: "\u7FFB\u8BD1\u670D\u52A1\u5DF2\u5C31\u7EEA",
  engineOffline: "\u7FFB\u8BD1\u670D\u52A1\u672A\u5C31\u7EEA",
  charUnitOne: "\u5B57\u7B26",
  charUnitMany: "\u5B57\u7B26",
  fullText: "\u5168\u6587",
  fullModeLabel: "\u5168\u6587\u663E\u793A\u65B9\u5F0F",
  fullModeTranslation: "\u8BD1\u6587",
  fullModeSource: "\u539F\u6587",
  fullModeBoth: "\u5BF9\u6BD4",
  fullRetranslateHint: "\u628A\u6574\u7BC7\u539F\u6587\u4E00\u6B21\u6027\u4EA4\u7ED9\u5F53\u524D\u6A21\u578B\u91CD\u8BD1\uFF1B\u73B0\u6709\u8BD1\u6587\u4F1A\u4F5C\u4E3A\u53C2\u8003\u4E00\u5E76\u9001\u7ED9\u6A21\u578B\u3002",
  retranslateFullBusy: "\u6574\u7BC7\u91CD\u8BD1\u4E2D\u2026",
  retranslateArrayBusy: "\u5206\u6BB5\u91CD\u8BD1\u4E2D\u2026",
  retranslateAllProgress: "\u91CD\u8BD1\u4E2D {done}/{total}",
  retranslatePartial: "{failed} \u6BB5\u91CD\u8BD1\u5931\u8D25\uFF0C\u5176\u4F59\u6BB5\u843D\u5DF2\u5B8C\u6210\u3002",
  fullRetranslateMismatch: "\u91CD\u8BD1\u7ED3\u679C\u88AB\u5206\u6210 {got} \u6BB5\uFF0C\u4E0E\u539F\u6587\u7684 {want} \u6BB5\u5BF9\u4E0D\u4E0A\uFF0C\u672A\u5199\u5165\uFF1B\u8BF7\u91CD\u8BD5\u4E00\u6B21\u3002",
  transModeLabel: "\u7FFB\u8BD1\u6A21\u5F0F",
  transModeHint: "\u8FDE\u8D2F\u4F18\u5148\uFF1A\u6574\u7BC7\u4E00\u6B21\u8BF7\u6C42\uFF0C\u4E0A\u4E0B\u6587\u6700\u5B8C\u6574\u3001\u8BD1\u6587\u6700\u8FDE\u8D2F\uFF1B\u5BF9\u9F50\u4F18\u5148\uFF1A\u5168\u6587\u5206\u6BB5\u6210\u6570\u7EC4\u4E00\u6B21\u8BF7\u6C42\uFF0C\u6BB5\u843D\u4E00\u4E00\u5BF9\u5E94\u6700\u6709\u4FDD\u969C\uFF1B\u901F\u5EA6\u4F18\u5148\uFF1A\u5206\u5757\u5E76\u53D1\uFF0816 \u53E5\u6216 6 \u6BB5\u4E00\u5757\u30013 \u8DEF\u5E76\u53D1\uFF09\uFF0C\u957F\u6587\u6700\u5FEB\u3002",
  modeWhole: "\u8FDE\u8D2F\u4F18\u5148",
  modeArray: "\u5BF9\u9F50\u4F18\u5148",
  modeBatch: "\u901F\u5EA6\u4F18\u5148",
  translateArrayBusy: "\u5206\u6BB5\u7FFB\u8BD1\u4E2D\u2026",
  fullTextHint: "\u8BD1\u6587\u5168\u6587\u53EF\u76F4\u63A5\u7F16\u8F91\uFF0C\u6539\u52A8\u4F1A\u5199\u56DE\u5BF9\u5E94\u6BB5\u843D\uFF1B\u4E5F\u53EF\u91CD\u8BD1\u6574\u7BC7\u3001\u5207\u5230\u539F\u6587\u6216\u53CC\u680F\u5BF9\u6BD4\u67E5\u770B\u3002\u4FEE\u6539\u540E\u5168\u6587\u8BC4\u5206\u4F1A\u91CD\u7F6E\u3002",
  copyTranslation: "\u590D\u5236\u8BD1\u6587",
  copySource: "\u590D\u5236\u539F\u6587",
  copied: "\u5DF2\u590D\u5236",
  copyFailed: "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u6587\u672C\u590D\u5236\u3002",
  emptyFull: "\u8FD8\u6CA1\u6709\u8BD1\u6587\uFF0C\u5148\u70B9\u51FB\u201C\u5F00\u59CB\u7FFB\u8BD1\u201D\u3002",
  imageTranslate: "\u56FE\u7247\u7FFB\u8BD1",
  ocrReading: "\u6B63\u5728\u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u6587\u5B57\u2026",
  ocrEmpty: "\u6CA1\u6709\u4ECE\u56FE\u7247\u91CC\u8BC6\u522B\u5230\u6587\u5B57\uFF0C\u6362\u4E00\u5F20\u6E05\u6670\u4E9B\u7684\u56FE\u7247\u8BD5\u8BD5\u3002",
  imageTypeError: "\u8BF7\u9009\u62E9 PNG\u3001JPEG\u3001WebP \u6216 GIF \u56FE\u7247\u3002",
  imageTooLarge: "\u56FE\u7247\u592A\u5927\uFF0C\u8BF7\u538B\u7F29\u540E\u518D\u8BD5\u3002",
  fileTranslate: "\u6587\u4EF6\u7FFB\u8BD1",
  fileReading: "\u6B63\u5728\u8BFB\u53D6\u6587\u4EF6\u2026",
  fileHint: "\u652F\u6301 .txt\u3001.md\u3001.html\u3001.docx \u6587\u4EF6\u4E0E\u56FE\u7247\u53D6\u5B57\uFF0C\u5BFC\u5165\u540E\u76F4\u63A5\u7FFB\u8BD1\uFF0C\u8BD1\u6587\u53EF\u4E0B\u8F7D\u3002",
  fileEmpty: "\u6587\u4EF6\u91CC\u6CA1\u6709\u53EF\u7FFB\u8BD1\u7684\u6587\u5B57\u3002",
  fileTooLong: "\u6587\u4EF6\u8FC7\u957F\uFF1A\u5355\u6B21\u6700\u591A\u7EA6 12 \u4E07\u5B57\u7B26\uFF0C\u8BF7\u62C6\u5206\u540E\u518D\u5BFC\u5165\u3002",
  fileTooBig: "\u6587\u4EF6\u592A\u5927\uFF08\u8D85\u8FC7 8 MB\uFF09\uFF0C\u8BF7\u62C6\u5206\u540E\u518D\u5BFC\u5165\u3002",
  fileTypeError: "\u8BF7\u9009\u62E9 .txt\u3001.md\u3001.html \u6216 .docx \u6587\u4EF6\u3002",
  fileLegacyDoc: "\u4E0D\u652F\u6301\u65E7\u7248 .doc\uFF0C\u8BF7\u5148\u5728 Word \u91CC\u53E6\u5B58\u4E3A .docx\u3002",
  fileUnreadable: "\u6587\u4EF6\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u786E\u8BA4\u6587\u4EF6\u6CA1\u6709\u635F\u574F\u3002",
  fileUnsupported: "\u5F53\u524D\u6D4F\u89C8\u5668\u65E0\u6CD5\u89E3\u6790 .docx\uFF0C\u8BF7\u53E6\u5B58\u4E3A .txt \u6216 .md \u540E\u518D\u5BFC\u5165\u3002",
  fileRemove: "\u79FB\u9664\u6587\u4EF6",
  fileChipHint: "\u5BFC\u5165\u7684\u6587\u4EF6\u540D\uFF0C\u4E0B\u8F7D\u8BD1\u6587\u65F6\u4F1A\u6CBF\u7528\u5B83",
  downloadTranslation: "\u4E0B\u8F7D\u8BD1\u6587",
  downloaded: "\u5DF2\u4E0B\u8F7D\u300C{name}\u300D\u3002",
  downloadFailed: "\u4E0B\u8F7D\u5931\u8D25\uFF0C\u8BF7\u7528\u201C\u590D\u5236\u8BD1\u6587\u201D\u624B\u52A8\u4FDD\u5B58\u3002",
  scoreFull: "\u5168\u6587\u8BC4\u5206",
  noVision: "\u5F53\u524D\u6A21\u578B\u4E0D\u652F\u6301\u56FE\u7247\u8BC6\u522B\uFF0C\u8BF7\u5148\u5728\u8BBE\u7F6E\u91CC\u6362\u7528\u652F\u6301\u56FE\u7247\u7684\u6A21\u578B\u3002",
  ocrHint: "\u56FE\u7247\u8BC6\u522B\u540E\u4F1A\u76F4\u63A5\u7FFB\u8BD1\uFF0C\u8BC6\u522B\u7ED3\u679C\u53EF\u5728\u539F\u6587\u6846\u91CC\u4FEE\u6539\u3002",
  fullScoreTooLong: "\u539F\u6587\u6216\u5168\u6587\u8BD1\u6587\u8D85\u8FC7 6 \u4E07\u5B57\u7B26\uFF0C\u8BF7\u7CBE\u7B80\u540E\u518D\u505A\u5168\u6587\u8BC4\u5206\u3002",
  noTranslationFull: "\u8FD8\u6CA1\u6709\u53EF\u8BC4\u5206\u7684\u5168\u6587\u8BD1\u6587\uFF0C\u5148\u5B8C\u6210\u7FFB\u8BD1\u3002",
  imageUnreadable: "\u56FE\u7247\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u6362\u4E00\u5F20\u56FE\u7247\u8BD5\u8BD5\u3002",
  workspace: "\u5DE5\u4F5C\u533A",
  workspaceHint: "\u6253\u5F00\u4E00\u4E2A\u6587\u4EF6\u5939\uFF0C\u9009\u4EFB\u610F\u6587\u4EF6\u7FFB\u8BD1\u5E76\u6821\u5BF9\uFF0C\u4E5F\u53EF\u4E00\u952E\u6279\u91CF\u7FFB\u8BD1",
  wsRootPlaceholder: "\u7C98\u8D34\u6587\u4EF6\u5939\u8DEF\u5F84\uFF0C\u5982 /Users/you/Documents/docs",
  wsOpen: "\u6253\u5F00",
  wsSelectLabel: "\u5DE5\u4F5C\u533A",
  wsEmptyRegistry: "Harness \u91CC\u8FD8\u6CA1\u6709\u9879\u76EE\u3002\u5148\u5728\u4E3B\u754C\u9762\u6DFB\u52A0\u9879\u76EE\u6587\u4EF6\u5939\uFF0C\u518D\u56DE\u5230\u8FD9\u91CC\u3002",
  wsReloadRegistry: "\u91CD\u65B0\u68C0\u6D4B",
  wsManualToggle: "\u624B\u52A8\u8F93\u5165\u8DEF\u5F84",
  wsUnavailable: "\u5F53\u524D\u5BBF\u4E3B\u672A\u63D0\u4F9B\u5DE5\u4F5C\u533A\u5217\u8868\uFF0C\u53EF\u624B\u52A8\u8F93\u5165\u6587\u4EF6\u5939\u8DEF\u5F84\u3002",
  wsHostStale: "\u5BBF\u4E3B\u4FA7\u8FD8\u662F\u65E7\u7248\u672C\uFF1A\u91CD\u542F Harness \u540E\uFF0C\u8FD9\u91CC\u4F1A\u81EA\u52A8\u5217\u51FA Harness \u9879\u76EE\u3002",
  wsNotRegistered: "\u8BE5\u6587\u4EF6\u5939\u4E0D\u662F Harness \u6CE8\u518C\u7684\u5DE5\u4F5C\u533A\uFF0C\u8BF7\u4ECE\u5217\u8868\u4E2D\u9009\u62E9\u3002",
  wsRefresh: "\u5237\u65B0",
  wsOutputLabel: "\u8BD1\u6587\u8F93\u51FA",
  wsOutputSubfolder: "\u53E6\u5B58\u5230\u5B50\u6587\u4EF6\u5939",
  wsOutputSuffix: "\u53E6\u5B58\u4E3A\u540C\u76EE\u5F55\u526F\u672C",
  wsOutputOverwrite: "\u8986\u76D6\u539F\u6587\u4EF6",
  wsOutputPreview: "\u9884\u89C8",
  wsSuffixLabel: "\u526F\u672C\u540E\u7F00",
  wsSubfolderName: "\u8BD1\u6587",
  wsAutoSave: "\u81EA\u52A8\u4FDD\u5B58",
  toastClose: "\u5173\u95ED\u63D0\u793A",
  wsSpecTitle: "\u89C4\u8303",
  wsSpecToggle: "\u9644\u5E26\u89C4\u8303",
  wsSpecCount: "\u89C4\u8303 {count} \u4E2A",
  wsSpecEmpty: "\u8FD8\u6CA1\u6709\u89C4\u8303\u6587\u6863",
  wsSpecAdd: "\u65B0\u589E",
  wsSpecCreate: "\u521B\u5EFA",
  wsSpecNamePlaceholder: "\u6587\u4EF6\u540D\uFF08\u82F1\u6587\uFF09",
  wsSpecSave: "\u4FDD\u5B58",
  wsSpecBack: "\u8FD4\u56DE",
  wsSpecDelete: "\u5220\u9664",
  wsSpecConfirmDelete: "\u786E\u8BA4\u5220\u9664",
  wsSpecSaved: "\u5DF2\u4FDD\u5B58 {name}\u3002",
  wsSpecDeleted: "\u5DF2\u5220\u9664 {name}\u3002",
  wsSpecNameInvalid: "\u6587\u4EF6\u540D\u53EA\u80FD\u7528\u5B57\u6BCD\u3001\u6570\u5B57\u3001\u8FDE\u5B57\u7B26\u6216\u4E0B\u5212\u7EBF\u3002",
  wsSpecSkipped: "{name} \u592A\u5927\uFF0C\u7FFB\u8BD1\u65F6\u4E0D\u4F1A\u9644\u5E26\u3002",
  wsDeleteFailed: "\u5220\u9664\u5931\u8D25\uFF1A{message}",
  wsTranslateAll: "\u7FFB\u8BD1\u5168\u90E8",
  wsTranslateAllHint: "\u6309\u987A\u5E8F\u7FFB\u8BD1\u6240\u6709\u672A\u7FFB\u8BD1\u7684\u6587\u4EF6\uFF0C\u7FFB\u5B8C\u53EF\u9010\u4E2A\u6821\u5BF9\uFF1B\u8FDB\u884C\u4E2D\u53EF\u505C\u6B62",
  wsBatchProgress: "\u6279\u91CF\u7FFB\u8BD1\u4E2D {done}/{total}\u2026",
  wsStopBatch: "\u505C\u6B62\u6279\u91CF",
  wsPendingCount: "\u5F85\u7FFB\u8BD1 {count} \u4E2A",
  wsAllTranslated: "\u5217\u8868\u91CC\u7684\u6587\u4EF6\u90FD\u5DF2\u7FFB\u8BD1\u8FC7\u3002",
  wsCount: "{count} \u4E2A\u6587\u4EF6",
  wsTreeLabel: "\u5DE5\u4F5C\u533A\u6587\u4EF6\u76EE\u5F55\u6811",
  wsEmpty: "\u6587\u4EF6\u5939\u91CC\u8FD8\u6CA1\u6709\u53EF\u7FFB\u8BD1\u7684\u6587\u672C\u6587\u4EF6\uFF08.txt / .md / .html / .docx\uFF09\u3002",
  wsTranslate: "\u7FFB\u8BD1",
  wsRetranslate: "\u91CD\u65B0\u7FFB\u8BD1",
  wsBannerTarget: "\u8BD1\u6587\u4FDD\u5B58\u5230",
  wsBannerPreview: "\u9884\u89C8",
  wsBannerSpec: "\u89C4\u8303",
  wsSaveToFile: "\u4FDD\u5B58\u5230\u6587\u4EF6",
  wsSaved: "\u5DF2\u4FDD\u5B58\u5230 {path}\u3002",
  wsBackToList: "\u56DE\u5230\u5217\u8868",
  wsListFailed: "\u8BFB\u53D6\u6587\u4EF6\u5939\u5931\u8D25\uFF1A{message}",
  wsReadFailed: "\u8BFB\u53D6 {name} \u5931\u8D25\uFF1A{message}",
  wsWriteFailed: "\u4FDD\u5B58\u5931\u8D25\uFF1A{message}",
  wsNothingToSave: "\u8FD8\u6CA1\u6709\u53EF\u4FDD\u5B58\u7684\u8BD1\u6587\u3002",
  wsNoTranslation: "\u8BD1\u6587\u6587\u4EF6\u8FD8\u4E0D\u5B58\u5728\uFF0C\u8BF7\u5148\u7FFB\u8BD1\u3002",
  wsBatchPartial: "{failed} \u4E2A\u6587\u4EF6\u7FFB\u8BD1\u5931\u8D25\uFF0C\u53EF\u5728\u5217\u8868\u4E2D\u5355\u72EC\u91CD\u8BD5\u3002",
  wsRootMissing: "\u6587\u4EF6\u5939\u4E0D\u5B58\u5728\u6216\u4E0D\u53EF\u8BFB\u3002",
  wsPathEscape: "\u8DEF\u5F84\u8D85\u51FA\u5DE5\u4F5C\u533A\u8303\u56F4\u3002",
  wsExtUnsupported: "\u4E0D\u652F\u6301\u8FD9\u79CD\u6587\u4EF6\u7C7B\u578B\u3002",
  wsTooLargeFile: "\u6587\u4EF6\u8D85\u8FC7\u5927\u5C0F\u9650\u5236\u3002",
  wsFileMissing: "\u6587\u4EF6\u4E0D\u5B58\u5728\uFF0C\u53EF\u80FD\u5DF2\u88AB\u79FB\u52A8\u6216\u5220\u9664\u3002",
  wsExists: "\u76EE\u6807\u6587\u4EF6\u5DF2\u5B58\u5728\u3002"
};
var en = {
  panel: "Translation Assistant",
  title: "Translation Assistant",
  intro: "AI drafts, you review: paste the source or import a file, and translate it side by side, paragraph by paragraph or sentence by sentence. Edit any translation, or leave a score and a comment for AI to rewrite \u2014 with a different model if you like. Every document lands in on-device history, every AI pass leaves a revision you can roll back to, and image OCR, full-text copy, download, and scoring are built in.",
  sourceLanguage: "Source language",
  targetLanguage: "Target language",
  autoDetect: "Auto-detect",
  sourcePlaceholder: "Paste the source text (blank lines split paragraphs), or drop a file, paste a screenshot, or pick an image.",
  targetPlaceholder: "The AI translation appears here; edit it freely",
  translate: "Translate",
  translating: "Translating\u2026",
  translateWholeBusy: "Translating the whole document\u2026",
  translateProgress: "Translating {done}/{total}",
  translatePartial: "{failed} segment(s) failed to translate; the rest are done.",
  footerHint: "Scores are AI judgements for reference only; fetch them with \u201CAI score\u201D or \u201CFull-text score\u201D.",
  newTranslation: "New translation",
  newTranslationHint: "Start a new translation; the current document stays in history",
  stopTranslation: "Stop",
  stopTranslationHint: "Stop the running translation or retranslation",
  historyTitle: "Translation history",
  historyCount: "{count} saved",
  historySwitchHint: "Open translation history to switch documents",
  historyCurrent: "Current document",
  historyEmpty: "No history yet. Every translation is saved on this device, so you can switch back and keep editing later.",
  historyHint: "History lives in this browser and keeps the latest {max} documents \u2014 pinned first, then most recently used. Deleted entries cannot be restored.",
  historySearch: "Search history",
  historySearchPlaceholder: "Search source or translation\u2026",
  historyNoMatch: "No saved document matches that search.",
  historyClearSearch: "Clear",
  historyMatchCount: "{count} matching",
  historyDeleteHint: "Deleted entries cannot be restored",
  versions: "Revisions",
  versionsHint: "See earlier versions of this document and roll back to one",
  versionsCount: "{count} saved",
  versionsEmpty: "No revisions yet. One is saved before every AI retranslation or suggestion pass \u2014 you can also click \u201CSave current version\u201D.",
  versionsFoot: "Revisions live in this browser and keep the latest {max} per document. One is also saved before each rollback, so a rollback can be undone.",
  versionCurrent: "Current version",
  versionSave: "Save current version",
  versionSaveHint: "Store the current translation as a revision you can roll back to",
  versionSaved: "Current version saved.",
  versionRestore: "Restore",
  versionRestored: "Restored \u201C{label}\u201D. The version you left is stored in revisions too.",
  versionSame: "Same as current",
  versionDiff: "{count} segments differ",
  versionDelete: "Delete",
  versionLabelInitial: "Initial translation",
  versionLabelRetranslate: "Before retranslation",
  versionLabelOptimize: "Before suggestion pass",
  versionLabelRestore: "Before rollback",
  versionLabelManual: "Saved manually",
  pinEntry: "Pin to top",
  unpinEntry: "Unpin",
  deleteEntry: "Delete",
  confirmDelete: "Confirm delete",
  closePanel: "Hide",
  yesterday: "Yesterday",
  untitled: "Untitled",
  discardDraft: "The text in the box is not translated yet; starting a new translation clears it.",
  sourceLabel: "Source",
  translationLabel: "Translation",
  editHint: "editable",
  paragraphs: "By paragraph",
  sentences: "By sentence",
  viewLabel: "Comparison view",
  sentenceUnitOne: "sentence",
  sentenceUnitMany: "sentences",
  paragraphUnitOne: "paragraph",
  paragraphUnitMany: "paragraphs",
  retranslate: "AI retranslate",
  retranslating: "Retranslating\u2026",
  addPrompt: "Retranslate with prompt",
  promptPlaceholder: "e.g. more colloquial, keep terminology, more formal tone",
  promptConfirm: "Retranslate",
  promptCancel: "Cancel",
  scoreLabel: "AI score",
  score: "AI score",
  rescore: "Rescore",
  scoring: "Scoring\u2026",
  scoreAll: "Score all",
  scoreAllProgress: "Scoring {done}/{total}",
  optimize: "Apply suggestion",
  optimizing: "Improving\u2026",
  optimizeHint: "Improve this translation using its AI score and feedback",
  optimizeAll: "Apply all",
  optimizeAllHint: "Improve every segment using its own AI score and feedback",
  optimizeFullHint: "Retranslate the whole document using its full-text score and feedback",
  optimizeProgress: "Improving {done}/{total}",
  optimizePrompt: "The previous AI score was {score}, with this feedback: {comment}. Improve the translation accordingly while keeping the meaning and all information intact.",
  optimizePromptScore: "The previous AI score was {score}. Polish this translation while keeping the meaning intact.",
  showScores: "Show scores",
  hideScores: "Hide scores",
  noSource: "Enter the source text first.",
  noTranslationYet: "This segment has no translation yet. Translate it or fill it in first.",
  requestFailed: "The request failed. Please try again.",
  networkError: "Cannot reach the translation service. Make sure the plugin is enabled, then reload the page.",
  retranslateFailed: "Retranslation did not return usable text.",
  translateFailed: "Translation did not return usable text.",
  scoreFailed: "Scoring did not return a usable result.",
  invalidRequest: "The request is invalid. Check the input and try again.",
  tooLarge: "Content is too large. Compress the image or split the text, then retry.",
  tooLongDoc: "This source is too long: up to 400 segments or about 120,000 characters per request. Split it into parts.",
  noModelAvailable: "The service or model is unavailable. Make sure a default model is selected.",
  engineFailed: "The AI service is temporarily unavailable. Try again later.",
  requestRejected: "The request was refused. Please try again.",
  languageChangeHint: "Language changes apply to later retranslation, scoring, and image OCR. Use \u201CNew translation\u201D to translate everything again.",
  saveHint: "Edits are saved automatically in this browser.",
  modelLabel: "Model",
  modelUnknown: "No model route detected",
  modelPicker: "Switch model",
  modelFollowDefault: "Follow default",
  modelSwitchHint: "Later translation, retranslation, scoring, and image OCR will use \u201C{model}\u201D. Existing text is not redone.",
  modelMissing: "The model you picked is no longer available, so the default is used again.",
  modelUnavailable: "Could not read the list of switchable models",
  engineOnline: "Translation service ready",
  engineOffline: "Translation service not ready",
  charUnitOne: "character",
  charUnitMany: "characters",
  fullText: "Full text",
  fullModeLabel: "Full-text display",
  fullModeTranslation: "Translation",
  fullModeSource: "Source",
  fullModeBoth: "Compare",
  fullRetranslateHint: "Send the whole document to the current model in one request; the existing translation rides along as reference.",
  retranslateFullBusy: "Retranslating the whole document\u2026",
  retranslateArrayBusy: "Retranslating segments\u2026",
  retranslateAllProgress: "Retranslating {done}/{total}",
  retranslatePartial: "{failed} segment(s) failed to retranslate; the rest are done.",
  fullRetranslateMismatch: "The retranslation came back as {got} paragraphs, but the source has {want}; nothing was written \u2014 try again.",
  transModeLabel: "Translation mode",
  transModeHint: "Coherence first: one request for the full text, the fullest context and the most coherent wording. Alignment first: the paragraphs go out as one JSON array, the strongest paragraph alignment. Speed first: chunks run three at a time (16 sentences or 6 paragraphs each), the fastest for long texts.",
  modeWhole: "Coherence first",
  modeArray: "Alignment first",
  modeBatch: "Speed first",
  translateArrayBusy: "Translating segments\u2026",
  fullTextHint: "The full translation is editable and writes back to its segments; retranslate the document, switch to the source or a side-by-side view at any time. Editing resets the full-text score.",
  copyTranslation: "Copy translation",
  copySource: "Copy source",
  copied: "Copied",
  copyFailed: "Copy failed. Select the text and copy it manually.",
  emptyFull: "No translation yet. Click \u201CTranslate\u201D first.",
  imageTranslate: "Translate image",
  ocrReading: "Reading the image\u2026",
  ocrEmpty: "No readable text was found in the image. Try a clearer one.",
  imageTypeError: "Choose a PNG, JPEG, WebP, or GIF image.",
  imageTooLarge: "The image is too large. Compress it and try again.",
  fileTranslate: "Translate file",
  fileReading: "Reading the file\u2026",
  fileHint: "Import .txt, .md, .html, or .docx files, or read text from an image; the translation can be downloaded.",
  fileEmpty: "The file contains no text to translate.",
  fileTooLong: "The file is too long: up to about 120,000 characters per pass. Split it first.",
  fileTooBig: "The file is larger than 8 MB. Split it and try again.",
  fileTypeError: "Choose a .txt, .md, .html, or .docx file.",
  fileLegacyDoc: "Legacy .doc is not supported. Save it as .docx in Word first.",
  fileUnreadable: "The file could not be read. Check that it is not damaged.",
  fileUnsupported: "This browser cannot unpack .docx. Save the file as .txt or .md and import that.",
  fileRemove: "Remove file",
  fileChipHint: "The imported file name, reused when downloading the translation",
  downloadTranslation: "Download translation",
  downloaded: "Downloaded \u201C{name}\u201D.",
  downloadFailed: "The download failed. Use \u201CCopy translation\u201D instead.",
  scoreFull: "Full-text score",
  noVision: "The selected model cannot read images. Choose a vision-capable model in Settings.",
  ocrHint: "The recognized text is translated right away; edit it in the source box if needed.",
  fullScoreTooLong: "The source or full translation exceeds 60,000 characters; shorten it before scoring the document.",
  noTranslationFull: "There is no full translation to score yet. Translate first.",
  imageUnreadable: "This image could not be read. Try another file.",
  workspace: "Workspace",
  workspaceHint: "Open a folder, pick any file to translate and proofread, or batch-translate everything",
  wsRootPlaceholder: "Paste a folder path, e.g. /Users/you/Documents/docs",
  wsOpen: "Open",
  wsSelectLabel: "Workspace",
  wsEmptyRegistry: "No projects in Harness yet. Add a project folder in the main window first, then come back.",
  wsReloadRegistry: "Detect again",
  wsManualToggle: "Enter a path manually",
  wsUnavailable: "This host does not expose the workspace list; enter a folder path manually.",
  wsHostStale: "The Host side is out of date: restart Harness and this list will show your Harness projects.",
  wsNotRegistered: "That folder is not a registered Harness workspace; pick one from the list.",
  wsRefresh: "Refresh",
  wsOutputLabel: "Translation output",
  wsOutputSubfolder: "Save into a subfolder",
  wsOutputSuffix: "Save as a sibling copy",
  wsOutputOverwrite: "Overwrite the original file",
  wsOutputPreview: "Preview",
  wsSuffixLabel: "Copy suffix",
  wsSubfolderName: "translated",
  wsAutoSave: "Auto-save",
  toastClose: "Dismiss message",
  wsSpecTitle: "Guidelines",
  wsSpecToggle: "Attach guidelines",
  wsSpecCount: "{count} guideline docs",
  wsSpecEmpty: "No guideline docs yet",
  wsSpecAdd: "Add",
  wsSpecCreate: "Create",
  wsSpecNamePlaceholder: "File name",
  wsSpecSave: "Save",
  wsSpecBack: "Back",
  wsSpecDelete: "Delete",
  wsSpecConfirmDelete: "Confirm delete",
  wsSpecSaved: "Saved {name}.",
  wsSpecDeleted: "Deleted {name}.",
  wsSpecNameInvalid: "Use letters, digits, hyphens, or underscores only.",
  wsSpecSkipped: "{name} is too large and is not attached.",
  wsDeleteFailed: "Deleting failed: {message}",
  wsTranslateAll: "Translate all",
  wsTranslateAllHint: "Translate every untranslated file in order, then proofread one by one; stoppable",
  wsBatchProgress: "Batch translating {done}/{total}\u2026",
  wsStopBatch: "Stop batch",
  wsPendingCount: "{count} pending",
  wsAllTranslated: "Every file in the list has been translated.",
  wsCount: "{count} files",
  wsTreeLabel: "Workspace file tree",
  wsEmpty: "No translatable text files in this folder (.txt / .md / .html / .docx).",
  wsTranslate: "Translate",
  wsRetranslate: "Retranslate",
  wsBannerTarget: "saves to",
  wsBannerPreview: "Preview",
  wsBannerSpec: "Guidelines",
  wsSaveToFile: "Save to file",
  wsSaved: "Saved to {path}.",
  wsBackToList: "Back to list",
  wsListFailed: "Reading the folder failed: {message}",
  wsReadFailed: "Reading {name} failed: {message}",
  wsWriteFailed: "Saving failed: {message}",
  wsNothingToSave: "There is no translation to save yet.",
  wsNoTranslation: "The translated file does not exist yet. Translate first.",
  wsBatchPartial: "{failed} file(s) failed to translate; retry them individually from the list.",
  wsRootMissing: "The folder does not exist or cannot be read.",
  wsPathEscape: "The path escapes the workspace root.",
  wsExtUnsupported: "This file type is not supported.",
  wsTooLargeFile: "The file exceeds the size limit.",
  wsFileMissing: "The file is gone \u2014 it may have been moved or deleted.",
  wsExists: "The target file already exists."
};

// src/client/page/TranslationPage.ts
var React3 = __toESM(require("react"), 1);

// src/client/styles.css
var styles_default = '.dta-page{box-sizing:border-box;height:100%;display:flex;flex-direction:column;align-items:center;gap:18px;padding:0 clamp(20px,4vw,48px) 40px;overflow:auto;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}\n.dta-page>*{width:100%;max-width:1100px;box-sizing:border-box}\n.dta-head{display:flex;flex-direction:column;gap:6px;padding-top:26px}\n[data-platform="darwin"] .dta-head{padding-top:calc(26px + var(--dsh-frame-top-clearance,0px))}\n.dta-headTop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-width:0}\n.dta-title{flex:none;margin:0;font-size:20px;font-weight:500;line-height:28px}\n.dta-intro{max-width:760px;margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}\n.dta-engine{display:inline-flex;align-items:center;gap:6px;margin-left:auto;padding-left:8px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}\n.dta-engineDot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-success-primary);flex:none}\n.dta-engine[data-state="unknown"] .dta-engineDot{background:var(--dsw-alias-state-idle-primary)}\n.dta-engine--picker{gap:4px}\n.dta-modelSelect{height:24px;max-width:min(260px,48vw);padding:0 16px 0 2px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:11.5px;text-overflow:ellipsis;cursor:pointer;outline:none}\n.dta-modelSelect:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}\n.dta-modelSelect:disabled{opacity:.6;cursor:default}\n.dta-histBtn{max-width:min(340px,46vw);padding:0 9px 0 8px;color:var(--dsw-alias-label-secondary)}\n.dta-histIcon{flex:none;opacity:.8}\n.dta-histCaret{flex:none;margin-left:-1px;opacity:.55}\n.dta-histBtn:hover .dta-histIcon{opacity:1}\n.dta-histBtn:hover .dta-histCaret{opacity:.85}\n.dta-histBtn[data-active="true"] .dta-histCaret{opacity:.85}\n.dta-histLabel{display:block;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:12px}\n.dta-histBtn[data-active="true"] .dta-histLabel{color:var(--dsw-alias-brand-primary)}\n.dta-newBtn{flex:none;padding:0 8px}\n.dta-drawerLayer{position:fixed;inset:0;z-index:120;display:flex;justify-content:flex-end;width:auto;max-width:none}\n.dta-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:140;display:flex;align-items:center;gap:8px;max-width:min(440px,80vw);padding:8px 12px 8px 14px;border-radius:var(--dsw-radius-md,8px);font-size:12.5px;line-height:18px;color:#fff;box-shadow:0 6px 20px rgba(0,0,0,.22);animation:dtaToastIn .18s ease-out}\n.dta-toastText{min-width:0}\n.dta-toastClose{flex:none;width:18px;height:18px;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.22);color:#fff;font-size:13px;line-height:1;cursor:pointer}\n.dta-toastClose:hover{background:rgba(255,255,255,.36)}\n.dta-toast--success{background:#16a34a}\n.dta-toast--info,.dta-toast--warn{background:#d97706}\n.dta-toast--error{background:#dc2626}\n@keyframes dtaToastIn{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}\n.dta-drawerMask{position:absolute;inset:0;background:rgba(14,16,20,.38);animation:dta-fade .16s ease-out both}\n.dta-drawer{position:relative;display:flex;flex-direction:column;width:min(392px,92vw);height:100%;min-width:0;border-left:.5px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);box-shadow:-18px 0 44px rgba(14,16,20,.18);animation:dta-slide .2s cubic-bezier(.2,.7,.3,1) both}\n.dta-drawerHead{display:flex;align-items:center;gap:8px;padding:18px 16px 10px}\n.dta-drawerTitle{margin:0;font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary)}\n.dta-drawerClose{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;margin-left:auto;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;cursor:pointer}\n.dta-drawerClose:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}\n.dta-drawerSearchWrap{display:flex;align-items:center;gap:8px;padding:0 16px 12px;border-bottom:.5px solid var(--dsw-alias-border-l1)}\n.dta-searchField{position:relative;display:flex;align-items:center;flex:1 1 auto;min-width:0}\n.dta-searchIcon{position:absolute;left:9px;color:var(--dsw-alias-label-secondary);pointer-events:none}\n.dta-searchField .dta-input{box-sizing:border-box;width:100%;flex:1 1 auto;min-width:0;padding:0 28px 0 28px}\n.dta-searchField .dta-input::-webkit-search-cancel-button{display:none}\n.dta-searchClear{position:absolute;right:3px;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1;cursor:pointer}\n.dta-searchClear:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}\n.dta-drawerBody{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;padding:10px 10px 14px}\n.dta-drawerEmpty{margin:8px 6px;padding:18px 12px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12.5px;line-height:19px}\n.dta-drawerFoot{flex:none;padding:10px 16px 14px;border-top:.5px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:17px}\n.dta-versionsBtn{flex:none;padding:0 8px}\n.dta-stopBtn{flex:none;padding:0 8px}\n.dta-drawer--versions{width:min(420px,94vw)}\n.dta-drawer--workspace{width:min(468px,94vw)}\n.dta-versionBar{display:flex;align-items:center;gap:8px;padding:0 16px 12px}\n.dta-versionBar .dta-btn{flex:1 1 auto;justify-content:center}\n.dta-versionCurrent{display:flex;flex-direction:column;gap:5px;margin:0 4px 8px;padding:10px 11px;border-radius:var(--dsw-radius-md,8px);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent)}\n.dta-versionCurrentLabel{font-size:12.5px;line-height:18px;font-weight:500;color:var(--dsw-alias-brand-primary)}\n.dta-versionTop{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.dta-versionTag{display:inline-flex;align-items:center;height:19px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1;white-space:nowrap}\n.dta-versionTag[data-kind="initial"]{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}\n.dta-versionTag[data-kind="optimize"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}\n.dta-versionTag[data-kind="retranslate"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent)}\n.dta-versionTime{font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;white-space:nowrap}\n.dta-versionDiff{margin-left:auto;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);opacity:.8;white-space:nowrap}\n.dta-versionRow[data-current="true"] .dta-versionDiff{opacity:1;color:var(--dsw-alias-brand-primary)}\n.dta-versionText{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:0;font-size:12px;line-height:17px;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}\n.dta-versionList{list-style:none;display:flex;flex-direction:column;gap:2px;margin:0;padding:0}\n.dta-versionRow{display:flex;flex-direction:column;gap:5px;padding:9px 10px;border-radius:var(--dsw-radius-md,8px);background:transparent}\n.dta-versionRow:hover{background:var(--dsw-alias-bg-layer-2)}\n.dta-versionRow[data-current="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,transparent)}\n.dta-versionActions{display:flex;align-items:center;gap:6px;margin-top:1px}\n.dta-versionActions .dta-btn{flex:none}\n.dta-historyList{list-style:none;display:flex;flex-direction:column;gap:2px;margin:0;padding:0}\n.dta-historyRow{position:relative;display:flex;align-items:center;gap:6px;padding:7px 6px 7px 11px;border-radius:var(--dsw-radius-md,8px);background:transparent}\n.dta-historyRow:hover{background:var(--dsw-alias-bg-layer-2)}\n.dta-historyRow[data-active="true"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,transparent)}\n.dta-historyRow[data-active="true"]::before{content:"";position:absolute;left:2px;top:9px;bottom:9px;width:2.5px;border-radius:2px;background:var(--dsw-alias-brand-primary)}\n.dta-historyRow[data-active="true"] .dta-historyTitle{color:var(--dsw-alias-brand-primary);font-weight:500}\n.dta-historyOpen{display:flex;flex:1 1 auto;min-width:0;flex-direction:column;gap:3px;padding:1px 0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}\n.dta-historyOpen:disabled{cursor:default;opacity:.6}\n.dta-historyTitle{display:block;font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dta-historyMeta{display:block;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dta-historyDelete{flex:none;height:24px;padding:0 7px;font-size:11.5px}\n.dta-historyPin{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;opacity:.45}\n.dta-historyPin:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);opacity:1}\n.dta-historyPin[data-pinned="true"]{opacity:1;color:var(--dsw-alias-brand-primary)}\n.dta-historyRow:hover .dta-historyPin,.dta-historyRow:focus-within .dta-historyPin{opacity:1}\n.dta-historySnippet{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:1px;font-size:11.5px;line-height:16px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}\n.dta-hl{padding:0 1px;border-radius:2px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 36%,transparent);color:var(--dsw-alias-label-primary)}\n.dta-historyRow:not([data-active="true"]) .dta-historyDelete{opacity:0}\n.dta-historyRow:hover .dta-historyDelete,.dta-historyRow:focus-within .dta-historyDelete{opacity:1}\n.dta-historyRow .dta-historyDelete[data-arm="true"]{opacity:1}\n@media (hover:none){.dta-historyRow:not([data-active="true"]) .dta-historyDelete{opacity:.75}.dta-historyPin{opacity:.9}}\n.dta-btn--danger{color:var(--dsw-alias-state-error-primary)}\n.dta-btn--danger[data-arm="true"]{border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent);color:var(--dsw-alias-state-error-primary)}\n/* Hover must not wash out the armed (destructive) state: the generic\n   .dta-btn:hover rule is more specific than bare [data-arm="true"]. */\n.dta-btn--danger[data-arm="true"]:hover:not(:disabled){border-color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 22%,transparent);color:var(--dsw-alias-state-error-primary)}\n.dta-btn--danger[data-arm="true"]:active:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent)}\n.dta-card{display:flex;flex-direction:column;gap:12px;padding:16px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-bg-layer-1)}\n.dta-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}\n.dta-field{display:inline-flex;align-items:center;gap:6px}\n.dta-fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}\n.dta-select{height:30px;max-width:180px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}\n.dta-select:disabled{opacity:.55;cursor:default}\n.dta-textarea{box-sizing:border-box;width:100%;min-height:168px;padding:12px;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.7;outline:none}\n.dta-textarea:focus{border-color:var(--dsw-alias-brand-primary)}\n.dta-input{box-sizing:border-box;flex:1;min-width:180px;height:30px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}\n.dta-input:focus{border-color:var(--dsw-alias-brand-primary)}\n.dta-actions{display:flex;align-items:center;justify-content:flex-end;gap:10px;flex-wrap:wrap}\n.dta-hint{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;margin-right:auto}\n.dta-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;line-height:1;white-space:nowrap;cursor:pointer}\n.dta-btn:hover:not(:disabled){border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}\n.dta-btn:disabled{opacity:.55;cursor:default}\n.dta-btn--primary{border-color:transparent;background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary-foreground)}\n.dta-btn--primary:hover:not(:disabled){border-color:transparent;background:var(--dsw-alias-brand-primary);opacity:.9}\n.dta-btn--ghost{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}\n.dta-btn--ghost:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}\n.dta-btn--sm{height:26px;padding:0 9px;font-size:12px}\n.dta-btn[aria-pressed="true"],.dta-btn[data-active="true"]{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}\n.dta-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap}\n.dta-toolbarSpacer{flex:1 1 0;min-width:0}\n.dta-tabs{display:inline-flex;gap:2px;padding:2px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}\n.dta-tab{height:26px;padding:0 12px;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;cursor:pointer}\n.dta-tab[aria-selected="true"]{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 .5px var(--dsw-alias-border-l1)}\n.dta-count{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}\n.dta-transMode{display:inline-flex;align-items:center;gap:6px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap;cursor:pointer;user-select:none}\n.dta-transMode:hover{color:var(--dsw-alias-label-primary)}\n.dta-transMode select{max-width:130px}\n.dta-modeHelp{position:relative;display:inline-flex;align-items:center;color:var(--dsw-alias-label-secondary);cursor:help}\n.dta-modeHelp:hover{color:var(--dsw-alias-label-primary)}\n.dta-modeBubble{position:absolute;top:calc(100% + 8px);right:-4px;z-index:40;width:250px;padding:8px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.7;white-space:normal;text-align:left;cursor:default;box-shadow:0 6px 20px rgba(0,0,0,.16);visibility:hidden;opacity:0;transition:opacity .12s ease}\n.dta-modeHelp:hover .dta-modeBubble,.dta-modeHelp[data-open="true"] .dta-modeBubble{visibility:visible;opacity:1}\n.dta-fileChip{display:inline-flex;align-items:center;gap:5px;max-width:min(280px,50vw);height:22px;padding:0 3px 0 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:1}\n.dta-fileName{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dta-fileClear{display:inline-flex;flex:none;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1;cursor:pointer}\n.dta-fileClear:hover{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}\n.dta-ws{display:flex;flex-direction:column;gap:12px}\n.dta-wsHeadIcon{flex:none;color:var(--dsw-alias-brand-primary)}\n.dta-wsTitle{margin:0;font-size:15px;font-weight:600}\n.dta-wsCount{padding:1px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:11.5px}\n.dta-wsRootPath{margin:0;color:var(--dsw-alias-label-secondary);font-size:11.5px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dta-wsRegistry{display:flex;flex-direction:column;gap:8px}\n.dta-wsHint{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}\n.dta-wsRegistryEmpty{display:flex;flex-direction:column;align-items:flex-start;gap:8px}\n.dta-wsOpenRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.dta-wsPath,.dta-wsSuffix{padding:6px 10px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.35));border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;font-size:12.5px}\n.dta-wsPath{flex:1;min-width:240px}\n.dta-wsSuffix{width:96px}\n.dta-wsSettings{display:flex;align-items:center;gap:16px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12.5px}\n.dta-wsField{display:flex;align-items:center;gap:6px}\n.dta-wsSelect{padding:4px 8px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.35));border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);color:inherit;font:inherit;font-size:12.5px}\n.dta-wsCheck{cursor:pointer}\n.dta-wsCheck input{margin:0}\n.dta-wsBatch{display:flex;align-items:center;gap:10px;flex-wrap:wrap}\n.dta-wsSpecBar{display:flex}\n.dta-drawer--spec{width:min(468px,94vw)}\n.dta-wsSpecList{display:flex;flex-direction:column;gap:6px}\n.dta-wsSpecCard{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;min-width:0;padding:9px 12px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;text-align:left}\n.dta-wsSpecCard:hover{background:var(--dsw-alias-bg-layer-2)}\n.dta-wsSpecCard:disabled{opacity:.6;cursor:default}\n.dta-wsSpecCardName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}\n.dta-wsSpecCardSize{color:var(--dsw-alias-label-secondary);font-size:11.5px}\n.dta-wsSpecCardChevron{color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1}\n.dta-wsSpecSkipped{margin-top:8px}\n.dta-wsSpecSkip{margin:0;color:var(--dsw-alias-label-secondary);font-size:11.5px}\n.dta-wsSpecCreate{display:flex;align-items:center;gap:8px;margin-bottom:10px}\n.dta-wsSpecInput{flex:1;min-width:0;box-sizing:border-box;height:28px;padding:0 8px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-sm,6px);background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-primary);font:inherit;font-size:12.5px;outline:none}\n.dta-wsSpecEditor{display:flex;flex-direction:column;gap:10px}\n.dta-wsSpecEditorHead{display:flex;align-items:center;gap:8px}\n.dta-wsSpecEditorName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;color:var(--dsw-alias-label-primary)}\n.dta-wsSpecHeadActions{display:flex;gap:8px}\n.dta-wsSpecText{width:100%;box-sizing:border-box;min-width:0;min-height:340px;resize:vertical;padding:10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:color-mix(in srgb,var(--dsw-alias-label-primary) 7%,transparent);color:var(--dsw-alias-label-primary);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.6;outline:none}\n.dta-wsBatchInfo{color:var(--dsw-alias-label-secondary);font-size:12.5px}\n.dta-wsEmpty{margin:0;color:var(--dsw-alias-label-secondary);font-size:12.5px}\n.dta-wsList{list-style:none;display:flex;flex-direction:column;gap:2px;margin:0;padding:6px;border:1px solid var(--dsw-alias-border-secondary,rgba(127,127,127,.25));border-radius:var(--dsw-radius-md,8px)}\n.dta-wsDir{padding-left:calc(6px + var(--dta-depth,0)*16px)}\n.dta-wsDirToggle{display:flex;align-items:center;gap:6px;width:100%;padding:5px 8px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12.5px;text-align:left;cursor:pointer}\n.dta-wsDirToggle:hover{background:var(--dsw-alias-bg-layer-1)}\n.dta-wsChevron{flex:none;transform:rotate(90deg);transition:transform .15s ease;color:var(--dsw-alias-label-secondary)}\n.dta-wsChevron[data-collapsed="true"]{transform:rotate(0deg)}\n.dta-wsDirIcon{flex:none;color:var(--dsw-alias-brand-primary)}\n.dta-wsDirName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}\n.dta-wsDirCount{flex:none;color:var(--dsw-alias-label-secondary);font-size:11px}\n.dta-wsRow{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);padding-left:calc(10px + var(--dta-depth,0)*16px)}\n.dta-wsRow:hover{background:var(--dsw-alias-bg-layer-1)}\n.dta-wsFileIcon{flex:none;color:var(--dsw-alias-label-secondary)}\n.dta-wsName{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}\n.dta-wsName:hover{color:var(--dsw-alias-brand-primary)}\n.dta-wsSize{flex:none;color:var(--dsw-alias-label-secondary);font-size:11.5px}\n.dta-wsRowActions{display:flex;gap:6px;flex:none}\n.dta-wsBanner{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 10px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 25%,transparent);border-radius:var(--dsw-radius-md,8px);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);font-size:12.5px}\n.dta-wsBannerTag{flex:none;padding:1px 8px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:11px}\n.dta-wsBannerName{font-weight:600}\n.dta-wsBannerPath{color:var(--dsw-alias-label-secondary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dta-wsBannerSpec{display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden}\n.dta-wsBannerSpecDivider{flex:none;width:1px;height:14px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 25%,transparent)}\n.dta-wsBannerSpecLabel{flex:none;padding:1px 7px;border-radius:999px;background:var(--dsw-alias-brand-primary);color:#fff;font-size:10.5px;font-weight:600;letter-spacing:.5px}\n.dta-wsBannerSpecChip{flex:none;max-width:140px;padding:1px 8px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);color:var(--dsw-alias-label-primary);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n.dta-wsBannerActions{margin-left:auto;display:flex;gap:6px;flex:none}\n.dta-wsBtn[data-active="true"]{color:var(--dsw-alias-brand-primary)}\n.dta-list{display:flex;flex-direction:column;gap:12px}\n.dta-seg{display:flex;flex-direction:column;gap:10px;padding:14px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg,10px);background:var(--dsw-alias-bg-layer-1)}\n.dta-segHead{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.dta-segIndex{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:20px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:11.5px;font-variant-numeric:tabular-nums}\n.dta-segActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-left:auto}\n.dta-scoreBadge{display:inline-flex;align-items:center;height:20px;padding:0 8px;border-radius:999px;font-size:11.5px;font-variant-numeric:tabular-nums;white-space:nowrap}\n.dta-scoreBadge[data-tone="good"]{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 12%,transparent)}\n.dta-scoreBadge[data-tone="ok"]{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent)}\n.dta-scoreBadge[data-tone="bad"]{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 12%,transparent)}\n.dta-columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch}\n.dta-col{display:flex;flex-direction:column;gap:6px;min-width:0}\n.dta-colHead{display:flex;flex:none;align-items:center;gap:8px;min-height:16px;color:var(--dsw-alias-label-secondary);font-size:11.5px;line-height:16px}\n.dta-colHint{color:var(--dsw-alias-label-secondary);opacity:.7;font-size:11px;white-space:nowrap}\n.dta-sourceText{box-sizing:border-box;flex:1 1 auto;margin:0;padding:9px 10px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.7}\n.dta-translationText{box-sizing:border-box;flex:1 1 auto;width:100%;min-height:86px;padding:9px 10px;field-sizing:content;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.7;outline:none}\n.dta-translationText:focus{border-color:var(--dsw-alias-brand-primary)}\n.dta-promptBox{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px;border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2)}\n.dta-promptCount{color:var(--dsw-alias-label-secondary);opacity:.75;font-size:11px;line-height:16px;white-space:nowrap;font-variant-numeric:tabular-nums}\n.dta-error{margin:0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}\n.dta-scoreLine{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0;padding-top:8px;border-top:.5px dashed var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}\n.dta-scoreText{flex:0 1 auto;min-width:0}\n.dta-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}\n.dta-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-brand-primary);animation:dta-pulse 1s ease-in-out infinite}\n.dta-page button:focus-visible,.dta-page select:focus-visible,.dta-page textarea:focus-visible,.dta-page input:focus-visible{outline:var(--dsw-focus-ring-width,2px) solid var(--dsw-focus-ring-color,var(--dsw-alias-brand-primary));outline-offset:1px}\n.dta-fullText{box-sizing:border-box;width:100%;min-height:340px;padding:14px;resize:vertical;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:1.8;outline:none}\n.dta-fullText:focus{border-color:var(--dsw-alias-brand-primary)}\n.dta-fullSource{box-sizing:border-box;flex:1 1 auto;width:100%;min-height:340px;margin:0;padding:14px;border:.5px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-md,8px);background:var(--dsw-alias-bg-layer-2);white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.8}\n.dta-fullText--pane{flex:1 1 auto}\n@keyframes dta-pulse{0%,100%{opacity:.35}50%{opacity:1}}\n@keyframes dta-slide{from{opacity:.5;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}\n@keyframes dta-fade{from{opacity:0}to{opacity:1}}\n@media (max-width:760px){.dta-columns{grid-template-columns:1fr}}\n@media (prefers-reduced-motion:reduce){.dta-dot{animation:none}.dta-drawer,.dta-drawerMask{animation:none}}\n';

// src/client/core/utils.ts
function cx(...values) {
  return values.filter(Boolean).join(" ");
}
function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
function writeStorage(key, value) {
  try {
    if (value === null || value === void 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
async function requestJson(action, payload, options = {}) {
  const signal = options && options.signal;
  let response;
  try {
    response = await fetch(`${API}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      ...signal ? { signal } : {}
    });
  } catch (error) {
    if (signal && signal.aborted || error && error.name === "AbortError") throw abortedError();
    const network = new Error("network");
    network.code = "NETWORK";
    throw network;
  }
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data && typeof data.error === "string" ? data.error : `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    if (data && typeof data.code === "string") error.code = data.code;
    throw error;
  }
  if (!data || typeof data !== "object") throw new Error("invalid-response");
  return data;
}
function localError(message) {
  const error = new Error(message);
  error.code = "LOCAL";
  return error;
}
function abortedError() {
  const error = new Error("aborted");
  error.code = "ABORTED";
  return error;
}
function describeError(error, t) {
  if (!error) return t("requestFailed");
  if (error.code === "LOCAL") return error.message;
  if (error.code === "NETWORK") return t("networkError");
  const status = Number(error.status);
  if (status === 400) return t("invalidRequest");
  if (status === 413) return t("tooLarge");
  if (status === 415) return t("imageTypeError");
  if (status === 422) return t("noVision");
  if (status === 503) return t("noModelAvailable");
  if (status === 502) return t("engineFailed");
  if (Number.isFinite(status) && status > 0) return t("requestRejected");
  if (typeof error.message === "string" && /[\u3400-\u9fff]/.test(error.message)) return error.message;
  return t("requestFailed");
}
function format(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (whole, name) => Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole);
}
async function mapLimit(items, limit, worker) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  let cursor = 0;
  const width = Math.max(1, Math.min(limit, list.length || 1));
  await Promise.all(Array.from({ length: width }, async () => {
    for (; ; ) {
      const index = cursor;
      cursor += 1;
      if (index >= list.length) return;
      results[index] = await worker(list[index], index);
    }
  }));
  return results;
}
function scoreTone(value) {
  if (value >= 85) return "good";
  if (value >= 70) return "ok";
  return "bad";
}
function rowsFor(text) {
  const length = String(text || "").length;
  return Math.min(14, Math.max(2, Math.ceil(length / 40) + 1));
}

// src/client/core/document.ts
function splitParagraphs(text) {
  const normalized = String(text).replace(/\r\n?/g, "\n");
  const parts = normalized.split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1 || !normalized.includes("\n")) return parts;
  const lines = normalized.split("\n").map((part) => part.trim()).filter(Boolean);
  return lines.length > 1 ? lines : parts;
}
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
function splitSentences(text) {
  const normalized = String(text).replace(/\r\n?/g, "\n").trim();
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
function normalizeDoc(value) {
  if (!value || typeof value !== "object") return null;
  const mapItems = (items, prefix) => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => item && typeof item.source === "string").map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `${prefix}${index}`,
      source: item.source,
      translation: typeof item.translation === "string" ? item.translation : "",
      score: item.score && Number.isFinite(Number(item.score.value)) ? {
        value: Math.round(Number(item.score.value)),
        comment: typeof item.score.comment === "string" ? item.score.comment : ""
      } : null
    }));
  };
  const doc = {
    sourceText: typeof value.sourceText === "string" ? value.sourceText : "",
    // Only set when the text came from an imported file; drives the
    // download name and is harmless for typed or OCR'd documents.
    fileName: typeof value.fileName === "string" ? value.fileName : "",
    sourceLanguage: typeof value.sourceLanguage === "string" ? value.sourceLanguage : "auto",
    targetLanguage: typeof value.targetLanguage === "string" ? value.targetLanguage : "\u4E2D\u6587",
    documentScore: value.documentScore && Number.isFinite(Number(value.documentScore.value)) ? {
      value: Math.round(Number(value.documentScore.value)),
      comment: typeof value.documentScore.comment === "string" ? value.documentScore.comment : ""
    } : null,
    sentences: mapItems(value.sentences, "s"),
    paragraphs: mapItems(value.paragraphs, "p")
  };
  if (!doc.sourceText && doc.sentences.length === 0 && doc.paragraphs.length === 0) return null;
  return doc;
}
function buildFullTranslation(doc) {
  if (!doc) return "";
  const source = doc.paragraphs.some((item) => item.translation.trim()) ? doc.paragraphs : doc.sentences;
  return source.map((item) => item.translation.trim()).filter(Boolean).join("\n\n");
}
function groupSentencesByParagraph(doc) {
  const paragraphs = doc.paragraphs || [];
  const groups = paragraphs.map(() => []);
  let cursor = 0;
  const locate = (text, from) => {
    for (let index = from; index < paragraphs.length; index += 1) {
      if (String(paragraphs[index].source || "").includes(text)) return index;
    }
    return -1;
  };
  (doc.sentences || []).forEach((sentence) => {
    const text = String(sentence.source || "").trim();
    if (!text) return;
    let index = locate(text, cursor);
    if (index < 0) index = locate(text, 0);
    if (index < 0) return;
    cursor = index;
    groups[index].push(sentence);
  });
  return groups;
}
var CJK_EDGE = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]/;
function joinSentenceTranslations(list) {
  let out = "";
  list.forEach((value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (!out) {
      out = text;
      return;
    }
    const needsSpace = !CJK_EDGE.test(out.slice(-1)) && !CJK_EDGE.test(text.slice(0, 1));
    out += `${needsSpace ? " " : ""}${text}`;
  });
  return out;
}
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
function splitTranslationPieces(text, count) {
  const source = String(text || "").trim();
  if (count <= 0) return [];
  if (!source) return new Array(count).fill("");
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
  while (pieces.length < count) pieces.push("");
  return pieces.slice(0, count);
}
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
var CLAUSE_BREAK = /[，,；;、：:]/;
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
    if ((text[index - 1] === " " || text[index] === " ") && closer(index)) best = index;
  }
  return best;
}
function syncParagraphToSentences(doc, paragraphId) {
  if (!doc || !doc.paragraphs?.length || !doc.sentences?.length) return doc;
  const index = doc.paragraphs.findIndex((item) => item.id === paragraphId);
  if (index < 0) return doc;
  const group = groupSentencesByParagraph(doc)[index];
  if (!group.length) return doc;
  const paragraph = doc.paragraphs[index];
  const pieces = splitTranslationPieces(paragraph.translation, group.length);
  const byId = new Map(group.map((item, order) => [item.id, pieces[order] ?? ""]));
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
function splitTranslationBlocks(text) {
  return String(text ?? "").replace(/\r\n?/g, "\n").split(/\n\s*\n+/).map((part) => part.trim()).filter(Boolean);
}
function applyFullTranslationEdit(doc, text) {
  if (!doc) return doc;
  const key = doc.paragraphs.some((item) => item.translation.trim()) ? "paragraphs" : "sentences";
  const items = doc[key];
  const blocks = splitTranslationBlocks(text);
  const prefix = key === "paragraphs" ? "pn" : "sn";
  const next = items.map((item, index) => {
    const translation = index < blocks.length ? blocks[index] : "";
    if (translation === item.translation) return item;
    return { ...item, translation, score: null };
  });
  for (let index = items.length; index < blocks.length; index += 1) {
    next.push({ id: `${prefix}${index}`, source: "", translation: blocks[index], score: null });
  }
  const changed = next.length !== items.length || next.some((item, index) => item !== items[index]);
  if (!changed) return doc;
  const updated = { ...doc, documentScore: null, [key]: next };
  if (key !== "paragraphs") return updated;
  return next.reduce((current, item, index) => items[index] === item ? current : syncParagraphToSentences(current, item.id), updated);
}

// src/client/core/history.ts
var React = __toESM(require("react"), 1);
var h = React.createElement;
function newEntryId() {
  return `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
function makeEntry(doc, now = Date.now()) {
  return {
    id: newEntryId(),
    createdAt: now,
    updatedAt: now,
    pinned: false,
    doc,
    // The machine translation itself is the baseline a document can always
    // be rolled back to.
    versions: [makeVersion(doc, "initial", now)]
  };
}
function sortEntries(entries) {
  return [...entries].sort((left, right) => {
    const pinned = (right.pinned ? 1 : 0) - (left.pinned ? 1 : 0);
    return pinned !== 0 ? pinned : right.updatedAt - left.updatedAt;
  });
}
function normalizeEntry(value) {
  if (!value || typeof value !== "object") return null;
  const doc = normalizeDoc(value.doc);
  if (!doc) return null;
  const createdAt = Number.isFinite(Number(value.createdAt)) ? Number(value.createdAt) : Date.now();
  return {
    id: typeof value.id === "string" && value.id ? value.id : newEntryId(),
    createdAt,
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : createdAt,
    pinned: value.pinned === true,
    doc,
    // Entries saved before revisions existed simply start with none.
    versions: Array.isArray(value.versions) ? trimVersions(value.versions.map(normalizeVersion).filter(Boolean)) : []
  };
}
function readHistory() {
  const stored = readStorage(HISTORY_STORAGE, null);
  if (!Array.isArray(stored)) return [];
  return trimHistory(stored.map(normalizeEntry).filter(Boolean));
}
function docSize(doc) {
  if (!doc) return 0;
  let size = String(doc.sourceText || "").length;
  for (const item of doc.sentences) size += item.source.length + item.translation.length;
  for (const item of doc.paragraphs) size += item.source.length + item.translation.length;
  return size;
}
function trimHistory(entries, keepId = null) {
  const ordered = sortEntries(entries);
  const kept = [];
  let used = 0;
  const protectedEntry = keepId ? ordered.find((entry) => entry.id === keepId) : null;
  if (protectedEntry) {
    kept.push(protectedEntry);
    used = docSize(protectedEntry.doc) + versionsSize(protectedEntry.versions);
  }
  for (const entry of ordered) {
    if (protectedEntry && entry === protectedEntry) continue;
    if (kept.length >= MAX_HISTORY_ENTRIES) break;
    const size = docSize(entry.doc) + versionsSize(entry.versions);
    if (kept.length > 0 && used + size > MAX_HISTORY_CHARS) break;
    kept.push(entry);
    used += size;
  }
  return kept;
}
function newVersionId() {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
function makeVersion(doc, kind = "manual", now = Date.now()) {
  return {
    id: newVersionId(),
    at: now,
    kind: VERSION_KINDS.includes(kind) ? kind : "manual",
    doc: {
      ...doc,
      sentences: [...doc.sentences || []],
      paragraphs: [...doc.paragraphs || []]
    }
  };
}
function normalizeVersion(value) {
  if (!value || typeof value !== "object") return null;
  const doc = normalizeDoc(value.doc);
  if (!doc) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : newVersionId(),
    at: Number.isFinite(Number(value.at)) ? Number(value.at) : Date.now(),
    kind: VERSION_KINDS.includes(value.kind) ? value.kind : "manual",
    doc
  };
}
function versionsSize(versions) {
  if (!Array.isArray(versions)) return 0;
  return versions.reduce((total, version) => total + docSize(version.doc), 0);
}
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
function versionDiffCount(left, right) {
  if (!left || !right) return 0;
  const key = right.paragraphs.some((item) => item.translation.trim()) ? "paragraphs" : "sentences";
  const before = new Map((left[key] || []).map((item) => [item.id, item.translation.trim()]));
  const after = new Map((right[key] || []).map((item) => [item.id, item.translation.trim()]));
  let count = 0;
  for (const id of /* @__PURE__ */ new Set([...before.keys(), ...after.keys()])) {
    if ((before.get(id) || "") !== (after.get(id) || "")) count += 1;
  }
  return count;
}
function addVersion(versions, version) {
  const list = Array.isArray(versions) ? versions : [];
  const newest = list[0];
  if (newest && versionDiffCount(newest.doc, version.doc) === 0) {
    return [{ ...newest, at: version.at }, ...list.slice(1)];
  }
  return trimVersions([version, ...list]);
}
function versionLabel(kind, t) {
  const key = `versionLabel${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
  return t(key);
}
function translationHead(doc, max = 96) {
  if (!doc) return "";
  const collection = doc.paragraphs.some((item) => item.translation.trim()) ? doc.paragraphs : doc.sentences;
  const text = collection.map((item) => item.translation.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}\u2026` : text;
}
function pad2(value) {
  return String(value).padStart(2, "0");
}
function historySearchText(entry) {
  const doc = entry.doc;
  const translated = doc.paragraphs.some((item) => item.translation.trim()) ? doc.paragraphs : doc.sentences;
  const sources = doc.sourceText || [...doc.paragraphs, ...doc.sentences].map((item) => item.source).join("\n");
  const translations = translated.map((item) => item.translation).filter(Boolean).join("\n");
  return [sources, translations].filter(Boolean).join("\n");
}
function snippetAround(text, lower, keywords, before = 18, after = 90) {
  const hits = [];
  for (const word of keywords) {
    const at = lower.indexOf(word);
    if (at >= 0) hits.push({ at, length: word.length });
  }
  if (hits.length === 0) return null;
  let best = hits[0];
  let bestScore = -1;
  for (const hit of hits) {
    const start2 = Math.max(0, hit.at - before);
    const end2 = Math.min(text.length, hit.at + hit.length + after);
    const score = hits.filter((other) => other.at >= start2 && other.at < end2).length;
    if (score > bestScore) {
      best = hit;
      bestScore = score;
    }
  }
  const start = Math.max(0, best.at - before);
  const end = Math.min(text.length, best.at + best.length + after);
  const body = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (!body) return null;
  return `${start > 0 ? "\u2026" : ""}${body}${end < text.length ? "\u2026" : ""}`;
}
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
    parts.push(h("mark", { className: "dta-hl", key: `${start}-${end}` }, text.slice(start, end)));
    cursor = end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}
function searchKeywords(query) {
  return String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
}
function formatStamp(value, t) {
  const time = Number(value);
  if (!Number.isFinite(time)) return "";
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return "";
  const now = /* @__PURE__ */ new Date();
  const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  if (sameDay) return clock;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const isYesterday = date.getFullYear() === yesterday.getFullYear() && date.getMonth() === yesterday.getMonth() && date.getDate() === yesterday.getDate();
  if (isYesterday) return `${t("yesterday")} ${clock}`;
  const day = `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${clock}`;
  return date.getFullYear() === now.getFullYear() ? day : `${date.getFullYear()}-${day}`;
}
function entryTitle(doc, t) {
  const source = doc && typeof doc.sourceText === "string" ? doc.sourceText : "";
  const first = source.split("\n").map((line) => line.trim()).filter(Boolean)[0] || "";
  const head = first.replace(/\s+/g, " ");
  if (!head) return t("untitled");
  return head.length > 80 ? `${head.slice(0, 80)}\u2026` : head;
}

// src/client/core/files.ts
function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 32768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
var DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
var MAX_IMPORT_BYTES = 8 * 1024 * 1024;
var TEXT_FILE_EXTENSIONS = ["txt", "text", "md", "markdown", "log"];
var HTML_FILE_EXTENSIONS = ["html", "htm", "xhtml"];
var HTML_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  ldquo: "\u201C",
  rdquo: "\u201D",
  lsquo: "\u2018",
  rsquo: "\u2019",
  laquo: "\xAB",
  raquo: "\xBB",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  times: "\xD7",
  divide: "\xF7",
  middot: "\xB7",
  bull: "\u2022",
  deg: "\xB0",
  shy: "",
  zwj: "",
  zwnj: ""
};
function fileExtension(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || ""));
  return match ? match[1].toLowerCase() : "";
}
function decodeXmlEntities(text) {
  const codePoint = (raw, radix, fallback) => {
    const value = Number.parseInt(raw, radix);
    if (!Number.isFinite(value) || value <= 0 || value > 1114111) return fallback;
    return String.fromCodePoint(value);
  };
  return String(text).replace(/&#x([0-9a-f]+);|&#(\d+);|&([a-z][a-z0-9]*);/gi, (whole, hex, decimal, name) => {
    if (hex !== void 0) return codePoint(hex, 16, whole);
    if (decimal !== void 0) return codePoint(decimal, 10, whole);
    const key = String(name).toLowerCase();
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, key) ? HTML_ENTITIES[key] : whole;
  });
}
function docxXmlToText(xml) {
  const text = String(xml || "").replace(/<w:tab\b[^>]*\/?>/g, "	").replace(/<w:br\b[^>]*\/?>/g, "\n").replace(/<w:cr\b[^>]*\/?>/g, "\n").replace(/<\/w:tc>/g, "	").replace(/<\/w:p>/g, "\n\n").replace(/<[^>]*>/g, "");
  return decodeXmlEntities(text);
}
function htmlToText(html) {
  const source = String(html || "").replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|template|svg|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ").replace(/<br\b[^>]*\/?>/gi, "\n").replace(/<\/(p|div|section|article|header|footer|main|aside|nav|figure|figcaption|blockquote|pre|h[1-6]|li|tr|table|ul|ol|dl|dd|dt)\s*>/gi, "\n\n").replace(/<\/(td|th)\s*>/gi, "	").replace(/<[^>]*>/g, "");
  return decodeXmlEntities(source);
}
function isHtmlImport(file) {
  if (HTML_FILE_EXTENSIONS.includes(fileExtension(file && file.name))) return true;
  return String(file && file.type || "").toLowerCase() === "text/html";
}
function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");
}
function findZipEntry(bytes, wanted) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 22) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65558); at -= 1) {
    if (view.getUint32(at, true) === 101010256) {
      eocd = at;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 33639248) return null;
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = new TextDecoder("utf-8").decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (name === wanted) {
      if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 67324752) return null;
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
async function inflateRaw(data) {
  if (typeof DecompressionStream !== "function") {
    const error = new Error("deflate-raw is unavailable");
    error.code = "DOCX_UNSUPPORTED";
    throw error;
  }
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function readDocxText(buffer) {
  const entry = findZipEntry(new Uint8Array(buffer), "word/document.xml");
  if (!entry) {
    const error = new Error("word/document.xml is missing");
    error.code = "DOCX_INVALID";
    throw error;
  }
  let xml;
  if (entry.method === 0) xml = entry.data;
  else if (entry.method === 8) xml = await inflateRaw(entry.data);
  else {
    const error = new Error(`unsupported zip method ${entry.method}`);
    error.code = "DOCX_UNSUPPORTED";
    throw error;
  }
  return docxXmlToText(new TextDecoder("utf-8").decode(xml));
}
function normalizeImportedText(raw) {
  return String(raw ?? "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
function decodeBase64Bytes(base64) {
  const binary = atob(String(base64 ?? ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}
function isTextImport(file) {
  if (TEXT_FILE_EXTENSIONS.includes(fileExtension(file && file.name))) return true;
  if (isHtmlImport(file)) return true;
  const type = String(file && file.type || "");
  return type.startsWith("text/") || type === "application/json";
}
async function extractImportText(file) {
  const extension = fileExtension(file && file.name);
  if (extension === "doc" || file && file.type === "application/msword") {
    const error = new Error("legacy .doc is unsupported");
    error.code = "FILE_LEGACY_DOC";
    throw error;
  }
  if (extension === "docx" || file && file.type === DOCX_MIME) {
    return normalizeImportedText(await readDocxText(await file.arrayBuffer()));
  }
  if (isHtmlImport(file)) return normalizeImportedText(htmlToText(await file.text()));
  return normalizeImportedText(await file.text());
}
function exportParagraphs(doc) {
  const paragraphs = doc && Array.isArray(doc.paragraphs) ? doc.paragraphs : [];
  const usable = paragraphs.some((item) => item.translation.trim()) ? paragraphs : doc && Array.isArray(doc.sentences) ? doc.sentences : [];
  return usable.map((item) => item.translation.trim()).filter(Boolean);
}
function buildHtmlExport(doc, name) {
  const title = name.replace(/\.[a-z0-9]+$/i, "");
  const lines = [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    `<title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>"
  ];
  for (const text of exportParagraphs(doc)) lines.push(`<p>${escapeHtml(text)}</p>`);
  lines.push("</body>", "</html>", "");
  return lines.join("\n");
}
function downloadFileName(doc) {
  const original = doc && typeof doc.fileName === "string" ? doc.fileName : "";
  const base = original.replace(/\.[^./\\]+$/, "").replace(/[\\/:*?"<>|\r\n\t]+/g, "-").replace(/\s+/g, " ").trim();
  const extension = /\.(md|markdown)$/i.test(original) ? "md" : /\.(html?|xhtml)$/i.test(original) ? "html" : "txt";
  const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  return `${(base || `translation-${stamp}`).slice(0, 80)}.${extension}`;
}

// src/client/core/workspace.ts
function readWsSettings(value) {
  const raw = value && typeof value === "object" ? value : {};
  return {
    output: raw.output === "suffix" || raw.output === "overwrite" || raw.output === "preview" ? raw.output : "subfolder",
    suffix: typeof raw.suffix === "string" && raw.suffix.trim() ? raw.suffix.trim().replace(/^[.\\/]+/, "").replace(/[\\/]/g, "") : "zh",
    autoSave: raw.autoSave === true,
    // Guidelines attach by default; the user can switch them off per install.
    useSpec: raw.useSpec !== false
  };
}
function wsFormatSize(bytes) {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size < 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
function buildWsTree(files) {
  const root = { dirs: /* @__PURE__ */ new Map(), files: [] };
  for (const entry of files) {
    const parts = String(entry.relPath).split("/");
    let node = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const seg = parts[i];
      if (!node.dirs.has(seg)) node.dirs.set(seg, { dirs: /* @__PURE__ */ new Map(), files: [] });
      node = node.dirs.get(seg);
    }
    node.files.push(entry);
  }
  const walk = (node, prefix) => {
    const children = [];
    for (const [name, child] of [...node.dirs].sort((a, b) => a[0].localeCompare(b[0]))) {
      const path = prefix ? `${prefix}/${name}` : name;
      const nested = walk(child, path);
      children.push({
        kind: "dir",
        name,
        path,
        count: nested.reduce((sum, item) => sum + (item.kind === "dir" ? item.count : 1), 0),
        children: nested
      });
    }
    for (const entry of node.files.slice().sort((a, b) => a.relPath.localeCompare(b.relPath))) {
      children.push({ kind: "file", name: entry.relPath.split("/").pop(), entry });
    }
    return children;
  };
  return walk(root, "");
}
function sameRoute(left, right) {
  return Boolean(left && right && left.provider === right.provider && left.model === right.model);
}
function routeId(entry) {
  return `${entry.provider}/${entry.model}`;
}
function storedRoutePreference(value) {
  if (!value || typeof value !== "object") return null;
  const provider = typeof value.provider === "string" ? value.provider.trim() : "";
  const model = typeof value.model === "string" ? value.model.trim() : "";
  return provider && model ? { provider, model } : null;
}

// src/client/components.tsx
var React2 = __toESM(require("react"), 1);
var h2 = React2.createElement;
function BusyDot() {
  return h2("span", { className: "dta-dot", "aria-hidden": true });
}
function LanguageSelect(props) {
  const { label, value, onChange, includeAuto, t } = props;
  return h2(
    "label",
    { className: "dta-field" },
    h2("span", { className: "dta-fieldLabel" }, label),
    h2(
      "select",
      { className: "dta-select", value, onChange: (event) => onChange(event.target.value) },
      includeAuto ? h2("option", { value: "auto" }, t("autoDetect")) : null,
      LANGUAGES.map((language) => h2("option", { key: language, value: language }, language))
    )
  );
}
function TranslationPanelIcon(props) {
  const size = typeof props.size === "number" ? props.size : 18;
  return h2(
    "svg",
    {
      viewBox: "0 0 24 24",
      width: size,
      height: size,
      fill: "none",
      "aria-hidden": true,
      style: { display: "block" }
    },
    h2("path", {
      d: "M3.5 5.5h8M7.5 3.2v2.3c0 3.6-2.1 6.5-4.7 7.9",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }),
    h2("path", {
      d: "M5.4 9.3c1 2.2 2.7 3.9 4.9 4.9",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }),
    h2("path", {
      d: "M12.6 20.2 16 11.4h1.5l3.4 8.8",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }),
    h2("path", {
      d: "M14.2 16.9h5.1",
      stroke: "currentColor",
      strokeWidth: 1.6,
      strokeLinecap: "round"
    })
  );
}

// src/client/page/TranslationPage.ts
var h3 = React3.createElement;
function TranslationPage(props) {
  const t = typeof props.t === "function" ? props.t : (key) => key;
  const bootstrap = React3.useMemo(() => {
    const storedPrefs = readStorage(PREFS_STORAGE, {}) || {};
    const storedSession = readStorage(SESSION_STORAGE, {}) || {};
    let history2 = readHistory();
    if (history2.length === 0) {
      const legacyDoc = normalizeDoc(readStorage(DOC_STORAGE, null));
      if (legacyDoc) history2 = [makeEntry(legacyDoc)];
    }
    const wanted = typeof storedSession.currentId === "string" ? storedSession.currentId : null;
    const latest = history2.reduce((best, entry) => !best || entry.updatedAt > best.updatedAt ? entry : best, null);
    const current = history2.find((entry) => entry.id === wanted) || latest;
    return {
      history: history2,
      currentId: current ? current.id : null,
      doc: current ? current.doc : null,
      prefs: {
        sourceLanguage: typeof storedPrefs.sourceLanguage === "string" ? storedPrefs.sourceLanguage : "auto",
        targetLanguage: typeof storedPrefs.targetLanguage === "string" ? storedPrefs.targetLanguage : "\u4E2D\u6587",
        view: storedPrefs.view === "sentences" || storedPrefs.view === "full" ? storedPrefs.view : "paragraphs",
        // The full-text card opens on the translation, like the viewer expects.
        fullMode: storedPrefs.fullMode === "source" || storedPrefs.fullMode === "both" ? storedPrefs.fullMode : "translation",
        route: storedRoutePreference(storedPrefs.route),
        // How the source goes to the model. Sessions that predate the
        // three-way switch only stored the wholeDoc boolean: false meant
        // batched, anything else whole-document.
        transMode: TRANS_MODES.includes(storedPrefs.transMode) ? storedPrefs.transMode : storedPrefs.wholeDoc === false ? "batch" : "whole",
        wsRoot: typeof storedPrefs.wsRoot === "string" ? storedPrefs.wsRoot : "",
        wsWorkspaceId: typeof storedPrefs.wsWorkspaceId === "string" ? storedPrefs.wsWorkspaceId : "",
        wsSettings: readWsSettings(storedPrefs.wsSettings)
      }
    };
  }, []);
  const [doc, setDoc] = React3.useState(bootstrap.doc);
  const [draft, setDraft] = React3.useState(bootstrap.doc ? bootstrap.doc.sourceText : "");
  const [sourceLanguage, setSourceLanguage] = React3.useState(bootstrap.doc ? bootstrap.doc.sourceLanguage : bootstrap.prefs.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = React3.useState(bootstrap.doc ? bootstrap.doc.targetLanguage : bootstrap.prefs.targetLanguage);
  const [view, setView] = React3.useState(bootstrap.prefs.view);
  const [fullMode, setFullMode] = React3.useState(bootstrap.prefs.fullMode);
  const [transMode, setTransModeState] = React3.useState(bootstrap.prefs.transMode);
  const [history, setHistory] = React3.useState(bootstrap.history);
  const [currentId, setCurrentId] = React3.useState(bootstrap.currentId);
  const [historyOpen, setHistoryOpen] = React3.useState(false);
  const [versionsOpen, setVersionsOpen] = React3.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React3.useState(null);
  const [confirmDeleteVersion, setConfirmDeleteVersion] = React3.useState(null);
  const [historyQuery, setHistoryQuery] = React3.useState("");
  const [showScores, setShowScores] = React3.useState(false);
  const [status, setStatus] = React3.useState(null);
  const [busy, setBusy] = React3.useState({});
  const abortRef = React3.useRef(null);
  const segmentAborts = React3.useRef(/* @__PURE__ */ new Map());
  const [errors, setErrors] = React3.useState({});
  const [promptFor, setPromptFor] = React3.useState(null);
  const [promptText, setPromptText] = React3.useState("");
  const [notice, setNotice] = React3.useState(null);
  React3.useEffect(() => {
    if (!notice) return void 0;
    const duration = notice.kind === "success" ? 3e3 : notice.kind === "error" ? 7e3 : 5e3;
    const timer = setTimeout(() => setNotice(null), duration);
    return () => clearTimeout(timer);
  }, [notice]);
  const [modeHelpOpen, setModeHelpOpen] = React3.useState(false);
  const [engineModel, setEngineModel] = React3.useState(null);
  const [engineState, setEngineState] = React3.useState("unknown");
  const [routes, setRoutes] = React3.useState([]);
  const [route, setRoute] = React3.useState(bootstrap.prefs.route);
  const [defaultModel, setDefaultModel] = React3.useState(null);
  const [modelFailures, setModelFailures] = React3.useState([]);
  const [copied, setCopied] = React3.useState(null);
  const [fullScoreBusy, setFullScoreBusy] = React3.useState(false);
  const [fileName, setFileName] = React3.useState(bootstrap.doc ? bootstrap.doc.fileName : "");
  const [wsOpen, setWsOpen] = React3.useState(false);
  const [wsRoot, setWsRoot] = React3.useState(bootstrap.prefs.wsRoot);
  const [wsRootDraft, setWsRootDraft] = React3.useState(bootstrap.prefs.wsRoot);
  const [wsRegistry, setWsRegistry] = React3.useState(null);
  const [wsWorkspaceId, setWsWorkspaceId] = React3.useState(bootstrap.prefs.wsWorkspaceId);
  const [wsManualOpen, setWsManualOpen] = React3.useState(false);
  const [wsFiles, setWsFiles] = React3.useState([]);
  const [wsSettings, setWsSettings] = React3.useState(bootstrap.prefs.wsSettings);
  const [wsStatuses, setWsStatuses] = React3.useState(() => {
    const stored = readStorage(WORKSPACE_STORAGE, null);
    return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  });
  const [wsBatch, setWsBatch] = React3.useState(null);
  const [wsCollapsed, setWsCollapsed] = React3.useState({});
  const [wsTarget, setWsTarget] = React3.useState(null);
  const [wsTranslatingName, setWsTranslatingName] = React3.useState("");
  const [wsSpec, setWsSpec] = React3.useState(null);
  const [wsSpecEditor, setWsSpecEditor] = React3.useState(null);
  const [wsSpecCreating, setWsSpecCreating] = React3.useState(false);
  const [wsSpecDraftName, setWsSpecDraftName] = React3.useState("");
  const [wsSpecConfirm, setWsSpecConfirm] = React3.useState("");
  const [wsSpecOpen, setWsSpecOpen] = React3.useState(false);
  const specRef = React3.useRef("");
  const wsBatchRef = React3.useRef(null);
  const wsSaveTimer = React3.useRef(null);
  const landedDocRef = React3.useRef(null);
  const passAbortedRef = React3.useRef(false);
  const copyTimer = React3.useRef(null);
  const fileInputRef = React3.useRef(null);
  const docInputRef = React3.useRef(null);
  const historySearchRef = React3.useRef(null);
  const skipSync = React3.useRef(bootstrap.currentId);
  React3.useEffect(() => {
    let cancelled = false;
    fetch(`${API}/health`, { headers: { accept: "application/json" } }).then((response) => response.ok ? response.json() : Promise.reject(new Error("unavailable"))).then((data) => {
      if (cancelled) return;
      const fallback = data && data.default && typeof data.default.provider === "string" && typeof data.default.model === "string" ? `${data.default.provider}/${data.default.model}` : null;
      const model = typeof (data && data.model) === "string" ? data.model : null;
      setEngineModel(model);
      setDefaultModel(fallback || model);
      setEngineState(model || fallback ? "ok" : "unknown");
      const list = Array.isArray(data && data.models) ? data.models.filter((entry) => entry && typeof entry.provider === "string" && typeof entry.model === "string").map((entry) => ({
        provider: entry.provider,
        model: entry.model,
        ...typeof entry.label === "string" && entry.label ? { label: entry.label } : {},
        ...typeof entry.providerLabel === "string" && entry.providerLabel ? { providerLabel: entry.providerLabel } : {}
      })) : [];
      setRoutes(list);
      const failed = Array.isArray(data && data.modelFailures) ? data.modelFailures.filter((item) => item && typeof item.provider === "string").map((item) => ({
        provider: item.provider,
        message: typeof item.message === "string" && item.message ? item.message : t("modelUnknown")
      })) : [];
      setModelFailures(failed);
      if (route && list.length > 0 && !list.some((entry) => sameRoute(entry, route))) {
        setRoute(null);
        setNotice({ kind: "info", text: t("modelMissing") });
      } else if (list.length <= 1 && failed.length > 0) {
        setNotice({
          kind: "info",
          text: `${t("modelUnavailable")}: ${failed.map((item) => `${item.provider} \u2014 ${item.message}`).join("; ")}`
        });
      }
    }).catch(() => {
      if (!cancelled) setEngineState("unknown");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  React3.useEffect(() => {
    writeStorage(HISTORY_STORAGE, history);
  }, [history]);
  React3.useEffect(() => {
    writeStorage(SESSION_STORAGE, currentId ? { currentId } : null);
  }, [currentId]);
  React3.useEffect(() => {
    writeStorage(DOC_STORAGE, null);
  }, []);
  React3.useEffect(() => {
    if (!doc || !currentId) return;
    if (skipSync.current === currentId) {
      skipSync.current = null;
      return;
    }
    const now = Date.now();
    setHistory((list) => list.map((entry) => entry.id === currentId ? { ...entry, doc, updatedAt: now } : entry));
  }, [doc, currentId]);
  React3.useEffect(() => {
    writeStorage(PREFS_STORAGE, {
      sourceLanguage,
      targetLanguage,
      view,
      fullMode,
      route: route ? { provider: route.provider, model: route.model } : null,
      transMode,
      wsRoot,
      wsWorkspaceId,
      wsSettings
    });
  }, [sourceLanguage, targetLanguage, view, fullMode, route, transMode, wsRoot, wsWorkspaceId, wsSettings]);
  React3.useEffect(() => {
    writeStorage(WORKSPACE_STORAGE, wsStatuses);
  }, [wsStatuses]);
  React3.useEffect(() => {
    if (!historyOpen) return void 0;
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return void 0;
    const onKey = (event) => {
      if (event && event.key === "Escape") closeHistory();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);
  React3.useEffect(() => {
    if (!versionsOpen) return void 0;
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return void 0;
    const onKey = (event) => {
      if (event && event.key === "Escape") closeVersions();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [versionsOpen]);
  React3.useEffect(() => {
    if (!historyOpen) return;
    const node = historySearchRef.current;
    if (node && typeof node.focus === "function") node.focus();
  }, [historyOpen]);
  const searchCache = React3.useRef(/* @__PURE__ */ new Map());
  const keywords = searchKeywords(historyQuery);
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
  const sortedHistory = React3.useMemo(() => sortEntries(history), [history]);
  const versions = React3.useMemo(() => {
    const entry = history.find((item) => item.id === currentId);
    return entry && Array.isArray(entry.versions) ? entry.versions : [];
  }, [history, currentId]);
  const visibleHistory = React3.useMemo(() => {
    if (keywords.length === 0) return sortedHistory;
    return sortedHistory.filter((entry) => {
      const record = searchRecord(entry);
      return keywords.every((word) => record.lower.includes(word));
    });
  }, [sortedHistory, historyQuery]);
  React3.useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);
  React3.useEffect(() => {
    if (!wsTarget || !wsSettings.autoSave || !doc || status) return void 0;
    if (wsTarget.plan && wsTarget.plan.preview) return void 0;
    if (wsSaveTimer.current) clearTimeout(wsSaveTimer.current);
    wsSaveTimer.current = setTimeout(() => {
      wsSaveTimer.current = null;
      saveWorkspaceFile(wsTarget.root, wsTarget, wsTarget.plan, null, { quiet: true, mark: "translated" });
    }, 900);
    return () => {
      if (wsSaveTimer.current) {
        clearTimeout(wsSaveTimer.current);
        wsSaveTimer.current = null;
      }
    };
  }, [doc, status, wsTarget, wsSettings.autoSave]);
  const collectionKey = view === "sentences" ? "sentences" : "paragraphs";
  const fullTranslation = buildFullTranslation(doc);
  const fullSourceLength = doc ? doc.sourceText.length : 0;
  const fullScore = doc ? doc.documentScore : null;
  const items = doc ? doc[collectionKey] : [];
  const sourceOption = sourceLanguage === "auto" ? void 0 : sourceLanguage;
  const activeRoute = route ? routes.find((entry) => sameRoute(entry, route)) : null;
  const routeLabel = route ? activeRoute && activeRoute.label || routeId(route) : engineModel || defaultModel || t("modelUnknown");
  const canSwitchModel = routes.length > 1;
  const engineTitle = engineState === "ok" ? [t("engineOnline"), !canSwitchModel && modelFailures.length > 0 ? t("modelUnavailable") : ""].filter(Boolean).join(" \xB7 ") : t("engineOffline");
  const routeGroups = React3.useMemo(() => {
    const groups = [];
    const byProvider = /* @__PURE__ */ new Map();
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
  const charCount = (count) => `${count} ${count === 1 ? t("charUnitOne") : t("charUnitMany")}`;
  const sentenceCount = (count) => `${count} ${count === 1 ? t("sentenceUnitOne") : t("sentenceUnitMany")}`;
  const paragraphCount = (count) => `${count} ${count === 1 ? t("paragraphUnitOne") : t("paragraphUnitMany")}`;
  const statusText = !status ? "" : status.kind === "translating" ? status.total ? format(t("translateProgress"), { done: status.done ?? 0, total: status.total }) : status.array ? t("translateArrayBusy") : status.whole ? t("translateWholeBusy") : t("translating") : status.kind === "ocr" ? t("ocrReading") : status.kind === "reading" ? t("fileReading") : status.kind === "scoring" ? format(t("scoreAllProgress"), { done: status.done ?? 0, total: status.total ?? 0 }) : status.kind === "optimizing" ? format(t("optimizeProgress"), { done: status.done ?? 0, total: status.total ?? 0 }) : "";
  function routePayload() {
    return route ? { route: { provider: route.provider, model: route.model } } : {};
  }
  function specText() {
    if (!wsSpec || !wsSettings.useSpec || !wsSpec.docs.length) return "";
    return wsSpec.docs.map((entry) => `### ${entry.name}

${String(entry.text ?? "").trim()}`).join("\n\n");
  }
  function specPayload() {
    const text = specRef.current || (wsTarget && doc ? specText() : "");
    return text ? { spec: text } : {};
  }
  function handleRouteChange(value) {
    if (value === "default") {
      setRoute(null);
      setNotice({
        kind: "success",
        text: format(t("modelSwitchHint"), { model: defaultModel || t("modelFollowDefault") })
      });
      return;
    }
    const entry = routes.find((item) => routeId(item) === value);
    if (!entry) return;
    setRoute({ provider: entry.provider, model: entry.model });
    setNotice({
      kind: "success",
      text: format(t("modelSwitchHint"), { model: entry.label || routeId(entry) })
    });
  }
  function patchSegment(collection, id, patch) {
    setDoc((current) => {
      if (!current) return current;
      const edited = Object.prototype.hasOwnProperty.call(patch, "translation");
      const next = {
        ...current,
        ...edited ? { documentScore: null } : {},
        [collection]: current[collection].map((item) => item.id === id ? { ...item, ...patch } : item)
      };
      if (!edited) return next;
      return collection === "sentences" ? syncSentenceToParagraph(next, id) : syncParagraphToSentences(next, id);
    });
  }
  function applyScore(collection, id, expectedTranslation, score) {
    setDoc((current) => {
      if (!current) return current;
      return {
        ...current,
        [collection]: current[collection].map((item) => {
          if (item.id !== id) return item;
          if (item.translation.trim() !== expectedTranslation) return item;
          return { ...item, score };
        })
      };
    });
  }
  function clearSegmentError(id) {
    setErrors((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }
  function applyDocumentPieces(text, meta, shape, pieces, model) {
    const sentenceTranslations = [];
    shape.paragraphs.forEach((source, index) => {
      sentenceTranslations.push(...splitTranslationPieces(pieces[index], splitSentences(source).length));
    });
    const nextDoc = {
      sourceText: text,
      fileName: typeof meta.fileName === "string" ? meta.fileName : "",
      sourceLanguage,
      targetLanguage,
      documentScore: null,
      sentences: shape.sentences.map((source, index) => ({
        id: `s${index}`,
        source,
        translation: sentenceTranslations[index] ?? "",
        score: null
      })),
      paragraphs: shape.paragraphs.map((source, index) => ({
        id: `p${index}`,
        source,
        translation: pieces[index],
        score: null
      }))
    };
    setDoc(nextDoc);
    setFileName(nextDoc.fileName);
    landedDocRef.current = nextDoc;
    const entry = makeEntry(nextDoc);
    skipSync.current = entry.id;
    setCurrentId(entry.id);
    setHistory((list) => trimHistory([entry, ...list]));
    setStatus(null);
    if (model) {
      setEngineModel(model);
      setEngineState("ok");
    }
    return true;
  }
  function beginAbortable() {
    const controller = new AbortController();
    abortRef.current = controller;
    return controller.signal;
  }
  function endAbortable() {
    abortRef.current = null;
  }
  function isAborted(error) {
    return Boolean(error) && error.code === "ABORTED";
  }
  function handleStopTranslation() {
    const controller = abortRef.current;
    if (controller) controller.abort();
  }
  function renderStopButton(onStop = handleStopTranslation) {
    return h3(
      "button",
      {
        type: "button",
        className: "dta-btn dta-btn--sm dta-btn--ghost dta-btn--danger dta-stopBtn",
        "aria-label": t("stopTranslationHint"),
        title: t("stopTranslationHint"),
        onClick: onStop
      },
      h3(
        "svg",
        {
          viewBox: "0 0 16 16",
          width: 11,
          height: 11,
          fill: "currentColor",
          stroke: "none",
          "aria-hidden": true
        },
        h3("rect", { x: 3.5, y: 3.5, width: 9, height: 9, rx: 1.6 })
      ),
      h3("span", null, t("stopTranslation"))
    );
  }
  async function translateWholeDocument(text, meta, shape) {
    setNotice(null);
    setErrors({});
    setPromptFor(null);
    setStatus({ kind: "translating", whole: true });
    const signal = beginAbortable();
    try {
      const data = await requestJson("translate", {
        document: text,
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload(),
        ...specPayload()
      }, { signal });
      if (signal.aborted) throw abortedError();
      if (typeof data.document !== "string" || !data.document.trim()) {
        throw localError(t("translateFailed"));
      }
      const pieces = data.document.trim().split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
      if (pieces.length !== shape.paragraphs.length) return false;
      return applyDocumentPieces(text, meta, shape, pieces, data.model ? String(data.model) : null);
    } finally {
      endAbortable();
    }
  }
  async function translateArrayDocument(text, meta, shape) {
    setNotice(null);
    setErrors({});
    setPromptFor(null);
    setStatus({ kind: "translating", array: true });
    const signal = beginAbortable();
    try {
      const data = await requestJson("translate", {
        document: shape.paragraphs,
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload(),
        ...specPayload()
      }, { signal });
      if (signal.aborted) throw abortedError();
      const reply = Array.isArray(data.paragraphs) ? data.paragraphs : null;
      if (!reply || reply.length !== shape.paragraphs.length) return false;
      const pieces = reply.map((item) => String(item ?? "").trim());
      if (!pieces.every(Boolean)) return false;
      return applyDocumentPieces(text, meta, shape, pieces, data.model ? String(data.model) : null);
    } finally {
      endAbortable();
    }
  }
  async function translateText(rawText, meta = {}) {
    const text = String(rawText ?? "").trim();
    passAbortedRef.current = false;
    if (!text) {
      setNotice({ kind: "warn", text: t("noSource") });
      return false;
    }
    const sentences = splitSentences(text);
    const paragraphs = splitParagraphs(text);
    if (sentences.length === 0 && paragraphs.length === 0) {
      setNotice({ kind: "warn", text: t("noSource") });
      return false;
    }
    const totalChars = sentences.reduce((total, part) => total + part.length, 0) + paragraphs.reduce((total, part) => total + part.length, 0);
    if (sentences.length > MAX_SEGMENTS || paragraphs.length > MAX_SEGMENTS || totalChars > MAX_TOTAL_CHARS) {
      setNotice({ kind: "warn", text: t("tooLongDoc") });
      return false;
    }
    const wholeDocChars = text.length;
    const arrayChars = totalChars + paragraphs.length * 4 + 2;
    if (transMode === "whole" && wholeDocChars <= MAX_WHOLE_DOC_CHARS) {
      try {
        const landed = await translateWholeDocument(text, meta, { sentences, paragraphs });
        if (landed) return true;
      } catch (error) {
        if (isAborted(error)) {
          passAbortedRef.current = true;
          setStatus(null);
          return false;
        }
        if (Number(error && error.status) !== 400) {
          setStatus(null);
          setNotice({ kind: "error", text: describeError(error, t) });
          return false;
        }
      }
    } else if (transMode === "array" && arrayChars <= MAX_WHOLE_DOC_CHARS) {
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
          setNotice({ kind: "error", text: describeError(error, t) });
          return false;
        }
      }
    }
    setNotice(null);
    setErrors({});
    setPromptFor(null);
    const totalItems = sentences.length + paragraphs.length;
    const chunks = [];
    for (let index = 0; index < sentences.length; index += 16) {
      chunks.push({ kind: "sentences", offset: index, items: sentences.slice(index, index + 16) });
    }
    for (let index = 0; index < paragraphs.length; index += 6) {
      chunks.push({ kind: "paragraphs", offset: index, items: paragraphs.slice(index, index + 6) });
    }
    const results = {
      sentences: new Array(sentences.length).fill(""),
      paragraphs: new Array(paragraphs.length).fill("")
    };
    let done = 0;
    let failed = 0;
    let lastError = null;
    let replyModel = null;
    setStatus({ kind: "translating", done: 0, total: paragraphs.length });
    const signal = beginAbortable();
    try {
      await mapLimit(chunks, 3, async (chunk) => {
        if (signal.aborted) return;
        try {
          const data = await requestJson("translate", {
            [chunk.kind]: chunk.items,
            targetLanguage,
            ...sourceOption ? { sourceLanguage: sourceOption } : {},
            ...routePayload(),
            ...specPayload()
          }, { signal });
          if (typeof data.model === "string" && data.model) replyModel = data.model;
          const list = chunk.kind === "sentences" ? data.sentences : data.paragraphs;
          if (Array.isArray(list)) {
            list.forEach((translated, index) => {
              const at = chunk.offset + index;
              if (at < results[chunk.kind].length && typeof translated === "string" && translated.trim()) {
                results[chunk.kind][at] = translated.trim();
              }
            });
          } else {
            failed += chunk.items.length;
          }
        } catch (error) {
          if (isAborted(error)) return;
          failed += chunk.items.length;
          lastError = error;
        }
        if (chunk.kind === "paragraphs") done += chunk.items.length;
        setStatus({ kind: "translating", done, total: paragraphs.length });
      });
      if (signal.aborted) {
        passAbortedRef.current = true;
        setStatus(null);
        return false;
      }
      if (failed >= totalItems) {
        setStatus(null);
        setNotice({ kind: "error", text: lastError ? describeError(lastError, t) : t("translateFailed") });
        return false;
      }
      if (failed > 0) {
        setNotice({ kind: "warn", text: format(t("translatePartial"), { failed }) });
      }
      const nextDoc = {
        sourceText: text,
        fileName: typeof meta.fileName === "string" ? meta.fileName : "",
        sourceLanguage,
        targetLanguage,
        documentScore: null,
        sentences: sentences.map((source, index) => ({
          id: `s${index}`,
          source,
          translation: results.sentences[index],
          score: null
        })),
        paragraphs: paragraphs.map((source, index) => ({
          id: `p${index}`,
          source,
          translation: results.paragraphs[index],
          score: null
        }))
      };
      setDoc(nextDoc);
      setFileName(nextDoc.fileName);
      landedDocRef.current = nextDoc;
      const entry = makeEntry(nextDoc);
      skipSync.current = entry.id;
      setCurrentId(entry.id);
      setHistory((list) => trimHistory([entry, ...list]));
      setStatus(null);
      if (replyModel) {
        setEngineModel(replyModel);
        setEngineState("ok");
      }
      return true;
    } catch (error) {
      setStatus(null);
      setNotice({ kind: "error", text: describeError(error, t) });
      return false;
    } finally {
      endAbortable();
    }
  }
  async function handleTranslate() {
    if (!draft.trim()) {
      setNotice({ kind: "warn", text: t("noSource") });
      return;
    }
    await translateText(draft, { fileName });
  }
  async function prepareImagePayload(file) {
    const originalType = typeof file.type === "string" && file.type ? file.type : "image/png";
    const originalName = typeof file.name === "string" && file.name ? file.name : "image";
    if (typeof createImageBitmap === "function") {
      let bitmap;
      try {
        bitmap = await createImageBitmap(file);
      } catch {
        throw localError(t("imageUnreadable"));
      }
      try {
        if (typeof OffscreenCanvas === "function") {
          const maxEdge = 2048;
          const width = Math.max(1, bitmap.width || 1);
          const height = Math.max(1, bitmap.height || 1);
          const scale = Math.min(1, maxEdge / Math.max(width, height));
          const targetWidth = Math.max(1, Math.round(width * scale));
          const targetHeight = Math.max(1, Math.round(height * scale));
          const canvas = new OffscreenCanvas(targetWidth, targetHeight);
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
            const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.9 });
            const buffer2 = await blob.arrayBuffer();
            if (buffer2.byteLength > 0) {
              return {
                data: bytesToBase64(new Uint8Array(buffer2)),
                mediaType: "image/jpeg",
                name: `${originalName.replace(/\.[a-z0-9]+$/i, "")}.jpg`
              };
            }
          }
        }
      } finally {
        if (typeof bitmap.close === "function") bitmap.close();
      }
    }
    const buffer = await file.arrayBuffer();
    return { data: bytesToBase64(new Uint8Array(buffer)), mediaType: originalType, name: originalName };
  }
  async function handleImageFile(file) {
    if (!file || !String(file.type || "").startsWith("image/")) {
      setNotice({ kind: "warn", text: t("imageTypeError") });
      return;
    }
    if (Number(file.size) > 12 * 1024 * 1024) {
      setNotice({ kind: "warn", text: t("imageTooLarge") });
      return;
    }
    setNotice(null);
    setStatus({ kind: "ocr" });
    try {
      const payload = await prepareImagePayload(file);
      const data = await requestJson("ocr", {
        ...payload,
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload()
      });
      const text = typeof data.text === "string" ? data.text.trim() : "";
      setStatus(null);
      if (!text) {
        setNotice({ kind: "warn", text: t("ocrEmpty") });
        return;
      }
      setDraft(text);
      setFileName("");
      await translateText(text, { fileName: "" });
    } catch (error) {
      setStatus(null);
      setNotice({ kind: "error", text: describeError(error, t) });
    }
  }
  function handlePickImage() {
    if (fileInputRef.current) fileInputRef.current.click();
  }
  function handlePickDocument() {
    if (docInputRef.current) docInputRef.current.click();
  }
  function describeFileError(error) {
    if (error && error.code === "DOCX_UNSUPPORTED") return t("fileUnsupported");
    if (error && error.code === "FILE_LEGACY_DOC") return t("fileLegacyDoc");
    if (error && error.code === "DOCX_INVALID") return t("fileUnreadable");
    return describeError(error, t);
  }
  async function handleDocumentFile(file) {
    if (!file) return;
    const extension = fileExtension(file.name);
    if (extension === "doc" || file.type === "application/msword") {
      setNotice({ kind: "warn", text: t("fileLegacyDoc") });
      return;
    }
    if (extension !== "docx" && file.type !== DOCX_MIME && !isTextImport(file)) {
      setNotice({ kind: "warn", text: t("fileTypeError") });
      return;
    }
    if (Number(file.size) > MAX_IMPORT_BYTES) {
      setNotice({ kind: "warn", text: t("fileTooBig") });
      return;
    }
    setNotice(null);
    setStatus({ kind: "reading" });
    try {
      const text = await extractImportText(file);
      setStatus(null);
      if (!text) {
        setNotice({ kind: "warn", text: t("fileEmpty") });
        return;
      }
      if (text.length > MAX_TOTAL_CHARS) {
        setNotice({ kind: "warn", text: t("fileTooLong") });
        return;
      }
      setDraft(text);
      setFileName(file.name);
      await translateText(text, { fileName: file.name });
    } catch (error) {
      setStatus(null);
      setNotice({ kind: "error", text: describeFileError(error) });
    }
  }
  function handleSourceDrop(event) {
    const files = event.dataTransfer && event.dataTransfer.files;
    if (!files || files.length === 0) return;
    event.preventDefault();
    handleDocumentFile(files[0]);
  }
  function handleClearFile() {
    setFileName("");
    setNotice(null);
  }
  function handleDownload() {
    if (!doc) return;
    const text = buildFullTranslation(doc).trim();
    if (!text) {
      setNotice({ kind: "warn", text: t("noTranslationFull") });
      return;
    }
    const name = downloadFileName(doc);
    const html = /\.(html?|xhtml)$/i.test(doc.fileName || "");
    try {
      if (typeof Blob !== "function" || typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
        throw new Error("download is unavailable");
      }
      const payload = html ? buildHtmlExport(doc, name) : `${text}
`;
      const type = html ? "text/html;charset=utf-8" : "text/plain;charset=utf-8";
      const href = URL.createObjectURL(new Blob([payload], { type }));
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = name;
      if (document.body && typeof document.body.appendChild === "function") document.body.appendChild(anchor);
      anchor.click();
      if (typeof anchor.remove === "function") anchor.remove();
      if (typeof URL.revokeObjectURL === "function") setTimeout(() => URL.revokeObjectURL(href), 0);
      setNotice({ kind: "success", text: format(t("downloaded"), { name }) });
    } catch {
      setNotice({ kind: "error", text: t("downloadFailed") });
    }
  }
  function handleSourcePaste(event) {
    const items2 = event.clipboardData && event.clipboardData.items;
    if (!items2) return;
    for (let index = 0; index < items2.length; index += 1) {
      const item = items2[index];
      if (item && item.kind === "file" && typeof item.type === "string" && item.type.startsWith("image/")) {
        const file = typeof item.getAsFile === "function" ? item.getAsFile() : void 0;
        if (file) {
          event.preventDefault();
          handleImageFile(file);
          return;
        }
      }
    }
  }
  async function handleScoreFull() {
    if (!doc || fullScoreBusy) return;
    const translationText = fullTranslation;
    const sourceText = doc.sourceText;
    if (!translationText) {
      setNotice({ kind: "warn", text: t("noTranslationFull") });
      return;
    }
    if (sourceText.length > MAX_FULL_SCORE_CHARS || translationText.length > MAX_FULL_SCORE_CHARS) {
      setNotice({ kind: "warn", text: t("fullScoreTooLong") });
      return;
    }
    setNotice(null);
    setFullScoreBusy(true);
    try {
      const data = await requestJson("score-document", {
        source: sourceText,
        translation: translationText,
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload(),
        ...specPayload()
      });
      const value = Number(data.score);
      if (!Number.isFinite(value)) throw localError(t("scoreFailed"));
      setDoc((current) => {
        if (!current || current.sourceText !== sourceText || buildFullTranslation(current) !== translationText) {
          return current;
        }
        return {
          ...current,
          documentScore: {
            value: Math.max(0, Math.min(100, Math.round(value))),
            comment: typeof data.comment === "string" ? data.comment : ""
          }
        };
      });
      setShowScores(true);
    } catch (error) {
      setNotice({ kind: "error", text: describeError(error, t) });
    } finally {
      setFullScoreBusy(false);
    }
  }
  function suggestionFor(score) {
    const value = score && Number.isFinite(Number(score.value)) ? Math.round(Number(score.value)) : null;
    const comment = String(score && score.comment || "").trim();
    return comment ? format(t("optimizePrompt"), { score: value ?? "\u2014", comment }) : format(t("optimizePromptScore"), { score: value ?? "\u2014" });
  }
  async function handleOptimize(collection, item) {
    if (!item.score) return;
    await handleRetranslate(collection, item, suggestionFor(item.score), {
      limit: MAX_SUGGESTION_CHARS,
      busyKind: "optimize"
    });
  }
  async function runOptimizeBatch(collection, snapshot) {
    if (snapshot.length === 0) return;
    setNotice(null);
    setStatus({ kind: "optimizing", done: 0, total: snapshot.length });
    const before = doc;
    let rewritten = 0;
    let done = 0;
    const signal = beginAbortable();
    try {
      await mapLimit(snapshot, 3, async (item) => {
        if (signal.aborted) return;
        try {
          const data = await requestJson("retranslate", {
            source: item.source,
            ...item.translation.trim() ? { translation: item.translation.trim() } : {},
            extraPrompt: item.instruction,
            kind: collection === "paragraphs" ? "paragraph" : "sentence",
            targetLanguage,
            ...sourceOption ? { sourceLanguage: sourceOption } : {},
            ...routePayload(),
            ...specPayload()
          }, { signal });
          if (typeof data.translation === "string" && data.translation.trim()) {
            patchSegment(collection, item.id, { translation: data.translation.trim(), score: null });
            rewritten += 1;
          } else {
            setErrors((current) => ({ ...current, [item.id]: t("retranslateFailed") }));
          }
        } catch (error) {
          if (isAborted(error)) return;
          setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
        }
        done += 1;
        setStatus({ kind: "optimizing", done, total: snapshot.length });
      });
      if (rewritten > 0) recordVersion(before, "optimize");
    } finally {
      endAbortable();
      setStatus(null);
    }
  }
  async function handleOptimizeAll() {
    if (!doc || status) return;
    const collection = collectionKey;
    const snapshot = items.filter((item) => item.translation.trim() && item.score).map((item) => ({
      id: item.id,
      source: item.source,
      translation: item.translation,
      instruction: suggestionFor(item.score)
    }));
    await runOptimizeBatch(collection, snapshot);
  }
  async function handleOptimizeFull() {
    if (!doc || status || !fullScore) return;
    const instruction = suggestionFor(fullScore);
    const snapshot = doc.paragraphs.filter((item) => item.translation.trim()).map((item) => ({
      id: item.id,
      source: item.source,
      translation: item.translation,
      instruction
    }));
    if (snapshot.length === 0) {
      setNotice({ kind: "warn", text: t("noTranslationYet") });
      return;
    }
    await runOptimizeBatch("paragraphs", snapshot);
  }
  async function runFullRetranslate(extraPrompt) {
    if (!doc || status) return;
    if (!doc.sourceText.trim() || doc.paragraphs.length === 0) {
      setNotice({ kind: "warn", text: t("noSource") });
      return;
    }
    if (transMode !== "batch") {
      await retranslateWholeDocument(extraPrompt);
      return;
    }
    await retranslateSegmentsPass(extraPrompt);
  }
  async function retranslateWholeDocument(extraPrompt) {
    const instruction = String(extraPrompt ?? "").trim().slice(0, MAX_PROMPT_CHARS);
    const collection = doc.paragraphs.some((item) => item.translation.trim()) ? "paragraphs" : "sentences";
    const segments = doc[collection];
    const reference = buildFullTranslation(doc);
    const before = doc;
    setNotice(null);
    setPromptFor(null);
    setPromptText("");
    setStatus({ kind: "retranslatingFull", array: transMode === "array" });
    const signal = beginAbortable();
    try {
      const data = await requestJson("retranslate", {
        source: doc.sourceText,
        ...reference.trim() ? { translation: reference.trim() } : {},
        ...instruction ? { extraPrompt: instruction } : {},
        kind: "document",
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload(),
        ...specPayload()
      }, { signal });
      if (signal.aborted) throw abortedError();
      if (typeof data.translation !== "string" || !data.translation.trim()) {
        setNotice({ kind: "error", text: t("retranslateFailed") });
        return;
      }
      const parts = data.translation.trim().split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
      if (parts.length !== segments.length) {
        setNotice({
          kind: "warn",
          text: format(t("fullRetranslateMismatch"), { got: parts.length, want: segments.length })
        });
        return;
      }
      segments.forEach((item, index) => {
        patchSegment(collection, item.id, { translation: parts[index], score: null });
      });
      recordVersion(before, "retranslate");
    } catch (error) {
      if (!isAborted(error)) {
        setNotice({ kind: "error", text: describeError(error, t) });
      }
    } finally {
      endAbortable();
      setStatus(null);
    }
  }
  async function retranslateSegmentsPass(extraPrompt) {
    const instruction = String(extraPrompt ?? "").trim().slice(0, MAX_PROMPT_CHARS);
    const snapshot = doc.paragraphs.filter((item) => item.translation.trim() || item.source.trim()).map((item) => ({
      id: item.id,
      source: item.source,
      translation: item.translation
    }));
    const before = doc;
    let rewritten = 0;
    let failed = 0;
    let done = 0;
    setNotice(null);
    setPromptFor(null);
    setPromptText("");
    setStatus({ kind: "retranslatingFull", done: 0, total: snapshot.length });
    const signal = beginAbortable();
    try {
      await mapLimit(snapshot, 3, async (item) => {
        if (signal.aborted) return;
        try {
          const data = await requestJson("retranslate", {
            source: item.source,
            ...item.translation.trim() ? { translation: item.translation.trim() } : {},
            ...instruction ? { extraPrompt: instruction } : {},
            kind: "paragraph",
            targetLanguage,
            ...sourceOption ? { sourceLanguage: sourceOption } : {},
            ...routePayload(),
            ...specPayload()
          }, { signal });
          if (typeof data.translation === "string" && data.translation.trim()) {
            patchSegment("paragraphs", item.id, { translation: data.translation.trim(), score: null });
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
        setStatus({ kind: "retranslatingFull", done, total: snapshot.length });
      });
      if (signal.aborted) {
      } else if (failed > 0) {
        setNotice({
          kind: rewritten > 0 ? "warn" : "error",
          text: rewritten > 0 ? format(t("retranslatePartial"), { failed }) : t("retranslateFailed")
        });
      }
      if (rewritten > 0) recordVersion(before, "retranslate");
    } finally {
      endAbortable();
      setStatus(null);
    }
  }
  async function handleRetranslate(collection, item, extraPrompt, options = {}) {
    const id = item.id;
    const limit = options.limit ?? MAX_PROMPT_CHARS;
    const busyKind = options.busyKind ?? "retranslate";
    const instruction = String(extraPrompt ?? "").trim().slice(0, limit);
    const before = doc;
    clearSegmentError(id);
    setBusy((current) => ({ ...current, [id]: busyKind }));
    const controller = new AbortController();
    segmentAborts.current.set(id, controller);
    const signal = controller.signal;
    try {
      const data = await requestJson("retranslate", {
        source: item.source,
        ...item.translation.trim() ? { translation: item.translation.trim() } : {},
        ...instruction ? { extraPrompt: instruction } : {},
        kind: collection === "paragraphs" ? "paragraph" : "sentence",
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload(),
        ...specPayload()
      }, { signal });
      if (signal.aborted) throw abortedError();
      if (typeof data.translation !== "string" || !data.translation.trim()) {
        throw localError(t("retranslateFailed"));
      }
      patchSegment(collection, id, { translation: data.translation.trim(), score: null });
      recordVersion(before, busyKind === "optimize" ? "optimize" : "retranslate");
      setPromptFor(null);
      setPromptText("");
    } catch (error) {
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
  function handleStopSegment(id) {
    const controller = segmentAborts.current.get(id);
    if (controller) controller.abort();
  }
  async function handleScore(collection, item) {
    const id = item.id;
    if (!item.translation.trim()) {
      setErrors((current) => ({ ...current, [id]: t("noTranslationYet") }));
      return;
    }
    clearSegmentError(id);
    const scoredText = item.translation.trim();
    setBusy((current) => ({ ...current, [id]: "score" }));
    try {
      const data = await requestJson("score", {
        source: item.source,
        translation: scoredText,
        kind: collection === "paragraphs" ? "paragraph" : "sentence",
        targetLanguage,
        ...sourceOption ? { sourceLanguage: sourceOption } : {},
        ...routePayload(),
        ...specPayload()
      });
      const value = Number(data.score);
      if (!Number.isFinite(value)) throw localError(t("scoreFailed"));
      applyScore(collection, id, scoredText, {
        value: Math.max(0, Math.min(100, Math.round(value))),
        comment: typeof data.comment === "string" ? data.comment : ""
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
  async function handleScoreAll() {
    if (!doc || status) return;
    const collection = collectionKey;
    const snapshot = items.map((item) => ({
      id: item.id,
      source: item.source,
      translation: item.translation
    }));
    if (snapshot.length === 0) return;
    if (snapshot.every((item) => !item.translation.trim())) {
      setNotice({ kind: "warn", text: t("noTranslationYet") });
      return;
    }
    setNotice(null);
    setShowScores(true);
    setStatus({ kind: "scoring", done: 0, total: snapshot.length });
    let done = 0;
    try {
      await mapLimit(snapshot, 3, async (item) => {
        if (!item.translation.trim()) {
          done += 1;
          setStatus({ kind: "scoring", done, total: snapshot.length });
          return;
        }
        try {
          const data = await requestJson("score", {
            source: item.source,
            translation: item.translation.trim(),
            kind: collection === "paragraphs" ? "paragraph" : "sentence",
            targetLanguage,
            ...sourceOption ? { sourceLanguage: sourceOption } : {},
            ...routePayload(),
            ...specPayload()
          });
          const value = Number(data.score);
          if (Number.isFinite(value)) {
            applyScore(collection, item.id, item.translation.trim(), {
              value: Math.max(0, Math.min(100, Math.round(value))),
              comment: typeof data.comment === "string" ? data.comment : ""
            });
          }
        } catch (error) {
          setErrors((current) => ({ ...current, [item.id]: describeError(error, t) }));
        }
        done += 1;
        setStatus({ kind: "scoring", done, total: snapshot.length });
      });
      setShowScores(true);
    } finally {
      setStatus(null);
    }
  }
  function resetSegmentState() {
    setErrors({});
    setBusy({});
    setPromptFor(null);
    setPromptText("");
    setStatus(null);
    setConfirmDeleteId(null);
  }
  function openHistory() {
    setHistoryQuery("");
    setConfirmDeleteId(null);
    closeVersions();
    setHistoryOpen(true);
  }
  function closeHistory() {
    setHistoryOpen(false);
    setConfirmDeleteId(null);
    setHistoryQuery("");
    searchCache.current.clear();
  }
  function handleNewTranslation() {
    if (isWorking) return;
    if (!doc && draft.trim()) {
      const message = t("discardDraft");
      if (typeof window.confirm === "function" && !window.confirm(message)) return;
    }
    skipSync.current = null;
    setDoc(null);
    setCurrentId(null);
    setDraft("");
    setFileName("");
    setNotice(null);
    setWsTarget(null);
    resetSegmentState();
    closeHistory();
    closeVersions();
    writeStorage(DOC_STORAGE, null);
  }
  function wsStatusOf(root, relPath) {
    const bucket = wsStatuses[root];
    return bucket && bucket[relPath] || "";
  }
  function setWsStatusFor(root, relPath, value) {
    setWsStatuses((current) => {
      const bucket = { ...current[root] || {} };
      if (value) bucket[relPath] = value;
      else delete bucket[relPath];
      return { ...current, [root]: bucket };
    });
  }
  function wsDescribeError(error) {
    const keys = {
      ROOT_MISSING: "wsRootMissing",
      ROOT_NOT_FOLDER: "wsRootMissing",
      WORKSPACE_NOT_REGISTERED: "wsNotRegistered",
      PATH_ESCAPES: "wsPathEscape",
      EXTENSION: "wsExtUnsupported",
      TOO_LARGE: "wsTooLargeFile",
      FILE_MISSING: "wsFileMissing",
      NOT_FILE: "wsFileMissing",
      EXISTS: "wsExists"
    };
    const key = error && keys[error.code];
    return key ? t(key) : describeError(error, t);
  }
  function wsPlanOutput(entry) {
    const outExt = entry.ext === "docx" ? "md" : entry.ext;
    const stem = String(entry.name ?? "").replace(/\.[^.]+$/, "");
    const slash = entry.relPath.lastIndexOf("/");
    const dir = slash >= 0 ? `${entry.relPath.slice(0, slash + 1)}` : "";
    if (wsSettings.output === "preview") {
      return { relPath: "", overwrite: false, preview: true };
    }
    if (wsSettings.output === "overwrite" && entry.ext !== "docx") {
      return { relPath: entry.relPath, overwrite: true };
    }
    if (wsSettings.output === "suffix") {
      const suffix = wsSettings.suffix || "zh";
      return { relPath: `${dir}${stem}.${suffix}.${outExt}`, overwrite: true };
    }
    return { relPath: `${dir}${t("wsSubfolderName")}/${stem}.${outExt}`, overwrite: true };
  }
  async function wsReadText(entry) {
    const data = await requestJson("workspace/read", { root: wsRoot, relPath: entry.relPath });
    if (data.encoding === "base64") {
      return normalizeImportedText(await readDocxText(decodeBase64Bytes(data.content)));
    }
    return normalizeImportedText(typeof data.content === "string" ? data.content : "");
  }
  async function openWorkspaceRoot(rootValue) {
    const root = String(rootValue ?? "").trim();
    if (!root || isWorking) return;
    try {
      const data = await requestJson("workspace/list", { root });
      const resolved = typeof data.root === "string" && data.root ? data.root : root;
      setWsRoot(resolved);
      setWsRootDraft(resolved);
      setWsFiles(Array.isArray(data.entries) ? data.entries : []);
      setNotice(null);
      loadWorkspaceSpec(resolved);
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsListFailed"), { message: wsDescribeError(error) }) });
    }
  }
  async function loadWorkspaceSpec(rootValue) {
    try {
      const data = await requestJson("workspace/spec", { root: rootValue });
      setWsSpec({
        available: data.available === true,
        docs: Array.isArray(data.docs) ? data.docs : [],
        skipped: Array.isArray(data.skipped) ? data.skipped : []
      });
    } catch {
      setWsSpec({ available: false, docs: [], skipped: [] });
    }
  }
  function validateSpecName(raw) {
    const base = String(raw ?? "").trim().replace(/\.md$/i, "");
    return /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(base) ? `${base}.md` : "";
  }
  function openSpecDrawer() {
    setWsOpen(false);
    setWsSpecEditor(null);
    setWsSpecCreating(false);
    setWsSpecDraftName("");
    setWsSpecConfirm("");
    setWsSpecOpen(true);
  }
  function closeSpecDrawer() {
    setWsSpecOpen(false);
    setWsSpecEditor(null);
    setWsSpecCreating(false);
    setWsSpecDraftName("");
    setWsSpecConfirm("");
    setWsOpen(true);
  }
  function startSpecCreate() {
    setWsSpecEditor(null);
    setWsSpecDraftName("");
    setWsSpecConfirm("");
    setWsSpecCreating(true);
  }
  async function openSpecEditor(name) {
    if (isWorking) return;
    setWsSpecCreating(false);
    setWsSpecConfirm("");
    const known = wsSpec && wsSpec.docs.find((entry) => entry.name === name);
    if (known) {
      setWsSpecEditor({ name, content: known.text });
      return;
    }
    try {
      const data = await requestJson("workspace/read", {
        root: wsRoot,
        relPath: `.translation-spec/${name}`
      });
      setWsSpecEditor({ name, content: typeof data.content === "string" ? data.content : "" });
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsReadFailed"), { name, message: wsDescribeError(error) }) });
    }
  }
  async function handleSpecCreate() {
    if (!wsRoot || isWorking) return;
    const name = validateSpecName(wsSpecDraftName);
    if (!name) {
      setNotice({ kind: "warn", text: t("wsSpecNameInvalid") });
      return;
    }
    try {
      await requestJson("workspace/write", {
        root: wsRoot,
        relPath: `.translation-spec/${name}`,
        content: "",
        overwrite: false
      });
      setWsSpecCreating(false);
      setWsSpecDraftName("");
      await loadWorkspaceSpec(wsRoot);
      setWsSpecEditor({ name, content: "" });
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsWriteFailed"), { message: wsDescribeError(error) }) });
    }
  }
  async function handleSpecSave() {
    if (!wsRoot || !wsSpecEditor || isWorking) return;
    try {
      await requestJson("workspace/write", {
        root: wsRoot,
        relPath: `.translation-spec/${wsSpecEditor.name}`,
        content: wsSpecEditor.content,
        overwrite: true
      });
      setNotice({ kind: "success", text: format(t("wsSpecSaved"), { name: wsSpecEditor.name }) });
      setWsSpecEditor(null);
      await loadWorkspaceSpec(wsRoot);
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsWriteFailed"), { message: wsDescribeError(error) }) });
    }
  }
  async function handleSpecDelete(name) {
    if (!wsRoot || isWorking) return;
    if (wsSpecConfirm !== name) {
      setWsSpecConfirm(name);
      return;
    }
    setWsSpecConfirm("");
    try {
      await requestJson("workspace/spec/delete", { root: wsRoot, name });
      if (wsSpecEditor && wsSpecEditor.name === name) setWsSpecEditor(null);
      setNotice({ kind: "success", text: format(t("wsSpecDeleted"), { name }) });
      await loadWorkspaceSpec(wsRoot);
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsDeleteFailed"), { message: wsDescribeError(error) }) });
    }
  }
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
  async function loadWorkspaceRegistry() {
    let registry;
    try {
      const data = await requestJson("workspace/registry", {});
      registry = {
        available: data.available === true,
        workspaces: Array.isArray(data.workspaces) ? data.workspaces : []
      };
    } catch (error) {
      registry = {
        available: false,
        staleHost: error && error.status === 404,
        workspaces: []
      };
    }
    setWsRegistry(registry);
    if (!registry.available || registry.workspaces.length === 0) return registry;
    const saved = registry.workspaces.find((entry) => entry.id === wsWorkspaceId) || registry.workspaces.find((entry) => entry.path === bootstrap.prefs.wsRoot) || registry.workspaces[0];
    if (wsRoot && chosenSameWorkspace(saved)) {
      if (wsFiles.length === 0) await openWorkspaceRoot(wsRoot);
      return registry;
    }
    await selectWorkspace(saved);
    return registry;
  }
  function chosenSameWorkspace(entry) {
    return wsRoot === entry.path;
  }
  function wsDisplayName() {
    if (!wsRoot) return "";
    const match = wsRegistry && Array.isArray(wsRegistry.workspaces) ? wsRegistry.workspaces.find((entry) => entry.path === wsRoot) : null;
    if (match && match.title) return match.title;
    const trimmed = wsRoot.replace(/\/+$/, "");
    const slash = trimmed.lastIndexOf("/");
    return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  }
  async function selectWorkspace(entry) {
    if (!entry || !entry.path || isWorking) return;
    setWsWorkspaceId(entry.id || "");
    setWsRoot(entry.path);
    setWsRootDraft(entry.path);
    await openWorkspaceRoot(entry.path);
  }
  async function refreshWorkspaceRegistry() {
    setWsRegistry(null);
    await loadWorkspaceRegistry();
  }
  async function saveWorkspaceFile(root, entry, plan, docValue, options = {}) {
    const source = docValue || landedDocRef.current;
    const text = source ? buildFullTranslation(source) : "";
    if (!text.trim()) {
      if (!options.quiet) setNotice({ kind: "warn", text: t("wsNothingToSave") });
      return false;
    }
    try {
      await requestJson("workspace/write", { root, relPath: plan.relPath, content: `${text}
`, overwrite: true });
      setWsStatusFor(root, entry.relPath, options.mark === "translated" ? "translated" : "done");
      if (!options.quiet) {
        setNotice({ kind: "success", text: format(t("wsSaved"), { path: plan.relPath }) });
      }
      return true;
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsWriteFailed"), { message: wsDescribeError(error) }) });
      return false;
    }
  }
  async function translateWorkspaceFile(entry, options = {}) {
    if (isWorking) return { ok: false, aborted: false };
    let text;
    try {
      text = await wsReadText(entry);
    } catch (error) {
      if (isAborted(error)) passAbortedRef.current = true;
      if (!options.quiet) {
        setNotice({ kind: "error", text: format(t("wsReadFailed"), { name: entry.name, message: wsDescribeError(error) }) });
      }
      return { ok: false, aborted: isAborted(error) };
    }
    if (!text) {
      if (!options.quiet) setNotice({ kind: "warn", text: t("noSource") });
      return { ok: false, aborted: false };
    }
    landedDocRef.current = null;
    setWsTranslatingName(entry.name);
    specRef.current = specText();
    let landed;
    try {
      landed = await translateText(text, { fileName: entry.name });
    } finally {
      setWsTranslatingName("");
      specRef.current = "";
    }
    if (!landed) return { ok: false, aborted: passAbortedRef.current };
    const root = wsRoot;
    const plan = wsPlanOutput(entry);
    setWsStatusFor(root, entry.relPath, "translated");
    if (options.saveNow && !plan.preview) {
      const saved = await saveWorkspaceFile(root, entry, plan, landedDocRef.current, {
        quiet: Boolean(options.quiet),
        mark: "translated"
      });
      if (!saved) return { ok: false, aborted: false };
    }
    if (options.autoOpen) {
      setWsTarget({ root, relPath: entry.relPath, name: entry.name, plan });
      setWsOpen(false);
    }
    return { ok: true, aborted: false };
  }
  async function openWorkspaceProofread(entry) {
    if (isWorking) return;
    const plan = wsPlanOutput(entry);
    if (plan.preview || wsSettings.output === "overwrite" && plan.overwrite) {
      const match = [...history].reverse().find((item) => item.doc && item.doc.fileName === entry.name);
      if (match) {
        handleOpenEntry(match);
        setWsTarget({ root: wsRoot, relPath: entry.relPath, name: entry.name, plan });
        setWsOpen(false);
        return;
      }
      setNotice({ kind: "warn", text: t("wsNoTranslation") });
      return;
    }
    try {
      const source = await wsReadText(entry);
      if (!source) {
        setNotice({ kind: "warn", text: t("noSource") });
        return;
      }
      let translation = "";
      try {
        const data = await requestJson("workspace/read", { root: wsRoot, relPath: plan.relPath });
        translation = typeof data.content === "string" ? data.content : "";
      } catch (error) {
        if (Number(error && error.status) !== 404) throw error;
      }
      if (!translation.trim()) {
        setNotice({ kind: "warn", text: t("wsNoTranslation") });
        return;
      }
      const shape = { sentences: splitSentences(source), paragraphs: splitParagraphs(source) };
      const parts = translation.trim().split(/\n{2,}/).map((part) => part.trim());
      while (parts.length < shape.paragraphs.length) parts.push("");
      applyDocumentPieces(
        source,
        { fileName: entry.name },
        shape,
        parts.slice(0, shape.paragraphs.length),
        null
      );
      setWsTarget({ root: wsRoot, relPath: entry.relPath, name: entry.name, plan });
      setWsOpen(false);
    } catch (error) {
      setNotice({ kind: "error", text: format(t("wsReadFailed"), { name: entry.name, message: wsDescribeError(error) }) });
    }
  }
  function handleWsStopBatch() {
    const batch = wsBatchRef.current;
    if (batch) batch.stopped = true;
    handleStopTranslation();
  }
  async function handleWsTranslateAll() {
    if (isWorking || wsBatch) return;
    const root = wsRoot;
    const pending = wsFiles.filter((entry) => !wsStatusOf(root, entry.relPath));
    if (pending.length === 0) {
      setNotice({ kind: "success", text: t("wsAllTranslated") });
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
      setWsBatch((current) => current ? { ...current, done: current.done + 1 } : current);
    }
    wsBatchRef.current = null;
    setWsBatch(null);
    if (failed > 0) {
      setNotice({ kind: "warn", text: format(t("wsBatchPartial"), { failed }) });
    }
  }
  async function handleWsSave() {
    if (!wsTarget || !doc || isWorking) return;
    if (wsTarget.plan && wsTarget.plan.preview) return;
    await saveWorkspaceFile(wsTarget.root, wsTarget, wsTarget.plan, doc);
  }
  function wsTranslatingText() {
    if (!status || status.kind !== "translating") return "";
    const progress = status.total ? format(t("translateProgress"), { done: status.done ?? 0, total: status.total }) : t("translateWholeBusy");
    return wsTranslatingName ? `${wsTranslatingName} \xB7 ${progress}` : progress;
  }
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
  function handleTogglePin(entryId) {
    setHistory((list) => list.map((entry) => entry.id === entryId ? { ...entry, pinned: !entry.pinned } : entry));
  }
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
      setDraft("");
    }
    setNotice(null);
    resetSegmentState();
  }
  function openVersions() {
    if (!doc) return;
    setConfirmDeleteVersion(null);
    closeHistory();
    setVersionsOpen(true);
  }
  function closeVersions() {
    setVersionsOpen(false);
    setConfirmDeleteVersion(null);
  }
  function recordVersion(source, kind) {
    if (!source || !currentId) return;
    const version = makeVersion(source, kind);
    setHistory((list) => trimHistory(list.map((entry) => entry.id === currentId ? { ...entry, versions: addVersion(entry.versions, version) } : entry), currentId));
  }
  function handleSaveVersion() {
    if (!doc || isWorking) return;
    recordVersion(doc, "manual");
    setNotice({ kind: "success", text: t("versionSaved") });
  }
  function handleRestoreVersion(version) {
    if (!doc || !version || isWorking) return;
    const restored = normalizeDoc(version.doc);
    if (!restored) return;
    recordVersion(doc, "restore");
    setDoc(restored);
    setDraft(restored.sourceText);
    setSourceLanguage(restored.sourceLanguage);
    setTargetLanguage(restored.targetLanguage);
    setNotice({
      kind: "success",
      text: format(t("versionRestored"), { label: versionLabel(version.kind, t) })
    });
    resetSegmentState();
    closeVersions();
  }
  function handleDeleteVersion(versionId) {
    if (isWorking) return;
    if (confirmDeleteVersion !== versionId) {
      setConfirmDeleteVersion(versionId);
      return;
    }
    setConfirmDeleteVersion(null);
    setHistory((list) => list.map((entry) => entry.id === currentId ? { ...entry, versions: (entry.versions || []).filter((item) => item.id !== versionId) } : entry));
  }
  async function handleCopy(kind) {
    const value = kind === "source" ? doc ? doc.sourceText : "" : fullTranslation;
    if (!value) {
      setNotice({ kind: "warn", text: t("emptyFull") });
      return;
    }
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 1600);
    } catch {
      setNotice({ kind: "error", text: t("copyFailed") });
    }
  }
  function toggleScores() {
    setShowScores((current) => !current);
  }
  function setTransMode(next) {
    if (!TRANS_MODES.includes(next)) return;
    setTransModeState(next);
  }
  function transModePicker() {
    return h3(
      "label",
      { className: "dta-transMode" },
      t("transModeLabel"),
      h3(
        "select",
        {
          className: "dta-select",
          value: transMode,
          onChange: (event) => setTransMode(event.target.value),
          "aria-label": t("transModeLabel")
        },
        h3("option", { value: "whole" }, t("modeWhole")),
        h3("option", { value: "array" }, t("modeArray")),
        h3("option", { value: "batch" }, t("modeBatch"))
      ),
      h3(
        "span",
        {
          className: "dta-modeHelp",
          "data-open": modeHelpOpen,
          "aria-expanded": modeHelpOpen,
          onClick: (event) => {
            if (event && typeof event.stopPropagation === "function") event.stopPropagation();
            setModeHelpOpen(!modeHelpOpen);
          }
        },
        h3(
          "svg",
          { viewBox: "0 0 16 16", width: 12, height: 12, "aria-hidden": true },
          h3("circle", { cx: 8, cy: 8, r: 6.6, fill: "none", stroke: "currentColor", "stroke-width": 1.3 }),
          h3("path", {
            d: "M6.2 6.1c.1-1 .9-1.6 1.8-1.6 1 0 1.8.6 1.8 1.6 0 .7-.4 1.1-.9 1.4-.5.3-.8.6-.8 1.2v.3",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": 1.3,
            "stroke-linecap": "round"
          }),
          h3("circle", { cx: 8.1, cy: 11.2, r: 0.9, fill: "currentColor" })
        ),
        // Always in the DOM; CSS shows it on hover or when opened by a
        // click. Native `title` tooltips never surface in the Harness
        // webview, and a document-level click-to-close races the
        // framework's own event delegation, so neither is relied on.
        h3("span", { className: "dta-modeBubble", role: "tooltip" }, t("transModeHint"))
      )
    );
  }
  function toggleWsDir(path) {
    setWsCollapsed((current) => ({ ...current, [path]: !current[path] }));
  }
  function renderFolderIcon(options = {}) {
    const size = options.size || 14;
    return h3(
      "svg",
      {
        viewBox: "0 0 16 16",
        width: size,
        height: size,
        fill: "currentColor",
        stroke: "none",
        "aria-hidden": true,
        className: options.className
      },
      h3("path", { d: "M1.75 3.5A1.5 1.5 0 0 1 3.25 2h3l1.5 2h5A1.5 1.5 0 0 1 14.25 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-9.5a1.5 1.5 0 0 1-1.5-1.5v-9Z" })
    );
  }
  function renderWsNodes(nodes, depth) {
    return nodes.flatMap((node) => {
      if (node.kind === "dir") {
        const collapsed = Boolean(wsCollapsed[node.path]);
        return [
          h3(
            "li",
            { className: "dta-wsDir", key: `dir:${node.path}`, style: { "--dta-depth": depth } },
            h3(
              "button",
              {
                type: "button",
                className: "dta-wsDirToggle",
                "aria-expanded": !collapsed,
                title: node.path,
                onClick: () => toggleWsDir(node.path)
              },
              h3(
                "svg",
                {
                  viewBox: "0 0 16 16",
                  width: 12,
                  height: 12,
                  fill: "currentColor",
                  stroke: "none",
                  "aria-hidden": true,
                  className: "dta-wsChevron",
                  "data-collapsed": collapsed ? "true" : "false"
                },
                h3("path", { d: "M6 3.5 11 8l-5 4.5v-9Z" })
              ),
              renderFolderIcon({ size: 13, className: "dta-wsDirIcon" }),
              h3("span", { className: "dta-wsDirName" }, node.name),
              h3("span", { className: "dta-wsDirCount" }, String(node.count))
            )
          ),
          ...!collapsed ? renderWsNodes(node.children, depth + 1) : []
        ];
      }
      const entry = node.entry;
      const state = wsStatusOf(wsRoot, entry.relPath);
      const openFile = () => state ? openWorkspaceProofread(entry) : translateWorkspaceFile(entry, { autoOpen: true });
      return [h3(
        "li",
        {
          className: "dta-wsRow",
          key: entry.relPath,
          style: { "--dta-depth": depth }
        },
        renderFolderIcon({ size: 12, className: "dta-wsFileIcon" }),
        h3("button", {
          type: "button",
          className: "dta-wsName",
          title: entry.relPath,
          onClick: openFile
        }, node.name),
        h3("span", { className: "dta-wsSize" }, wsFormatSize(entry.size)),
        h3(
          "div",
          { className: "dta-wsRowActions" },
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            disabled: isWorking,
            onClick: () => translateWorkspaceFile(entry, { autoOpen: true })
          }, state ? t("wsRetranslate") : t("wsTranslate"))
        )
      )];
    });
  }
  function renderWorkspaceBanner() {
    if (!wsTarget || !doc) return null;
    const preview = Boolean(wsTarget.plan && wsTarget.plan.preview);
    const specNames = wsSettings.useSpec && wsSpec && wsSpec.docs.length ? wsSpec.docs.map((entry) => entry.name) : [];
    return h3(
      "div",
      { className: "dta-wsBanner" },
      h3("span", { className: "dta-wsBannerTag" }, t("workspace")),
      h3("span", { className: "dta-wsBannerName", title: wsTarget.relPath }, wsTarget.name),
      h3("span", { className: "dta-wsBannerArrow", "aria-hidden": true }, "\u2192"),
      preview ? h3("span", { className: "dta-wsBannerPath" }, t("wsBannerPreview")) : h3(
        "span",
        { className: "dta-wsBannerPath", title: wsTarget.plan.relPath },
        `${t("wsBannerTarget")} ${wsTarget.plan.relPath}`
      ),
      specNames.length ? h3(
        "span",
        {
          className: "dta-wsBannerSpec",
          title: specNames.join(" \xB7 ")
        },
        h3("span", { className: "dta-wsBannerSpecDivider", "aria-hidden": true }),
        h3("span", { className: "dta-wsBannerSpecLabel" }, t("wsBannerSpec")),
        specNames.map((name) => h3("span", {
          key: name,
          className: "dta-wsBannerSpecChip"
        }, name))
      ) : null,
      h3(
        "div",
        { className: "dta-wsBannerActions" },
        preview ? null : h3("button", {
          type: "button",
          className: "dta-btn dta-btn--sm dta-btn--primary",
          disabled: isWorking,
          onClick: handleWsSave
        }, t("wsSaveToFile")),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--sm",
          disabled: isWorking,
          onClick: () => setWsOpen(true)
        }, t("wsBackToList"))
      )
    );
  }
  function renderWorkspaceDrawer() {
    const singleTranslating = Boolean(status && status.kind === "translating" && !wsBatch);
    const pendingCount = wsFiles.filter((entry) => !wsStatusOf(wsRoot, entry.relPath)).length;
    return h3(
      "div",
      { className: "dta-drawerLayer" },
      h3("div", {
        className: "dta-drawerMask",
        "aria-hidden": true,
        onClick: () => setWsOpen(false)
      }),
      h3(
        "aside",
        {
          className: "dta-drawer dta-drawer--workspace",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("workspace")
        },
        h3(
          "div",
          { className: "dta-drawerHead" },
          renderFolderIcon({ size: 15, className: "dta-wsHeadIcon" }),
          h3("h2", { className: "dta-drawerTitle" }, t("workspace")),
          wsFiles.length ? h3("span", { className: "dta-wsCount" }, format(t("wsCount"), { count: wsFiles.length })) : null,
          wsRoot ? h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            disabled: isWorking,
            onClick: () => openWorkspaceRoot(wsRoot)
          }, t("wsRefresh")) : null,
          h3("button", {
            type: "button",
            className: "dta-drawerClose",
            title: t("closePanel"),
            "aria-label": t("closePanel"),
            onClick: () => setWsOpen(false)
          }, "\xD7")
        ),
        h3(
          "div",
          { className: "dta-drawerBody dta-ws" },
          wsRegistry && wsRegistry.available && wsRegistry.workspaces.length ? h3(
            "div",
            { className: "dta-wsRegistry" },
            h3(
              "label",
              { className: "dta-wsField" },
              h3("span", null, t("wsSelectLabel")),
              h3(
                "select",
                {
                  className: "dta-wsSelect",
                  value: wsRegistry.workspaces.some((entry) => entry.id === wsWorkspaceId) ? wsWorkspaceId : wsRegistry.workspaces[0].id,
                  disabled: isWorking,
                  onChange: (event) => {
                    const chosen = wsRegistry.workspaces.find((entry) => entry.id === event.target.value);
                    if (chosen) selectWorkspace(chosen);
                  }
                },
                wsRegistry.workspaces.map((entry) => h3(
                  "option",
                  { key: entry.id, value: entry.id },
                  entry.title || entry.path
                ))
              )
            ),
            wsRoot ? h3("p", { className: "dta-wsRootPath", title: wsRoot }, wsRoot) : null
          ) : null,
          wsRegistry && wsRegistry.available && wsRegistry.workspaces.length === 0 ? h3(
            "div",
            { className: "dta-wsRegistryEmpty" },
            h3("p", { className: "dta-wsEmpty" }, t("wsEmptyRegistry")),
            h3("button", {
              type: "button",
              className: "dta-btn dta-btn--sm",
              disabled: isWorking,
              onClick: refreshWorkspaceRegistry
            }, t("wsReloadRegistry"))
          ) : null,
          wsRegistry && !wsRegistry.available ? h3(
            "div",
            { className: "dta-wsFallback" },
            h3(
              "p",
              { className: "dta-wsHint" },
              wsRegistry.staleHost ? t("wsHostStale") : t("wsUnavailable")
            ),
            wsManualOpen ? h3(
              "div",
              { className: "dta-wsOpenRow" },
              h3("input", {
                className: "dta-wsPath",
                type: "text",
                value: wsRootDraft,
                placeholder: t("wsRootPlaceholder"),
                spellCheck: false,
                "aria-label": t("workspaceHint"),
                disabled: isWorking,
                onChange: (event) => setWsRootDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === "Enter") openWorkspaceRoot(wsRootDraft);
                }
              }),
              h3("button", {
                type: "button",
                className: "dta-btn",
                disabled: isWorking,
                onClick: () => openWorkspaceRoot(wsRootDraft)
              }, t("wsOpen"))
            ) : h3("button", {
              type: "button",
              className: "dta-btn dta-btn--sm",
              disabled: isWorking,
              onClick: () => setWsManualOpen(true)
            }, t("wsManualToggle"))
          ) : null,
          wsRoot ? h3(
            "div",
            { className: "dta-wsSettings" },
            h3(
              "label",
              { className: "dta-wsField" },
              h3("span", null, t("wsOutputLabel")),
              h3(
                "select",
                {
                  className: "dta-wsSelect",
                  value: wsSettings.output,
                  disabled: isWorking,
                  onChange: (event) => setWsSettings((current) => ({ ...current, output: event.target.value }))
                },
                h3("option", { value: "subfolder" }, t("wsOutputSubfolder")),
                h3("option", { value: "suffix" }, t("wsOutputSuffix")),
                h3("option", { value: "overwrite" }, t("wsOutputOverwrite")),
                h3("option", { value: "preview" }, t("wsOutputPreview"))
              )
            ),
            wsSettings.output === "suffix" ? h3(
              "label",
              { className: "dta-wsField" },
              h3("span", null, t("wsSuffixLabel")),
              h3("input", {
                className: "dta-wsSuffix",
                type: "text",
                value: wsSettings.suffix,
                maxLength: 24,
                spellCheck: false,
                disabled: isWorking,
                onChange: (event) => setWsSettings((current) => ({ ...current, suffix: event.target.value }))
              })
            ) : null,
            h3(
              "label",
              { className: "dta-wsField dta-wsCheck" },
              h3("input", {
                type: "checkbox",
                checked: wsSettings.autoSave,
                // Preview mode writes nothing, so auto-save cannot apply.
                disabled: isWorking || wsSettings.output === "preview",
                onChange: (event) => setWsSettings((current) => ({ ...current, autoSave: event.target.checked }))
              }),
              h3("span", null, t("wsAutoSave"))
            ),
            h3(
              "label",
              { className: "dta-wsField dta-wsCheck" },
              h3("input", {
                type: "checkbox",
                checked: wsSettings.useSpec,
                // Nothing to attach when the workspace has no guidelines.
                disabled: isWorking || Boolean(wsSpec && !wsSpec.docs.length),
                onChange: (event) => setWsSettings((current) => ({ ...current, useSpec: event.target.checked }))
              }),
              h3("span", null, t("wsSpecToggle"))
            )
          ) : null,
          wsRoot ? h3(
            "div",
            { className: "dta-wsSpecBar" },
            h3("button", {
              type: "button",
              className: "dta-btn dta-btn--sm dta-btn--primary",
              disabled: isWorking,
              onClick: openSpecDrawer
            }, wsSpec && wsSpec.docs.length ? format(t("wsSpecCount"), { count: wsSpec.docs.length }) : t("wsSpecTitle"))
          ) : null,
          wsRoot && wsFiles.length ? h3(
            "div",
            { className: "dta-wsBatch" },
            h3("button", {
              type: "button",
              className: "dta-btn",
              title: t("wsTranslateAllHint"),
              disabled: isWorking || Boolean(wsBatch) || pendingCount === 0,
              onClick: handleWsTranslateAll
            }, t("wsTranslateAll")),
            wsBatch ? h3(
              "span",
              { className: "dta-wsBatchInfo" },
              format(t("wsBatchProgress"), { done: wsBatch.done, total: wsBatch.total })
            ) : h3(
              "span",
              { className: "dta-wsBatchInfo" },
              pendingCount ? format(t("wsPendingCount"), { count: pendingCount }) : t("wsAllTranslated")
            ),
            singleTranslating ? h3("span", { className: "dta-wsBatchInfo" }, wsTranslatingText()) : null,
            wsBatch || singleTranslating ? renderStopButton(wsBatch ? handleWsStopBatch : handleStopTranslation) : null
          ) : null,
          wsRoot && wsFiles.length === 0 ? h3("p", { className: "dta-wsEmpty" }, t("wsEmpty")) : null,
          wsFiles.length ? h3(
            "ul",
            { className: "dta-wsList", "aria-label": t("wsTreeLabel") },
            renderWsNodes(buildWsTree(wsFiles), 0)
          ) : null
        )
      )
    );
  }
  function renderSpecDrawer() {
    const docs = wsSpec && Array.isArray(wsSpec.docs) ? wsSpec.docs : [];
    const skipped = wsSpec && Array.isArray(wsSpec.skipped) ? wsSpec.skipped : [];
    return h3(
      "div",
      { className: "dta-drawerLayer" },
      h3("div", {
        className: "dta-drawerMask",
        "aria-hidden": true,
        onClick: closeSpecDrawer
      }),
      h3(
        "aside",
        {
          className: "dta-drawer dta-drawer--spec",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("wsSpecTitle")
        },
        h3(
          "div",
          { className: "dta-drawerHead" },
          renderFolderIcon({ size: 15, className: "dta-wsHeadIcon" }),
          h3("h2", { className: "dta-drawerTitle" }, t("wsSpecTitle")),
          docs.length ? h3("span", { className: "dta-wsCount" }, format(t("wsSpecCount"), { count: docs.length })) : null,
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            disabled: isWorking,
            onClick: startSpecCreate
          }, t("wsSpecAdd")),
          h3("button", {
            type: "button",
            className: "dta-drawerClose",
            title: t("closePanel"),
            "aria-label": t("closePanel"),
            onClick: closeSpecDrawer
          }, "\xD7")
        ),
        h3(
          "div",
          { className: "dta-drawerBody dta-wsSpec" },
          h3("p", { className: "dta-wsRootPath", title: ".translation-spec/" }, ".translation-spec/"),
          wsSpecCreating ? h3(
            "div",
            { className: "dta-wsSpecCreate" },
            h3("input", {
              className: "dta-wsSpecInput",
              type: "text",
              placeholder: t("wsSpecNamePlaceholder"),
              value: wsSpecDraftName,
              maxLength: 64,
              spellCheck: false,
              disabled: isWorking,
              onChange: (event) => setWsSpecDraftName(event.target.value)
            }),
            h3("button", {
              type: "button",
              className: "dta-btn dta-btn--sm dta-btn--primary",
              disabled: isWorking,
              onClick: handleSpecCreate
            }, t("wsSpecCreate")),
            h3("button", {
              type: "button",
              className: "dta-btn dta-btn--sm",
              disabled: isWorking,
              onClick: () => setWsSpecCreating(false)
            }, t("promptCancel"))
          ) : null,
          wsSpecEditor ? h3(
            "div",
            { className: "dta-wsSpecEditor" },
            h3(
              "div",
              { className: "dta-wsSpecEditorHead" },
              h3("button", {
                type: "button",
                className: "dta-btn dta-btn--sm",
                disabled: isWorking,
                onClick: () => setWsSpecEditor(null)
              }, t("wsSpecBack")),
              h3("span", { className: "dta-wsSpecEditorName", title: wsSpecEditor.name }, wsSpecEditor.name),
              h3(
                "div",
                { className: "dta-wsSpecHeadActions" },
                h3("button", {
                  type: "button",
                  className: "dta-btn dta-btn--sm dta-btn--primary",
                  disabled: isWorking,
                  onClick: handleSpecSave
                }, t("wsSpecSave")),
                h3("button", {
                  type: "button",
                  className: "dta-btn dta-btn--sm",
                  disabled: isWorking,
                  onClick: () => handleSpecDelete(wsSpecEditor.name)
                }, wsSpecConfirm === wsSpecEditor.name ? t("wsSpecConfirmDelete") : t("wsSpecDelete"))
              )
            ),
            h3("textarea", {
              className: "dta-wsSpecText",
              value: wsSpecEditor.content,
              rows: 14,
              spellCheck: false,
              disabled: isWorking,
              onChange: (event) => setWsSpecEditor(
                (current) => current ? { ...current, content: event.target.value } : current
              )
            })
          ) : h3(
            "div",
            { className: "dta-wsSpecList" },
            docs.length ? docs.map((entry) => h3(
              "button",
              {
                key: entry.name,
                type: "button",
                className: "dta-wsSpecCard",
                disabled: isWorking,
                title: entry.name,
                onClick: () => openSpecEditor(entry.name)
              },
              h3("span", { className: "dta-wsSpecCardName" }, entry.name),
              h3("span", { className: "dta-wsSpecCardSize" }, wsFormatSize(entry.bytes)),
              h3("span", { className: "dta-wsSpecCardChevron", "aria-hidden": true }, "\u203A")
            )) : h3("p", { className: "dta-wsEmpty" }, t("wsSpecEmpty")),
            skipped.length ? h3(
              "div",
              { className: "dta-wsSpecSkipped" },
              skipped.map((entry) => h3("p", {
                key: entry.name,
                className: "dta-wsSpecSkip"
              }, format(t("wsSpecSkipped"), { name: entry.name })))
            ) : null
          )
        )
      )
    );
  }
  function renderLanding() {
    return h3(
      "section",
      { className: "dta-card" },
      h3(
        "div",
        { className: "dta-row" },
        h3(LanguageSelect, {
          label: t("sourceLanguage"),
          value: sourceLanguage,
          includeAuto: true,
          t,
          onChange: setSourceLanguage
        }),
        h3(LanguageSelect, {
          label: t("targetLanguage"),
          value: targetLanguage,
          t,
          onChange: setTargetLanguage
        }),
        transModePicker(),
        h3("span", { className: "dta-count" }, charCount(draft.length)),
        fileName ? h3(
          "span",
          { className: "dta-fileChip", title: t("fileChipHint") },
          h3(
            "svg",
            {
              viewBox: "0 0 16 16",
              width: 12,
              height: 12,
              fill: "none",
              stroke: "currentColor",
              "stroke-width": 1.5,
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": true
            },
            h3("path", { d: "M9 1.9H4.6a1.2 1.2 0 0 0-1.2 1.2v9.8a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.4z" }),
            h3("path", { d: "M9 1.9v3.5h3.6" })
          ),
          h3("span", { className: "dta-fileName" }, fileName),
          h3("button", {
            type: "button",
            className: "dta-fileClear",
            title: t("fileRemove"),
            "aria-label": t("fileRemove"),
            onClick: handleClearFile
          }, "\xD7")
        ) : null
      ),
      h3("textarea", {
        className: "dta-textarea",
        value: draft,
        rows: 12,
        spellCheck: false,
        placeholder: t("sourcePlaceholder"),
        "aria-label": t("sourcePlaceholder"),
        onChange: (event) => setDraft(event.target.value),
        onPaste: handleSourcePaste,
        onDrop: handleSourceDrop,
        onDragOver: (event) => {
          if (event && typeof event.preventDefault === "function") event.preventDefault();
        }
      }),
      h3(
        "div",
        { className: "dta-actions" },
        h3("span", { className: "dta-hint" }, t("fileHint")),
        h3("input", {
          ref: docInputRef,
          type: "file",
          accept: `.txt,.text,.md,.markdown,.log,.html,.htm,.xhtml,.docx,${DOCX_MIME},text/plain,text/markdown,text/html`,
          style: { display: "none" },
          onChange: (event) => {
            const file = event.target.files && event.target.files[0];
            event.target.value = "";
            if (file) handleDocumentFile(file);
          }
        }),
        h3("button", {
          type: "button",
          className: "dta-btn",
          disabled: isWorking,
          onClick: handlePickDocument
        }, t("fileTranslate")),
        h3("input", {
          ref: fileInputRef,
          type: "file",
          accept: "image/*",
          style: { display: "none" },
          onChange: (event) => {
            const file = event.target.files && event.target.files[0];
            event.target.value = "";
            if (file) handleImageFile(file);
          }
        }),
        h3("button", {
          type: "button",
          className: "dta-btn",
          disabled: isWorking,
          onClick: handlePickImage
        }, t("imageTranslate")),
        h3(
          "button",
          {
            type: "button",
            className: "dta-btn dta-btn--primary",
            disabled: isWorking,
            onClick: handleTranslate
          },
          status && (status.kind === "translating" || status.kind === "ocr" || status.kind === "reading") ? h3(BusyDot, null) : null,
          status && (status.kind === "translating" || status.kind === "ocr" || status.kind === "reading") ? statusText : t("translate")
        ),
        // The stop lives with the progress it belongs to: right beside the
        // button that shows it. OCR and file reads are quick and unstoppable.
        status && status.kind === "translating" ? renderStopButton() : null
      )
    );
  }
  function renderSegment(item, index, collection) {
    const busyKind = busy[item.id];
    const cardError = errors[item.id];
    const promptOpen = promptFor === item.id;
    const score = item.score;
    const optimizeButton = showScores && score ? h3(
      React3.Fragment,
      null,
      h3("button", {
        type: "button",
        className: "dta-btn dta-btn--sm",
        title: t("optimizeHint"),
        disabled: busyKind === "retranslate" || busyKind === "optimize",
        onClick: () => handleOptimize(collection, item)
      }, busyKind === "optimize" ? t("optimizing") : t("optimize")),
      busyKind === "optimize" ? renderStopButton(() => handleStopSegment(item.id)) : null
    ) : null;
    return h3(
      "article",
      { className: "dta-seg", key: item.id },
      h3(
        "header",
        { className: "dta-segHead" },
        h3("span", { className: "dta-segIndex" }, `#${index + 1}`),
        showScores && score ? h3(
          "span",
          { className: "dta-scoreBadge", "data-tone": scoreTone(score.value), title: score.comment || "" },
          `${t("scoreLabel")} ${score.value}`
        ) : null,
        h3(
          "div",
          { className: "dta-segActions" },
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            disabled: busyKind === "retranslate" || busyKind === "optimize",
            onClick: () => handleRetranslate(collection, item, "")
          }, busyKind === "retranslate" ? t("retranslating") : t("retranslate")),
          busyKind === "retranslate" ? renderStopButton(() => handleStopSegment(item.id)) : null,
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            "aria-expanded": promptOpen,
            onClick: () => {
              setPromptFor(promptOpen ? null : item.id);
              setPromptText("");
            }
          }, t("addPrompt")),
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            disabled: busyKind === "score",
            onClick: () => handleScore(collection, item)
          }, busyKind === "score" ? t("scoring") : score ? t("rescore") : t("score"))
        )
      ),
      promptOpen ? h3(
        "div",
        { className: "dta-promptBox" },
        h3("input", {
          className: "dta-input",
          value: promptText,
          autoFocus: true,
          maxLength: MAX_PROMPT_CHARS,
          placeholder: t("promptPlaceholder"),
          "aria-label": t("promptPlaceholder"),
          onChange: (event) => setPromptText(String(event.target.value).slice(0, MAX_PROMPT_CHARS)),
          onKeyDown: (event) => {
            if (event.key !== "Enter") return;
            if (event.nativeEvent && event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (promptText.trim()) handleRetranslate(collection, item, promptText);
          }
        }),
        h3("span", { className: "dta-promptCount" }, `${promptText.length}/${MAX_PROMPT_CHARS}`),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--primary",
          disabled: !promptText.trim() || busyKind === "retranslate" || busyKind === "optimize",
          onClick: () => handleRetranslate(collection, item, promptText)
        }, t("promptConfirm")),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--ghost",
          onClick: () => {
            setPromptFor(null);
            setPromptText("");
          }
        }, t("promptCancel"))
      ) : null,
      cardError ? h3("p", { className: "dta-error" }, cardError) : null,
      h3(
        "div",
        { className: "dta-columns" },
        h3(
          "div",
          { className: "dta-col" },
          h3("div", { className: "dta-colHead" }, t("sourceLabel")),
          h3("p", { className: "dta-sourceText" }, item.source)
        ),
        h3(
          "div",
          { className: "dta-col" },
          h3(
            "div",
            { className: "dta-colHead" },
            t("translationLabel"),
            h3("span", { className: "dta-colHint" }, t("editHint"))
          ),
          h3("textarea", {
            className: "dta-translationText",
            value: item.translation,
            rows: rowsFor(item.translation),
            spellCheck: false,
            placeholder: t("targetPlaceholder"),
            "aria-label": `${t("translationLabel")} #${index + 1}`,
            onChange: (event) => patchSegment(collection, item.id, {
              translation: event.target.value,
              score: null
            })
          })
        )
      ),
      showScores && score && score.comment ? h3(
        "div",
        { className: "dta-scoreLine" },
        h3("span", { className: "dta-scoreText" }, `${t("scoreLabel")} ${score.value} \xB7 ${score.comment}`),
        optimizeButton
      ) : optimizeButton ? h3("div", { className: "dta-scoreLine" }, optimizeButton) : null
    );
  }
  function entryMeta(entry) {
    const doc2 = entry.doc;
    const sourceLabel = doc2.sourceLanguage && doc2.sourceLanguage !== "auto" ? doc2.sourceLanguage : t("autoDetect");
    return [
      formatStamp(entry.updatedAt, t),
      `${sourceLabel} \u2192 ${doc2.targetLanguage}`,
      `${paragraphCount(doc2.paragraphs.length)} / ${sentenceCount(doc2.sentences.length)}`
    ].join(" \xB7 ");
  }
  function renderHistoryRow(entry) {
    const active = entry.id === currentId;
    const armed = confirmDeleteId === entry.id;
    const pinned = entry.pinned === true;
    const title = entryTitle(entry.doc, t);
    let snippet = null;
    if (keywords.length > 0) {
      const record = searchRecord(entry);
      snippet = snippetAround(record.text, record.lower, keywords);
    }
    return h3(
      "li",
      {
        key: entry.id,
        className: "dta-historyRow",
        "data-active": active ? "true" : "false",
        "data-pinned": pinned ? "true" : "false"
      },
      h3(
        "button",
        {
          type: "button",
          className: "dta-historyOpen",
          disabled: isWorking,
          "aria-current": active ? "true" : void 0,
          title,
          onClick: () => handleOpenEntry(entry)
        },
        h3("span", { className: "dta-historyTitle" }, highlightText(title, keywords)),
        h3("span", { className: "dta-historyMeta" }, entryMeta(entry)),
        snippet ? h3("span", { className: "dta-historySnippet" }, highlightText(snippet, keywords)) : null
      ),
      h3(
        "button",
        {
          type: "button",
          className: "dta-historyPin",
          "data-pinned": pinned ? "true" : "false",
          "aria-pressed": pinned,
          "aria-label": pinned ? t("unpinEntry") : t("pinEntry"),
          title: pinned ? t("unpinEntry") : t("pinEntry"),
          onClick: () => handleTogglePin(entry.id)
        },
        h3(
          "svg",
          {
            viewBox: "0 0 24 24",
            width: 14,
            height: 14,
            fill: pinned ? "currentColor" : "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            "aria-hidden": true
          },
          h3("path", { d: "M12 17v5" }),
          h3("path", {
            d: "M9 10.8a2 2 0 0 1-1.1 1.8l-1.8.9A2 2 0 0 0 5 15.2V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.8a2 2 0 0 0-1.1-1.8l-1.8-.9A2 2 0 0 1 15 10.8V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"
          })
        )
      ),
      h3("button", {
        type: "button",
        className: "dta-btn dta-btn--sm dta-btn--ghost dta-btn--danger dta-historyDelete",
        "data-arm": armed ? "true" : "false",
        "aria-label": armed ? t("confirmDelete") : t("deleteEntry"),
        title: armed ? t("historyDeleteHint") : t("deleteEntry"),
        disabled: isWorking,
        onClick: () => handleDeleteEntry(entry.id)
      }, armed ? t("confirmDelete") : t("deleteEntry"))
    );
  }
  function renderHistoryDrawer() {
    const total = history.length;
    const searching = keywords.length > 0;
    const summary = searching ? format(t("historyMatchCount"), { count: visibleHistory.length }) : format(t("historyCount"), { count: total });
    return h3(
      "div",
      { className: "dta-drawerLayer" },
      h3("div", {
        className: "dta-drawerMask",
        "aria-hidden": true,
        onClick: closeHistory
      }),
      h3(
        "aside",
        {
          className: "dta-drawer",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("historyTitle")
        },
        h3(
          "div",
          { className: "dta-drawerHead" },
          h3("h2", { className: "dta-drawerTitle" }, t("historyTitle")),
          total ? h3("span", { className: "dta-count" }, summary) : null,
          h3("button", {
            type: "button",
            className: "dta-drawerClose",
            title: t("closePanel"),
            "aria-label": t("closePanel"),
            onClick: closeHistory
          }, "\xD7")
        ),
        h3(
          "div",
          { className: "dta-drawerSearchWrap" },
          h3(
            "div",
            { className: "dta-searchField" },
            h3(
              "svg",
              {
                className: "dta-searchIcon",
                viewBox: "0 0 16 16",
                width: 14,
                height: 14,
                fill: "none",
                "aria-hidden": true
              },
              h3("circle", { cx: 7, cy: 7, r: 4.5, stroke: "currentColor", strokeWidth: 1.4 }),
              h3("path", {
                d: "m10.4 10.4 3.2 3.2",
                stroke: "currentColor",
                strokeWidth: 1.4,
                strokeLinecap: "round"
              })
            ),
            h3("input", {
              className: "dta-input dta-historySearch",
              type: "search",
              ref: historySearchRef,
              value: historyQuery,
              placeholder: t("historySearchPlaceholder"),
              "aria-label": t("historySearch"),
              onChange: (event) => setHistoryQuery(event.target.value),
              onKeyDown: (event) => {
                if (!event || event.key !== "Enter" || visibleHistory.length === 0) return;
                if (typeof event.preventDefault === "function") event.preventDefault();
                handleOpenEntry(visibleHistory[0]);
              }
            }),
            historyQuery ? h3("button", {
              type: "button",
              className: "dta-searchClear",
              title: t("historyClearSearch"),
              "aria-label": t("historyClearSearch"),
              onClick: () => setHistoryQuery("")
            }, "\xD7") : null
          )
        ),
        h3(
          "div",
          { className: "dta-drawerBody" },
          total === 0 ? h3("p", { className: "dta-drawerEmpty" }, t("historyEmpty")) : visibleHistory.length === 0 ? h3("p", { className: "dta-drawerEmpty" }, t("historyNoMatch")) : h3("ul", { className: "dta-historyList" }, visibleHistory.map(renderHistoryRow))
        ),
        h3("p", { className: "dta-drawerFoot" }, format(t("historyHint"), { max: MAX_HISTORY_ENTRIES }))
      )
    );
  }
  function renderVersionRow(version) {
    const armed = confirmDeleteVersion === version.id;
    const diff = doc ? versionDiffCount(version.doc, doc) : 0;
    const head = translationHead(version.doc);
    const score = version.doc.documentScore;
    const scoreText = score ? ` \xB7 ${t("scoreLabel")} ${score.value}` : "";
    return h3(
      "li",
      {
        key: version.id,
        className: "dta-versionRow",
        "data-current": diff === 0 ? "true" : "false"
      },
      h3(
        "div",
        { className: "dta-versionTop" },
        h3("span", { className: "dta-versionTag", "data-kind": version.kind }, versionLabel(version.kind, t)),
        h3("span", { className: "dta-versionTime" }, formatStamp(version.at, t)),
        h3(
          "span",
          {
            className: "dta-versionDiff",
            title: score && score.comment ? `${t("scoreLabel")} ${score.value} \xB7 ${score.comment}` : ""
          },
          diff === 0 ? t("versionSame") : format(t("versionDiff"), { count: diff }),
          scoreText
        )
      ),
      head ? h3("p", { className: "dta-versionText" }, head) : null,
      h3(
        "div",
        { className: "dta-versionActions" },
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--sm",
          disabled: isWorking || diff === 0,
          title: diff === 0 ? t("versionSame") : t("versionRestore"),
          onClick: () => handleRestoreVersion(version)
        }, t("versionRestore")),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--sm dta-btn--ghost dta-btn--danger",
          "data-arm": armed ? "true" : "false",
          title: armed ? t("historyDeleteHint") : t("versionDelete"),
          disabled: isWorking,
          onClick: () => handleDeleteVersion(version.id)
        }, armed ? t("confirmDelete") : t("versionDelete"))
      )
    );
  }
  function renderVersionsDrawer() {
    const total = versions.length;
    const head = translationHead(doc);
    const currentScore = doc ? doc.documentScore : null;
    return h3(
      "div",
      { className: "dta-drawerLayer" },
      h3("div", {
        className: "dta-drawerMask",
        "aria-hidden": true,
        onClick: closeVersions
      }),
      h3(
        "aside",
        {
          className: "dta-drawer dta-drawer--versions",
          role: "dialog",
          "aria-modal": "true",
          "aria-label": t("versions")
        },
        h3(
          "div",
          { className: "dta-drawerHead" },
          h3("h2", { className: "dta-drawerTitle" }, t("versions")),
          total ? h3("span", { className: "dta-count" }, format(t("versionsCount"), { count: total })) : null,
          h3("button", {
            type: "button",
            className: "dta-drawerClose",
            title: t("closePanel"),
            "aria-label": t("closePanel"),
            onClick: closeVersions
          }, "\xD7")
        ),
        h3(
          "div",
          { className: "dta-versionBar" },
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            title: t("versionSaveHint"),
            disabled: isWorking,
            onClick: handleSaveVersion
          }, t("versionSave"))
        ),
        h3(
          "div",
          { className: "dta-drawerBody" },
          doc ? h3(
            "div",
            { className: "dta-versionCurrent" },
            h3(
              "div",
              { className: "dta-versionTop" },
              h3("span", { className: "dta-versionCurrentLabel" }, t("versionCurrent")),
              h3(
                "span",
                { className: "dta-versionTime" },
                `${paragraphCount(doc.paragraphs.length)} / ${sentenceCount(doc.sentences.length)}`
              ),
              currentScore ? h3("span", { className: "dta-versionDiff" }, `${t("scoreLabel")} ${currentScore.value}`) : null
            ),
            head ? h3("p", { className: "dta-versionText" }, head) : null
          ) : null,
          total === 0 ? h3("p", { className: "dta-drawerEmpty" }, t("versionsEmpty")) : h3("ul", { className: "dta-versionList" }, versions.map(renderVersionRow))
        ),
        h3("p", { className: "dta-drawerFoot" }, format(t("versionsFoot"), { max: MAX_VERSIONS }))
      )
    );
  }
  function renderDocument() {
    const scoringStatus = status && status.kind === "scoring";
    const optimizingStatus = status && status.kind === "optimizing";
    const allScored = items.length > 0 && items.some((item) => item.translation.trim()) && items.every((item) => !item.translation.trim() || item.score && Number.isFinite(Number(item.score.value)));
    return h3(
      React3.Fragment,
      null,
      h3(
        "section",
        { className: "dta-card" },
        h3(
          "div",
          { className: "dta-toolbar" },
          h3(LanguageSelect, {
            label: t("sourceLanguage"),
            value: sourceLanguage,
            includeAuto: true,
            t,
            onChange: (value) => {
              setSourceLanguage(value);
              setNotice({ kind: "info", text: t("languageChangeHint") });
            }
          }),
          h3(LanguageSelect, {
            label: t("targetLanguage"),
            value: targetLanguage,
            t,
            onChange: (value) => {
              setTargetLanguage(value);
              setNotice({ kind: "info", text: t("languageChangeHint") });
            }
          }),
          h3(
            "div",
            { className: "dta-tabs", role: "tablist", "aria-label": t("viewLabel") },
            h3("button", {
              type: "button",
              role: "tab",
              className: "dta-tab",
              "aria-selected": view === "paragraphs",
              onClick: () => setView("paragraphs")
            }, t("paragraphs")),
            h3("button", {
              type: "button",
              role: "tab",
              className: "dta-tab",
              "aria-selected": view === "sentences",
              onClick: () => setView("sentences")
            }, t("sentences")),
            h3("button", {
              type: "button",
              role: "tab",
              className: "dta-tab",
              "aria-selected": view === "full",
              onClick: () => setView("full")
            }, t("fullText"))
          ),
          h3("div", { className: "dta-toolbarSpacer" }),
          // An imported document keeps showing where it came from, so the
          // download name and the source file stay obvious after a reload.
          doc && doc.fileName ? h3(
            "span",
            { className: "dta-fileChip", title: t("fileChipHint") },
            h3(
              "svg",
              {
                viewBox: "0 0 16 16",
                width: 12,
                height: 12,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 1.5,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": true
              },
              h3("path", { d: "M9 1.9H4.6a1.2 1.2 0 0 0-1.2 1.2v9.8a1.2 1.2 0 0 0 1.2 1.2h6.8a1.2 1.2 0 0 0 1.2-1.2V5.4z" }),
              h3("path", { d: "M9 1.9v3.5h3.6" })
            ),
            h3("span", { className: "dta-fileName" }, doc.fileName)
          ) : null,
          h3(
            "span",
            { className: "dta-count" },
            view === "full" ? charCount(fullMode === "source" ? fullSourceLength : fullTranslation.length) : collectionKey === "sentences" ? sentenceCount(items.length) : paragraphCount(items.length)
          ),
          h3("button", {
            type: "button",
            className: "dta-btn",
            "aria-pressed": showScores,
            onClick: toggleScores
          }, showScores ? t("hideScores") : t("showScores")),
          view === "full" ? h3("button", {
            type: "button",
            className: "dta-btn",
            disabled: isWorking,
            onClick: handleScoreFull
          }, fullScoreBusy ? t("scoring") : fullScore ? t("rescore") : t("scoreFull")) : h3(
            React3.Fragment,
            null,
            h3("button", {
              type: "button",
              className: "dta-btn",
              disabled: isWorking,
              onClick: handleScoreAll
            }, scoringStatus ? format(t("scoreAllProgress"), { done: status.done, total: status.total }) : allScored ? t("rescore") : t("scoreAll")),
            // Suggestions are only as good as the scores behind them, so
            // the batch action waits until the whole view has been scored
            // and the scores are actually visible.
            showScores && allScored ? h3(
              React3.Fragment,
              null,
              h3("button", {
                type: "button",
                className: "dta-btn",
                title: t("optimizeAllHint"),
                disabled: isWorking,
                onClick: handleOptimizeAll
              }, optimizingStatus ? format(t("optimizeProgress"), { done: status.done, total: status.total }) : t("optimizeAll")),
              optimizingStatus ? renderStopButton() : null
            ) : null
          )
        )
      ),
      view === "full" ? renderFullText() : h3(
        "div",
        { className: "dta-list" },
        items.map((item, index) => renderSegment(item, index, collectionKey))
      )
    );
  }
  function handleFullTranslationChange(text) {
    setDoc((current) => applyFullTranslationEdit(current, text));
  }
  function renderFullText() {
    const fullSource = doc ? doc.sourceText : "";
    const optimizing = status && status.kind === "optimizing";
    const fullRetranslating = status && status.kind === "retranslatingFull";
    const modes = [
      { key: "translation", label: t("fullModeTranslation") },
      { key: "source", label: t("fullModeSource") },
      { key: "both", label: t("fullModeBoth") }
    ];
    const translationBox = h3("textarea", {
      className: cx("dta-fullText", fullMode === "both" && "dta-fullText--pane"),
      value: fullTranslation,
      rows: fullMode === "both" ? 18 : 20,
      spellCheck: false,
      placeholder: t("emptyFull"),
      "aria-label": t("fullText"),
      onChange: (event) => handleFullTranslationChange(event.target.value)
    });
    return h3(
      "section",
      { className: "dta-card" },
      h3(
        "div",
        { className: "dta-toolbar" },
        h3(
          "div",
          { className: "dta-tabs", role: "tablist", "aria-label": t("fullModeLabel") },
          modes.map((mode) => h3("button", {
            key: mode.key,
            type: "button",
            role: "tab",
            className: "dta-tab",
            "aria-selected": fullMode === mode.key,
            onClick: () => setFullMode(mode.key)
          }, mode.label))
        ),
        showScores && fullScore ? h3(
          "span",
          { className: "dta-scoreBadge", "data-tone": scoreTone(fullScore.value), title: fullScore.comment || "" },
          `${t("scoreLabel")} ${fullScore.value}`
        ) : null,
        h3("div", { className: "dta-toolbarSpacer" }),
        transModePicker(),
        h3(
          React3.Fragment,
          null,
          h3("button", {
            type: "button",
            className: "dta-btn",
            title: t("fullRetranslateHint"),
            disabled: isWorking,
            onClick: () => runFullRetranslate("")
          }, fullRetranslating ? status.total ? format(t("retranslateAllProgress"), { done: status.done, total: status.total }) : status.array ? t("retranslateArrayBusy") : t("retranslateFullBusy") : t("retranslate")),
          fullRetranslating ? renderStopButton() : null
        ),
        h3("button", {
          type: "button",
          className: "dta-btn",
          "aria-expanded": promptFor === "full",
          disabled: isWorking,
          onClick: () => {
            setPromptFor(promptFor === "full" ? null : "full");
            setPromptText("");
          }
        }, t("addPrompt")),
        h3(
          "button",
          {
            type: "button",
            className: "dta-btn",
            title: t("downloadTranslation"),
            onClick: handleDownload
          },
          h3(
            "svg",
            {
              viewBox: "0 0 16 16",
              width: 12,
              height: 12,
              fill: "none",
              stroke: "currentColor",
              "stroke-width": 1.6,
              "stroke-linecap": "round",
              "stroke-linejoin": "round",
              "aria-hidden": true
            },
            h3("path", { d: "M8 2.8v7.4" }),
            h3("path", { d: "M5 7.2 8 10.2l3-3" }),
            h3("path", { d: "M3 12.6h10" })
          ),
          h3("span", null, t("downloadTranslation"))
        ),
        h3("button", {
          type: "button",
          className: "dta-btn",
          onClick: () => handleCopy("source")
        }, copied === "source" ? t("copied") : t("copySource")),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--primary",
          onClick: () => handleCopy("translation")
        }, copied === "translation" ? t("copied") : t("copyTranslation"))
      ),
      promptFor === "full" ? h3(
        "div",
        { className: "dta-promptBox" },
        h3("input", {
          className: "dta-input",
          value: promptText,
          autoFocus: true,
          maxLength: MAX_PROMPT_CHARS,
          placeholder: t("promptPlaceholder"),
          "aria-label": t("promptPlaceholder"),
          onChange: (event) => setPromptText(String(event.target.value).slice(0, MAX_PROMPT_CHARS)),
          onKeyDown: (event) => {
            if (event.key !== "Enter") return;
            if (event.nativeEvent && event.nativeEvent.isComposing) return;
            event.preventDefault();
            if (promptText.trim() && !isWorking) runFullRetranslate(promptText);
          }
        }),
        h3("span", { className: "dta-promptCount" }, `${promptText.length}/${MAX_PROMPT_CHARS}`),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--primary",
          disabled: !promptText.trim() || isWorking,
          onClick: () => runFullRetranslate(promptText)
        }, t("promptConfirm")),
        h3("button", {
          type: "button",
          className: "dta-btn dta-btn--ghost",
          onClick: () => {
            setPromptFor(null);
            setPromptText("");
          }
        }, t("promptCancel"))
      ) : null,
      fullMode === "both" ? h3(
        "div",
        { className: "dta-columns dta-fullCols" },
        h3(
          "div",
          { className: "dta-col" },
          h3("div", { className: "dta-colHead" }, t("sourceLabel")),
          h3("div", { className: "dta-fullSource" }, fullSource)
        ),
        h3(
          "div",
          { className: "dta-col" },
          h3(
            "div",
            { className: "dta-colHead" },
            t("translationLabel"),
            h3("span", { className: "dta-colHint" }, t("editHint"))
          ),
          translationBox
        )
      ) : fullMode === "source" ? h3("div", { className: "dta-fullSource", role: "textbox", "aria-readonly": true, "aria-label": t("sourceLabel") }, fullSource) : translationBox,
      // The document suggestion reads the full-text feedback, so it sits at
      // the end of the score line that shows that feedback.
      showScores && fullScore ? h3(
        "div",
        { className: "dta-scoreLine" },
        fullScore.comment ? h3("span", { className: "dta-scoreText" }, `${t("scoreLabel")} ${fullScore.value} \xB7 ${fullScore.comment}`) : null,
        h3(
          React3.Fragment,
          null,
          h3("button", {
            type: "button",
            className: "dta-btn dta-btn--sm",
            title: t("optimizeFullHint"),
            disabled: isWorking,
            onClick: handleOptimizeFull
          }, optimizing ? format(t("optimizeProgress"), { done: status.done, total: status.total }) : t("optimize")),
          optimizing ? renderStopButton() : null
        )
      ) : null,
      h3("p", { className: "dta-hint" }, t("fullTextHint"))
    );
  }
  const headDocTitle = doc ? entryTitle(doc, t) : "";
  return h3(
    React3.Fragment,
    null,
    h3("style", { key: "dta-styles" }, styles_default),
    h3(
      "div",
      { className: "dta-page" },
      h3(
        "header",
        { className: "dta-head" },
        h3(
          "div",
          { className: "dta-headTop" },
          h3("h1", { className: "dta-title" }, t("title")),
          h3(
            "button",
            {
              type: "button",
              className: "dta-btn dta-btn--sm dta-histBtn",
              "aria-expanded": historyOpen,
              "data-active": historyOpen ? "true" : "false",
              "aria-label": doc ? `${t("historyTitle")} \xB7 ${t("historyCurrent")}: ${headDocTitle}` : t("historyTitle"),
              title: doc ? `${headDocTitle} \xB7 ${t("historySwitchHint")}` : t("historySwitchHint"),
              onClick: () => {
                if (historyOpen) closeHistory();
                else openHistory();
              }
            },
            h3(
              "svg",
              {
                className: "dta-histIcon",
                viewBox: "0 0 16 16",
                width: 13,
                height: 13,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 1.5,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": true
              },
              h3("path", { d: "M2.6 8a5.4 5.4 0 1 0 1.8-4" }),
              h3("path", { d: "M2.1 2.3v2.6h2.6" }),
              h3("path", { d: "M8 5.4V8l1.9 1.2" })
            ),
            h3("span", { className: "dta-histLabel" }, doc ? headDocTitle : t("historyTitle")),
            h3(
              "svg",
              {
                className: "dta-histCaret",
                viewBox: "0 0 16 16",
                width: 11,
                height: 11,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 1.7,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": true
              },
              h3("path", { d: "M4.4 6.4 8 10l3.6-3.6" })
            )
          ),
          // Starting a new document belongs next to the history switcher:
          // both move between documents, not between segments.
          doc ? h3(
            "button",
            {
              type: "button",
              className: "dta-btn dta-btn--sm dta-btn--ghost dta-newBtn",
              disabled: isWorking,
              title: t("newTranslationHint"),
              onClick: handleNewTranslation
            },
            h3(
              "svg",
              {
                viewBox: "0 0 16 16",
                width: 12,
                height: 12,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 1.8,
                "stroke-linecap": "round",
                "aria-hidden": true
              },
              h3("path", { d: "M8 3.4v9.2" }),
              h3("path", { d: "M3.4 8h9.2" })
            ),
            h3("span", null, t("newTranslation"))
          ) : null,
          // The workspace toggle lives with the document-level actions:
          // it replaces the page body, not the current document.
          h3(
            "button",
            {
              type: "button",
              className: "dta-btn dta-btn--sm dta-btn--ghost dta-wsBtn",
              "data-active": wsOpen ? "true" : "false",
              "aria-pressed": wsOpen,
              title: t("workspaceHint"),
              onClick: toggleWorkspace
            },
            h3(
              "svg",
              {
                viewBox: "0 0 16 16",
                width: 12,
                height: 12,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 1.6,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": true
              },
              h3("path", { d: "M1.9 4.4a1.2 1.2 0 0 1 1.2-1.2h2.8l1.5 1.6h5.5a1.2 1.2 0 0 1 1.2 1.2v6a1.2 1.2 0 0 1-1.2 1.2H3.1a1.2 1.2 0 0 1-1.2-1.2z" })
            ),
            // While a workspace file is open, the button names the
            // workspace instead of the generic label.
            h3("span", null, wsTarget && doc && wsDisplayName() || t("workspace"))
          ),
          // Revisions describe the open document's own text, so the entry
          // sits with the document actions rather than in the toolbar.
          doc ? h3(
            "button",
            {
              type: "button",
              className: "dta-btn dta-btn--sm dta-btn--ghost dta-versionsBtn",
              "aria-expanded": versionsOpen,
              "aria-label": versions.length ? `${t("versions")} \xB7 ${format(t("versionsCount"), { count: versions.length })}` : t("versions"),
              "data-active": versionsOpen ? "true" : "false",
              title: t("versionsHint"),
              onClick: () => {
                if (versionsOpen) closeVersions();
                else openVersions();
              }
            },
            h3(
              "svg",
              {
                viewBox: "0 0 16 16",
                width: 12,
                height: 12,
                fill: "none",
                stroke: "currentColor",
                "stroke-width": 1.6,
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": true
              },
              h3("circle", { cx: 8, cy: 8, r: 5.4 }),
              h3("path", { d: "M8 4.9v3.4l2.2 1.3" })
            ),
            h3("span", null, versions.length ? `${t("versions")} ${versions.length}` : t("versions"))
          ) : null,
          h3(
            "span",
            {
              className: cx("dta-engine", canSwitchModel && "dta-engine--picker"),
              "data-state": engineState,
              title: engineTitle
            },
            h3("span", { className: "dta-engineDot", "aria-hidden": true }),
            canSwitchModel ? h3(
              "select",
              {
                className: "dta-modelSelect",
                value: route ? routeId(route) : "default",
                "aria-label": t("modelPicker"),
                title: t("modelPicker"),
                onChange: (event) => handleRouteChange(event.target.value)
              },
              h3(
                "option",
                { value: "default" },
                `${t("modelFollowDefault")} \xB7 ${defaultModel ? defaultModel.split("/").pop() : t("modelUnknown")}`
              ),
              routeGroups.length > 1 ? routeGroups.map((group) => h3("optgroup", {
                key: group.provider,
                label: group.label
              }, group.items.map((entry) => h3("option", {
                key: routeId(entry),
                value: routeId(entry),
                title: routeId(entry)
              }, entry.label || entry.model)))) : routes.map((entry) => h3("option", {
                key: routeId(entry),
                value: routeId(entry),
                title: routeId(entry)
              }, entry.label || entry.model))
            ) : h3("span", null, `${t("modelLabel")}: ${routeLabel}`)
          )
        ),
        h3("p", { className: "dta-intro" }, t("intro"))
      ),
      h3(
        React3.Fragment,
        null,
        wsTarget && doc ? renderWorkspaceBanner() : null,
        doc ? renderDocument() : renderLanding()
      ),
      h3(
        "footer",
        { className: "dta-footer" },
        h3("span", null, t("saveHint")),
        h3("span", null, t("footerHint"))
      )
    ),
    historyOpen ? renderHistoryDrawer() : null,
    versionsOpen ? renderVersionsDrawer() : null,
    wsOpen ? renderWorkspaceDrawer() : null,
    wsSpecOpen ? renderSpecDrawer() : null,
    notice ? h3(
      "div",
      { className: `dta-toast dta-toast--${notice.kind}`, role: "status" },
      h3("span", { className: "dta-toastText" }, notice.text),
      h3("button", {
        type: "button",
        className: "dta-toastClose",
        "aria-label": t("toastClose"),
        onClick: () => setNotice(null)
      }, "\xD7")
    ) : null
  );
}

// src/client/index.ts
var plugin = {
  inject: ["slots", "locale"],
  apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), "translation-assistant: dictionaries");
    const t = ctx.locale.bind(NS);
    ctx.slots.inject("main", () => ctx.slots.register({
      name: "main",
      key: PANEL_ID,
      locale: NS
    }, TranslationPage));
    ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
      name: "sidebar.panellist",
      id: PANEL_ID,
      order: 20,
      locale: NS,
      label: () => t("panel")
    }, TranslationPanelIcon));
  }
};
var inject = plugin.inject;
var apply = plugin.apply;
return module.exports; } });
