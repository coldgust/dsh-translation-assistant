import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TranslationEngine,
  mapLimit,
  parseJsonLoose,
  parseScore,
  stripWrapping,
} from '../host/engine.js';

/**
 * Build a fake abstract-LLM service. `script` is either a list of replies or a
 * function `(options, index) => reply`; a reply is a string (text + stop
 * finish), `{ failure }` (error finish), or `'abort'` (aborted finish).
 * @param {unknown} script - replies to stream.
 * @returns {object} fake llm service carrying the captured calls.
 */
function makeLlm(script) {
  const calls = [];
  const llm = {
    calls,
    stream(options) {
      const index = calls.length;
      calls.push(options);
      const reply = typeof script === 'function'
        ? script(options, index)
        : script[Math.min(index, script.length - 1)];
      return (async function* stream() {
        if (reply === 'abort') {
          yield { type: 'finish', reason: { kind: 'aborted', failure: { message: 'aborted', code: 'aborted' } } };
          return;
        }
        if (reply === 'max-tokens') {
          yield { type: 'finish', reason: { kind: 'max-tokens' } };
          return;
        }
        if (reply && typeof reply === 'object' && reply.failure) {
          yield { type: 'finish', reason: { kind: 'error', failure: reply.failure } };
          return;
        }
        yield { type: 'text-delta', index: 0, text: String(reply) };
        yield { type: 'finish', reason: { kind: 'stop' } };
      })();
    },
  };
  return llm;
}

/** Create an engine backed by a fake llm. */
function makeEngine(llm, settings = {}) {
  return new TranslationEngine({
    llm,
    settings: { sentenceChunk: 16, paragraphChunk: 6, concurrency: 3, maxTokens: 4096, ...settings },
    resolveTarget: () => ({ provider: 'deepseek-account', model: 'deepseek-flash' }),
  });
}

test('translateBatch parses an aligned JSON array from one call', async () => {
  const llm = makeLlm(['["你好", "世界"]']);
  const engine = makeEngine(llm);
  const out = await engine.translateBatch({
    segments: ['Hello', 'World'],
    kind: 'sentence',
    targetLanguage: '中文',
  });
  assert.deepEqual(out, ['你好', '世界']);
  assert.equal(llm.calls.length, 1);
  const prompt = llm.calls[0].messages[0].content[0].text;
  assert.match(prompt, /JSON array/);
  assert.match(prompt, /Target language: 中文/);
});

test('a per-call route overrides the configured model', async () => {
  const llm = makeLlm(['["你好"]']);
  const engine = makeEngine(llm);
  const out = await engine.translateBatch({
    segments: ['Hello'],
    kind: 'sentence',
    targetLanguage: '中文',
    route: { provider: 'other-provider', model: 'big-model' },
  });
  assert.deepEqual(out, ['你好']);
  assert.equal(llm.calls[0].provider, 'other-provider');
  assert.equal(llm.calls[0].model, 'big-model');
  assert.equal(engine.modelLabel({ provider: 'other-provider', model: 'big-model' }), 'other-provider/big-model');
  // Without an override the configured route is used again.
  await engine.translateBatch({ segments: ['Hi'], kind: 'sentence', targetLanguage: '中文' });
  assert.equal(llm.calls[1].provider, 'deepseek-account');
  assert.equal(llm.calls[1].model, 'deepseek-flash');
});

test('translateBatch falls back to per-segment calls when the reply is not JSON', async () => {  const llm = makeLlm((_options, index) => (index === 0 ? 'Sorry, no JSON here.' : index === 1 ? '"甲"' : '乙'));
  const engine = makeEngine(llm);
  const out = await engine.translateBatch({
    segments: ['A', 'B'],
    kind: 'sentence',
    targetLanguage: '中文',
  });
  assert.deepEqual(out, ['甲', '乙']);
  assert.equal(llm.calls.length, 3);
});

test('translateBatch falls back when the array length does not match', async () => {
  const llm = makeLlm((_options, index) => (index === 0 ? '["only-one"]' : '单段'));
  const engine = makeEngine(llm);
  const out = await engine.translateBatch({
    segments: ['A', 'B'],
    kind: 'paragraph',
    targetLanguage: 'English',
  });
  assert.deepEqual(out, ['单段', '单段']);
  assert.equal(llm.calls.length, 3);
});

test('translateBatch chunks large inputs', async () => {
  const llm = makeLlm((_options, index) => JSON.stringify([`t${index}a`, `t${index}b`]));
  const engine = makeEngine(llm, { sentenceChunk: 2 });
  const out = await engine.translateBatch({
    segments: ['a', 'b', 'c', 'd'],
    kind: 'sentence',
    targetLanguage: '中文',
  });
  assert.equal(out.length, 4);
  assert.equal(llm.calls.length, 2);
});

test('retranslate forwards the user instruction and strips wrapping quotes', async () => {
  const llm = makeLlm(['“更口语化的译文”']);
  const engine = makeEngine(llm);
  const out = await engine.retranslate({
    source: 'Hello there',
    translation: '你好',
    extraPrompt: 'more casual',
    kind: 'sentence',
    targetLanguage: '中文',
  });
  assert.equal(out, '更口语化的译文');
  const prompt = llm.calls[0].messages[0].content[0].text;
  assert.match(prompt, /more casual/);
  assert.match(prompt, /Current translation/);
});

test('score parses fenced JSON, clamps, and keeps the comment', async () => {
  const llm = makeLlm(['```json\n{"score": 120, "comment": "意思到位但略生硬"}\n```']);
  const engine = makeEngine(llm);
  const out = await engine.score({
    source: 'Hello',
    translation: '你好',
    targetLanguage: '中文',
  });
  assert.deepEqual(out, { score: 100, comment: '意思到位但略生硬' });
});

test('score rejects a reply without a numeric score', async () => {
  const llm = makeLlm(['{"comment": "no score"}']);
  const engine = makeEngine(llm);
  await assert.rejects(
    () => engine.score({ source: 'Hello', translation: '你好', targetLanguage: '中文' }),
    (error) => error.code === 'LLM_BAD_SCORE',
  );
});

test('parseScore prefers the plain SCORE/COMMENT protocol', () => {
  assert.deepEqual(parseScore('SCORE: 87\nCOMMENT: 自然流畅'), { score: 87, comment: '自然流畅' });
  assert.deepEqual(parseScore('评分：73'), { score: 73, comment: '' });
});

test('score retries once when the reply is malformed', async () => {
  const llm = makeLlm((_options, index) => (index === 0 ? 'The translation reads well.' : 'SCORE: 91\nCOMMENT: 不错'));
  const engine = makeEngine(llm);
  const out = await engine.score({ source: 'Hello', translation: '你好', targetLanguage: '中文' });
  assert.deepEqual(out, { score: 91, comment: '不错' });
  assert.equal(llm.calls.length, 2);
});

test('score reports LLM_BAD_SCORE after retries with a raw preview', async () => {
  const llm = makeLlm(['no numbers at all']);
  const engine = makeEngine(llm);
  await assert.rejects(
    () => engine.score({ source: 'Hello', translation: '你好', targetLanguage: '中文' }),
    (error) => error.code === 'LLM_BAD_SCORE' && /no numbers/.test(error.detail),
  );
  assert.equal(llm.calls.length, 2);
});

test('translateBatch retries one transient provider failure', async () => {
  const llm = makeLlm((_options, index) => (
    index === 0
      ? { failure: { message: 'busy', code: 'RATE_LIMIT', status: 429 } }
      : '["你好"]'
  ));
  const engine = makeEngine(llm);
  const out = await engine.translateBatch({ segments: ['Hello'], kind: 'sentence', targetLanguage: '中文' });
  assert.deepEqual(out, ['你好']);
  assert.equal(llm.calls.length, 2);
});

test('an empty reply is retried once', async () => {
  const llm = makeLlm((_options, index) => (index === 0 ? '' : '["好"]'));
  const engine = makeEngine(llm);
  const out = await engine.translateBatch({ segments: ['Good'], kind: 'sentence', targetLanguage: '中文' });
  assert.deepEqual(out, ['好']);
  assert.equal(llm.calls.length, 2);
});

test('a failed finish rejects with the provider failure', async () => {
  const llm = makeLlm([{ failure: { message: 'quota exceeded', code: 'RATE_LIMIT', status: 429 } }]);
  const engine = makeEngine(llm);
  await assert.rejects(
    () => engine.translateBatch({ segments: ['A'], kind: 'sentence', targetLanguage: '中文' }),
    (error) => error.message === 'quota exceeded' && error.code === 'RATE_LIMIT' && error.status === 429,
  );
});

test('an aborted finish rejects with an AbortError', async () => {
  const llm = makeLlm(['abort']);
  const engine = makeEngine(llm);
  await assert.rejects(
    () => engine.retranslate({ source: 'A', targetLanguage: '中文' }),
    (error) => error.name === 'AbortError',
  );
});

test('a max-tokens finish rejects instead of returning truncated text', async () => {
  const llm = makeLlm(['max-tokens']);
  const engine = makeEngine(llm);
  await assert.rejects(
    () => engine.translateBatch({ segments: ['A'], kind: 'sentence', targetLanguage: '中文' }),
    (error) => error.code === 'LLM_TRUNCATED',
  );
});

test('a missing model route reports NO_MODEL', async () => {
  const engine = new TranslationEngine({
    llm: makeLlm(['ignored']),
    settings: {},
    resolveTarget: () => undefined,
  });
  await assert.rejects(
    () => engine.translateBatch({ segments: ['A'], kind: 'sentence', targetLanguage: '中文' }),
    (error) => error.code === 'NO_MODEL',
  );
});

test('ocr sends an image block and returns the transcription', async () => {
  const llm = makeLlm(['Hello world.\nSecond line.']);
  llm.resolveModelInfo = async () => ({ provider: 'p', model: 'm', inputModalities: ['text', 'image'] });
  const engine = makeEngine(llm);
  const text = await engine.ocr({ image: { attachmentId: 'a', mediaType: 'image/png', bytes: 4, width: 2, height: 2 } });
  assert.equal(text, 'Hello world.\nSecond line.');
  const content = llm.calls[0].messages[0].content;
  assert.equal(content[0].type, 'image');
  assert.equal(content[1].type, 'text');
});

test('ocr rejects when the model cannot read images', async () => {
  const llm = makeLlm(['unused']);
  llm.resolveModelInfo = async () => ({ inputModalities: ['text'] });
  const engine = makeEngine(llm);
  await assert.rejects(
    () => engine.ocr({ image: { attachmentId: 'a', mediaType: 'image/png', bytes: 4, width: 2, height: 2 } }),
    (error) => error.code === 'NO_VISION',
  );
  assert.equal(llm.calls.length, 0);
});

test('scoreDocument scores the whole document with the shared protocol', async () => {
  const llm = makeLlm(['SCORE: 90\nCOMMENT: 整体一致，表达自然']);
  const engine = makeEngine(llm);
  const out = await engine.scoreDocument({
    source: 'Paragraph one.\n\nParagraph two.',
    translation: '第一段。\n\n第二段。',
    targetLanguage: '中文',
  });
  assert.deepEqual(out, { score: 90, comment: '整体一致，表达自然' });
  assert.match(llm.calls[0].messages[0].content[0].text, /whole document/);
});

test('parseJsonLoose tolerates fences and surrounding prose', () => {
  assert.deepEqual(parseJsonLoose('```json\n[1,2]\n```'), [1, 2]);
  assert.deepEqual(parseJsonLoose('Here you go: {"a": 1} thanks'), { a: 1 });
  assert.deepEqual(parseJsonLoose('["a", "b"]'), ['a', 'b']);
});

test('stripWrapping removes fences, labels, and one quote layer', () => {
  assert.equal(stripWrapping('```\n你好\n```'), '你好');
  assert.equal(stripWrapping('Translation: 你好'), '你好');
  assert.equal(stripWrapping('"你好"'), '你好');
  assert.equal(stripWrapping('多行\n引号"不应"被剥'), '多行\n引号"不应"被剥');
});

test('mapLimit preserves order and respects the concurrency bound', async () => {
  let active = 0;
  let peak = 0;
  const out = await mapLimit([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(out, [2, 4, 6, 8, 10]);
  assert.ok(peak <= 2, `peak concurrency was ${peak}`);
});
