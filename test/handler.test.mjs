import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

import { apply } from '../host/index.js';

import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Mirror the Host's length caps (they are not exported).
const MAX_SEGMENT_CHARS = 20_000;
const MAX_DOCUMENT_TOTAL_CHARS = 120_000;

/**
 * Build a fake abstract-LLM service.
 *
 * `listing` mirrors the documented registry surface — `listProviders()` names
 * the routes and `listModels(providerId)` asks one adapter — which is how the
 * Host learns what it can actually route to.
 * @param {(options: object, index: number) => unknown} replyFor - reply producer.
 * @param {Record<string, (string | object)[]>} [listing] - provider id to advertised models.
 * @returns {object} fake llm service.
 */
function makeLlm(replyFor, listing) {
  const calls = [];
  return {
    calls,
    listModels(provider) {
      if (!listing || !(provider in listing)) {
        const error = new Error(`no adapter registered for provider "${String(provider)}"`);
        error.code = 'NO_ADAPTER';
        throw error;
      }
      return Promise.resolve(listing[provider].map((model) => (typeof model === 'string'
        ? { provider, id: model, name: model }
        : { provider, ...model })));
    },
    listProviders() {
      return Object.keys(listing ?? {}).map((id) => ({ id, name: id === 'deepseek-account' ? 'DeepSeek' : id }));
    },
    stream(options) {
      const index = calls.length;
      calls.push(options);
      const reply = replyFor(options, index);
      return (async function* stream() {
        yield { type: 'text-delta', index: 0, text: String(reply) };
        yield { type: 'finish', reason: { kind: 'stop' } };
      })();
    },
  };
}

/**
 * Activate the Host half against a fake context and capture its registrations.
 * @param {object} options - harness options.
 * @returns {object} captured routes, tools, and llm.
 */
function createHarness(options = {}) {
  const llm = options.llm ?? makeLlm(() => '[]', options.listing);
  const routes = new Map();
  const tools = [];
  const effects = [];
  const savedImages = [];
  const ctx = {
    llm,
    ...(options.workspaceRegistry ? { workspaceRegistry: options.workspaceRegistry } : {}),
    webServer: {
      register(route) {
        routes.set(`${route.kind}:${route.path}`, route);
        return () => routes.delete(`${route.kind}:${route.path}`);
      },
      getOrigin() {
        return options.origin ?? 'http://127.0.0.1:58582';
      },
    },
    get(name) {
      if (name === 'workspaceRegistry') return options.workspaceRegistry;
      if (name === 'agentDefaultModel') {
        return {
          currentSelection() {
            return { provider: 'deepseek-account', model: 'deepseek-flash' };
          },
        };
      }
      if (name === 'modelCatalog' && options.modelCatalog) return options.modelCatalog;
      if (name === 'tools') {
        return {
          register(definition) {
            tools.push(definition);
            return () => {};
          },
        };
      }
      if (name === 'attachments') {
        return {
          imageLimits: {
            maxImageBytes: 12 * 1024 * 1024,
            maxImagesPerMessage: 4,
            maxMessageImageBytes: 48 * 1024 * 1024,
            maxImagePixels: 40_000_000,
            maxImageDimension: 8192,
            mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
          },
          async saveImages(inputs) {
            savedImages.push(...inputs);
            return inputs.map((input, index) => ({
              attachmentId: `img-${index}`,
              mediaType: input.mediaType,
              bytes: input.data.length,
              width: 2,
              height: 2,
              ...(input.name ? { name: input.name } : {}),
            }));
          },
          isAttachmentError(error) {
            return Boolean(error && typeof error.code === 'string' && error.code.startsWith('ATTACHMENT'));
          },
        };
      }
      return undefined;
    },
    effect(callback) {
      effects.push(callback());
    },
  };
  apply(ctx, options.config ?? {});
  const route = [...routes.values()].find((entry) => entry.kind === 'prefix' && entry.path === '/dsh-translation/api');
  return { routes, tools, llm, savedImages, handler: route && route.handler };
}

/**
 * Dispatch one fake HTTP request through the route handler.
 * @param {Function} handler - route handler.
 * @param {object} request - method, path, body, headers.
 * @returns {Promise<{ status: number, json: unknown }>} response.
 */
async function call(handler, request = {}) {
  const method = request.method ?? 'POST';
  const body = request.rawBody !== undefined
    ? [request.rawBody]
    : request.body === undefined
      ? []
      : [Buffer.from(JSON.stringify(request.body))];
  const req = Readable.from(body);
  req.method = method;
  req.url = request.path ?? '/dsh-translation/api/translate';
  req.headers = { origin: 'http://127.0.0.1:58582', ...(request.headers ?? {}) };
  const res = {
    status: 0,
    headers: null,
    body: '',
    writableEnded: false,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(payload) {
      this.body = payload;
      this.writableEnded = true;
    },
  };
  await handler(req, res);
  return { status: res.status, json: res.body ? JSON.parse(res.body) : null };
}

test('health endpoint reports the resolved model', async () => {
  const { handler } = createHarness();
  assert.equal(typeof handler, 'function');
  const response = await call(handler, { method: 'GET', path: '/dsh-translation/api/health' });
  assert.equal(response.status, 200);
  assert.equal(response.json.ok, true);
  assert.equal(response.json.revision, '10');
  assert.ok(response.json.features.includes('ocr'));
  assert.ok(response.json.features.includes('score-document'));
  assert.ok(response.json.features.includes('models'));
  assert.ok(response.json.features.includes('workspace'));
  assert.equal(response.json.model, 'deepseek-account/deepseek-flash');
  // The route in use is always offered, even when nothing else is discoverable.
  assert.deepEqual(response.json.models, [{ provider: 'deepseek-account', model: 'deepseek-flash' }]);
});

test('health lists configured and discovered models for the switcher', async () => {
  const { handler } = createHarness({
    config: { models: [{ provider: 'deepseek-account', model: 'deepseek-pro', label: 'Pro' }] },
  });
  const configured = await call(handler, { method: 'GET', path: '/dsh-translation/api/health' });
  assert.deepEqual(configured.json.models[0], { provider: 'deepseek-account', model: 'deepseek-pro', label: 'Pro' });
  assert.ok(configured.json.models.some((entry) => entry.model === 'deepseek-flash'),
    'the route in use must still be listed');

  const catalog = createHarness({
    config: { provider: 'deepseek-account', model: 'deepseek-flash' },
    modelCatalog: {
      async list() {
        return [{
          provider: 'deepseek-account',
          models: [{ id: 'deepseek-flash', name: 'Flash' }, { id: 'deepseek-reasoner', name: 'Reasoner' }],
        }];
      },
    },
  });
  const discovered = await call(catalog.handler, { method: 'GET', path: '/dsh-translation/api/health' });
  assert.deepEqual(discovered.json.models.map((entry) => entry.model), ['deepseek-flash', 'deepseek-reasoner']);
  assert.equal(discovered.json.models[1].label, 'Reasoner');
});

test('health lists the models the LLM registry advertises', async () => {
  // The documented discovery path: listProviders() names the routes and
  // listModels(providerId) returns what each adapter can serve. A no-argument
  // listModels() call throws on the real service, which is why the page used
  // to offer a single model and hide its picker.
  const harness = createHarness({
    listing: {
      'deepseek-account': [
        { id: 'deepseek-flash', name: 'DeepSeek Flash' },
        { id: 'deepseek-pro', name: 'DeepSeek Pro' },
      ],
      'bilibili': ['Index-Translate-9B'],
    },
  });
  const response = await call(harness.handler, { method: 'GET', path: '/dsh-translation/api/health' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.json.models, [
    { provider: 'deepseek-account', model: 'deepseek-flash', label: 'DeepSeek Flash', providerLabel: 'DeepSeek' },
    { provider: 'deepseek-account', model: 'deepseek-pro', label: 'DeepSeek Pro', providerLabel: 'DeepSeek' },
    { provider: 'bilibili', model: 'Index-Translate-9B', label: 'Index-Translate-9B', providerLabel: 'bilibili' },
  ]);
  assert.deepEqual(response.json.modelFailures, []);
  assert.deepEqual(response.json.default, { provider: 'deepseek-account', model: 'deepseek-flash' });
});

test('a provider whose listing fails does not hide the other providers', async () => {
  const harness = createHarness({
    listing: { 'deepseek-account': ['deepseek-flash', 'deepseek-pro'] },
  });
  // Break one route: the real service rejects when a credential expired.
  harness.llm.listProviders = () => [
    { id: 'deepseek-account', name: 'DeepSeek' },
    { id: 'broken', name: 'Broken' },
  ];
  const original = harness.llm.listModels;
  harness.llm.listModels = (provider) => {
    if (provider === 'broken') throw new Error('model listing timed out');
    return original(provider);
  };
  const response = await call(harness.handler, { method: 'GET', path: '/dsh-translation/api/health' });
  assert.deepEqual(response.json.models.map((entry) => entry.model), ['deepseek-flash', 'deepseek-pro']);
  assert.deepEqual(response.json.modelFailures, [{ provider: 'broken', message: 'model listing timed out' }]);
});

test('a discovered model can be used as a per-request override', async () => {
  const harness = createHarness({
    llm: makeLlm(() => '["译文"]', { 'deepseek-account': ['deepseek-flash', 'deepseek-pro'] }),
  });
  const response = await call(harness.handler, {
    path: '/dsh-translation/api/translate',
    body: {
      paragraphs: ['Hello.'],
      route: { provider: 'deepseek-account', model: 'deepseek-pro' },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.model, 'deepseek-account/deepseek-pro');
  assert.equal(harness.llm.calls[0].model, 'deepseek-pro');
});

test('translate honours a per-request model override', async () => {
  const llm = makeLlm(() => '["译文"]');
  const { handler } = createHarness({
    llm,
    config: {
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      models: [
        { provider: 'deepseek-account', model: 'deepseek-flash' },
        { provider: 'deepseek-account', model: 'deepseek-pro' },
      ],
    },
  });
  const response = await call(handler, {
    path: '/dsh-translation/api/translate',
    body: {
      paragraphs: ['Hello.'],
      route: { provider: 'deepseek-account', model: 'deepseek-pro' },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.model, 'deepseek-account/deepseek-pro');
  assert.equal(llm.calls[0].provider, 'deepseek-account');
  assert.equal(llm.calls[0].model, 'deepseek-pro');
});

test('an unknown or malformed model override is rejected before any model call', async () => {
  const llm = makeLlm(() => '[]');
  const { handler } = createHarness({
    llm,
    config: {
      provider: 'deepseek-account',
      model: 'deepseek-flash',
      models: [{ provider: 'deepseek-account', model: 'deepseek-flash' }],
    },
  });
  const unknown = await call(handler, {
    path: '/dsh-translation/api/translate',
    body: { paragraphs: ['Hello.'], route: { provider: 'deepseek-account', model: 'gone' } },
  });
  assert.equal(unknown.status, 400);
  assert.equal(unknown.json.code, 'UNKNOWN_ROUTE');
  const malformed = await call(handler, {
    path: '/dsh-translation/api/translate',
    body: { paragraphs: ['Hello.'], route: 'deepseek-account/deepseek-flash' },
  });
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json.code, 'BAD_ROUTE');
  assert.equal(llm.calls.length, 0);
});

test('translate returns aligned sentence and paragraph arrays', async () => {
  const llm = makeLlm((options) => {
    const prompt = options.messages[0].content[0].text;
    if (prompt.includes('paragraph')) return '["段落一译", "段落二译"]';
    return '["句一译", "句二译"]';
  });
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    body: {
      sentences: ['One.', 'Two.'],
      paragraphs: ['One. Two.', 'Third.'],
      targetLanguage: '中文',
    },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.json.sentences, ['句一译', '句二译']);
  assert.deepEqual(response.json.paragraphs, ['段落一译', '段落二译']);
});

test('translate rejects an empty payload and cross-origin calls', async () => {
  const { handler } = createHarness();
  const empty = await call(handler, { body: { sentences: [], paragraphs: [] } });
  assert.equal(empty.status, 400);
  const cross = await call(handler, {
    body: { sentences: ['One.'] },
    headers: { origin: 'http://evil.example' },
  });
  assert.equal(cross.status, 403);
});

test('translate accepts a whole document and keeps the paragraph structure', async () => {
  const llm = makeLlm(() => '整篇译文第一段。\n\n整篇译文第二段。');
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    path: '/dsh-translation/api/translate',
    body: { document: '第一段。\n\n第二段。', targetLanguage: '中文' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.document, '整篇译文第一段。\n\n整篇译文第二段。');
  const prompt = llm.calls[0].messages[0].content[0].text;
  assert.match(prompt, /following document into 中文/);
  assert.match(prompt, /exactly the same paragraphs/);
});

test('translate accepts a paragraph array and answers an aligned array', async () => {
  const llm = makeLlm(() => '["整篇译文甲。", "整篇译文乙。"]');
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    path: '/dsh-translation/api/translate',
    body: { document: ['第一段。', '第二段。'], targetLanguage: '中文' },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.json.paragraphs, ['整篇译文甲。', '整篇译文乙。']);
  assert.equal(response.json.document, '整篇译文甲。\n\n整篇译文乙。');
  const prompt = llm.calls[0].messages[0].content[0].text;
  assert.match(prompt, /exactly 2 translations/);
  assert.match(prompt, /coherent across paragraphs/);
});

test('retranslate passes the instruction through and returns the revised text', async () => {
  const llm = makeLlm(() => '更口语化的译文');
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    path: '/dsh-translation/api/retranslate',
    body: {
      source: 'Hello there',
      translation: '你好',
      extraPrompt: 'more casual',
      kind: 'sentence',
      targetLanguage: '中文',
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.translation, '更口语化的译文');
  assert.match(llm.calls[0].messages[0].content[0].text, /more casual/);
});

test('retranslate accepts a whole document in one request', async () => {  const llm = makeLlm(() => '整篇新译文第一段。\n\n整篇新译文第二段。');
  const { handler } = createHarness({ llm });
  // One paragraph exceeds the per-segment cap on purpose: the document kind
  // must be judged by the document limit instead.
  const longParagraph = 'A'.repeat(MAX_SEGMENT_CHARS + 1);
  const response = await call(handler, {
    path: '/dsh-translation/api/retranslate',
    body: {
      source: `${longParagraph}\n\nB paragraph`,
      translation: '旧译文一\n\n旧译文二',
      kind: 'document',
      targetLanguage: '中文',
    },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.kind, 'document');
  assert.equal(response.json.translation, '整篇新译文第一段。\n\n整篇新译文第二段。');
  const prompt = llm.calls[0].messages[0].content[0].text;
  assert.match(prompt, /following document into 中文/);
  assert.match(prompt, /exactly the same paragraphs/);
  assert.match(prompt, /旧译文一/);
});

test('a document retranslate that exceeds the total limit is rejected', async () => {
  const llm = makeLlm(() => 'x');
  const { handler } = createHarness({ llm });
  const half = 'A'.repeat(MAX_DOCUMENT_TOTAL_CHARS / 2 + 10);
  const response = await call(handler, {
    path: '/dsh-translation/api/retranslate',
    body: { source: half, translation: half, kind: 'document', targetLanguage: '中文' },
  });
  assert.equal(response.status, 400);
});

test('score returns a clamped score with a comment', async () => {
  const llm = makeLlm(() => 'SCORE: 91\nCOMMENT: 译得自然');
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    path: '/dsh-translation/api/score',
    body: { source: 'Hello', translation: '你好', targetLanguage: '中文' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.score, 91);
  assert.equal(response.json.comment, '译得自然');
});

test('an unusable scoring reply eventually answers 502 with code and detail', async () => {
  const llm = makeLlm(() => 'I cannot score this right now.');
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    path: '/dsh-translation/api/score',
    body: { source: 'Hello', translation: '你好', targetLanguage: '中文' },
  });
  assert.equal(response.status, 502);
  assert.equal(response.json.code, 'LLM_BAD_SCORE');
  assert.match(response.json.detail, /cannot score/);
});

test('an unknown endpoint answers 404 and a bad body answers 400', async () => {
  const { handler } = createHarness();
  const missing = await call(handler, { path: '/dsh-translation/api/nope', body: {} });
  assert.equal(missing.status, 404);
  const bad = await call(handler, { path: '/dsh-translation/api/translate' });
  assert.equal(bad.status, 400);
});

test('an oversized body is drained and answered with 413 instead of a reset', async () => {
  const { handler } = createHarness();
  const response = await call(handler, { rawBody: Buffer.alloc(24 * 1024 * 1024 + 16, 0x20) });
  assert.equal(response.status, 413);
  assert.match(response.json.error, /too large/);
});

test('ocr stores the image and returns the transcribed text', async () => {
  const llm = makeLlm(() => '识别出的文字');
  const { handler, savedImages, llm: captured } = createHarness({ llm });
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const response = await call(handler, {
    path: '/dsh-translation/api/ocr',
    body: { mediaType: 'image/png', data: image.toString('base64'), name: 'shot.png' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.text, '识别出的文字');
  assert.equal(savedImages.length, 1);
  assert.equal(savedImages[0].mediaType, 'image/png');
  assert.equal(savedImages[0].name, 'shot.png');
  const content = captured.calls[0].messages[0].content;
  assert.equal(content[0].type, 'image');
});

test('ocr rejects bad media types and invalid base64', async () => {
  const { handler } = createHarness();
  const badType = await call(handler, {
    path: '/dsh-translation/api/ocr',
    body: { mediaType: 'text/plain', data: 'AAAA' },
  });
  assert.equal(badType.status, 415);
  const badBase64 = await call(handler, {
    path: '/dsh-translation/api/ocr',
    body: { mediaType: 'image/png', data: 'not-base64!!' },
  });
  assert.equal(badBase64.status, 400);
});

test('document scoring uses the score-document endpoint', async () => {
  const llm = makeLlm(() => 'SCORE: 89\nCOMMENT: 全文一致');
  const { handler } = createHarness({ llm });
  const response = await call(handler, {
    path: '/dsh-translation/api/score-document',
    body: { source: 'One.\n\nTwo.', translation: '一。\n\n二。', targetLanguage: '中文' },
  });
  assert.equal(response.status, 200);
  assert.equal(response.json.score, 89);
  assert.equal(response.json.comment, '全文一致');
});

test('the Agent tool scores a whole document', async () => {
  const llm = makeLlm(() => 'SCORE: 93\nCOMMENT: 整体很好');
  const { tools } = createHarness({ llm });
  const result = await tools[0].execute(
    { action: 'score_document', text: 'One.\n\nTwo.', translation: '一。\n\n二。', targetLanguage: '中文' },
    { signal: new AbortController().signal },
  );
  assert.equal(result.action, 'score_document');
  assert.equal(result.score, 93);
});

test('the Agent tool is registered and runs the same engine', async () => {
  const llm = makeLlm(() => '你好，世界');
  const { tools } = createHarness({ llm });
  assert.equal(tools.length, 1);
  const tool = tools[0];
  assert.equal(tool.name, 'translation_assistant');
  const result = await tool.execute(
    { action: 'translate', text: 'Hello, world', targetLanguage: '中文' },
    { signal: new AbortController().signal },
  );
  assert.equal(result.action, 'translate');
  assert.equal(result.translation, '你好，世界');
  assert.match(llm.calls[0].messages[0].content[0].text, /Hello, world/);
  const rendered = tool.output.render({}, result);
  assert.match(rendered[0].text, /你好，世界/);
});

test('the Agent tool requires a translation for scoring', async () => {
  const { tools } = createHarness();
  await assert.rejects(
    () => tools[0].execute({ action: 'score', text: 'Hello' }, { signal: new AbortController().signal }),
    /translation/,
  );
});

// ---------------------------------------------------------------------------
// Workspace endpoints: real files in a temporary directory.
// ---------------------------------------------------------------------------

/**
 * Create a temporary workspace folder with a few files.
 * @returns {Promise<{ root: string, cleanup: () => Promise<void> }>} fixture.
 */
async function makeWorkspace() {
  const root = await mkdtemp(path.join(tmpdir(), 'dsh-ws-'));
  await mkdir(path.join(root, 'sub'), { recursive: true });
  await writeFile(path.join(root, 'a.md'), '# Hello\n\nWorld');
  await writeFile(path.join(root, 'notes.txt'), 'plain');
  await writeFile(path.join(root, 'sub', 'b.html'), '<p>hi</p>');
  await writeFile(path.join(root, 'skip.png'), 'not text');
  await writeFile(path.join(root, '.hidden.md'), 'skip hidden');
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

test('workspace/registry reports unavailable without a Harness registry', async () => {
  const { handler } = createHarness();
  const response = await call(handler, { path: '/dsh-translation/api/workspace/registry', body: {} });
  assert.equal(response.status, 200);
  assert.equal(response.json.available, false);
  assert.deepEqual(response.json.workspaces, []);
});

test('workspace/registry lists the Harness workspaces when mounted', async () => {
  const { handler } = createHarness({
    workspaceRegistry: {
      list() {
        return [
          { id: 'w1', title: 'Docs', path: '/home/me/docs' },
          { id: 'w2', title: '', path: '/home/me/notes' },
        ];
      },
    },
  });
  const response = await call(handler, { path: '/dsh-translation/api/workspace/registry', body: {} });
  assert.equal(response.status, 200);
  assert.equal(response.json.available, true);
  assert.deepEqual(response.json.workspaces, [
    { id: 'w1', title: 'Docs', path: '/home/me/docs' },
    { id: 'w2', title: '', path: '/home/me/notes' },
  ]);
});

test('workspace endpoints refuse roots outside the registry when mounted', async () => {
  const ws = await makeWorkspace();
  try {
    const { handler } = createHarness({
      workspaceRegistry: {
        list() {
          return [{ id: 'w1', title: 'Docs', path: ws.root }];
        },
      },
    });
    const foreign = await mkdtemp(path.join(tmpdir(), 'dsh-ws-foreign-'));
    try {
      const denied = await call(handler, {
        path: '/dsh-translation/api/workspace/list',
        body: { root: foreign },
      });
      assert.equal(denied.status, 403);
      assert.equal(denied.json.code, 'WORKSPACE_NOT_REGISTERED');
    } finally {
      await rm(foreign, { recursive: true, force: true });
    }
    const allowed = await call(handler, {
      path: '/dsh-translation/api/workspace/list',
      body: { root: ws.root },
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.json.root, ws.root);
  } finally {
    await ws.cleanup();
  }
});

test('workspace/list walks the folder and filters by extension', async () => {
  const { handler } = createHarness();
  const ws = await makeWorkspace();
  try {
    const response = await call(handler, { path: '/dsh-translation/api/workspace/list', body: { root: ws.root } });
    assert.equal(response.status, 200);
    assert.equal(response.json.root, ws.root);
    assert.deepEqual(response.json.entries.map((entry) => entry.relPath), ['a.md', 'notes.txt', 'sub/b.html']);
    assert.equal(response.json.entries[0].ext, 'md');
    assert.equal(typeof response.json.entries[0].size, 'number');
  } finally {
    await ws.cleanup();
  }
});

test('workspace/list rejects a missing or non-folder root', async () => {
  const { handler } = createHarness();
  const missing = await call(handler, { path: '/dsh-translation/api/workspace/list', body: { root: '/definitely/not/here' } });
  assert.equal(missing.status, 400);
  assert.equal(missing.json.error, 'The workspace folder does not exist.');
  const file = await call(handler, { path: '/dsh-translation/api/workspace/list', body: { root: '/etc/hostname' } });
  assert.equal(file.status, 400);
});

test('workspace/read returns text and refuses disallowed types and escapes', async () => {
  const { handler } = createHarness();
  const ws = await makeWorkspace();
  try {
    const ok = await call(handler, { path: '/dsh-translation/api/workspace/read', body: { root: ws.root, relPath: 'a.md' } });
    assert.equal(ok.status, 200);
    assert.equal(ok.json.content, '# Hello\n\nWorld');
    assert.equal(ok.json.encoding, 'text');
    assert.equal(ok.json.name, 'a.md');
    const png = await call(handler, { path: '/dsh-translation/api/workspace/read', body: { root: ws.root, relPath: 'skip.png' } });
    assert.equal(png.status, 400);
    const escape = await call(handler, { path: '/dsh-translation/api/workspace/read', body: { root: ws.root, relPath: '../outside.txt' } });
    assert.equal(escape.status, 400);
    const missing = await call(handler, { path: '/dsh-translation/api/workspace/read', body: { root: ws.root, relPath: 'nope.md' } });
    assert.equal(missing.status, 404);
  } finally {
    await ws.cleanup();
  }
});

test('workspace/write creates files, refuses overwrite unless asked', async () => {
  const { handler } = createHarness();
  const ws = await makeWorkspace();
  try {
    const fresh = await call(handler, {
      path: '/dsh-translation/api/workspace/write',
      body: { root: ws.root, relPath: 'sub/译文.md', content: '你好' },
    });
    assert.equal(fresh.status, 200);
    assert.equal(await readFile(path.join(ws.root, 'sub', '译文.md'), 'utf8'), '你好');

    const clash = await call(handler, {
      path: '/dsh-translation/api/workspace/write',
      body: { root: ws.root, relPath: 'sub/译文.md', content: 'again' },
    });
    assert.equal(clash.status, 409);

    const forced = await call(handler, {
      path: '/dsh-translation/api/workspace/write',
      body: { root: ws.root, relPath: 'sub/译文.md', content: 'second pass', overwrite: true },
    });
    assert.equal(forced.status, 200);
    assert.equal(await readFile(path.join(ws.root, 'sub', '译文.md'), 'utf8'), 'second pass');

    const binary = await call(handler, {
      path: '/dsh-translation/api/workspace/write',
      body: { root: ws.root, relPath: 'out.docx', content: 'nope' },
    });
    assert.equal(binary.status, 400);
  } finally {
    await ws.cleanup();
  }
});

test('workspace/spec lists the guideline documents with their content', async () => {
  const { handler } = createHarness();
  const ws = await makeWorkspace();
  try {
    const none = await call(handler, { path: '/dsh-translation/api/workspace/spec', body: { root: ws.root } });
    assert.equal(none.status, 200);
    assert.equal(none.json.available, true, 'a missing folder still counts as a working endpoint');
    assert.deepEqual(none.json.docs, []);

    const dir = path.join(ws.root, '.translation-spec');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'style.md'), 'Keep sentences short.');
    await writeFile(path.join(dir, 'glossary.md'), 'AI → 人工智能');
    await writeFile(path.join(dir, 'note.txt'), 'not a guideline');
    await writeFile(path.join(dir, 'huge.md'), 'x'.repeat(64 * 1024 + 1));

    const response = await call(handler, { path: '/dsh-translation/api/workspace/spec', body: { root: ws.root } });
    assert.equal(response.status, 200);
    assert.equal(response.json.available, true);
    // Sorted by name; only .md files; the oversized one is skipped, not fatal.
    assert.deepEqual(response.json.docs.map((entry) => entry.name), ['glossary.md', 'style.md']);
    assert.equal(response.json.docs[0].text, 'AI → 人工智能');
    assert.deepEqual(response.json.skipped, [{ name: 'huge.md', reason: 'too_large' }]);
  } finally {
    await ws.cleanup();
  }
});

test('workspace/spec/delete removes one guideline document', async () => {
  const { handler } = createHarness();
  const ws = await makeWorkspace();
  try {
    const dir = path.join(ws.root, '.translation-spec');
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'style.md'), 'Keep sentences short.');

    const bad = await call(handler, {
      path: '/dsh-translation/api/workspace/spec/delete',
      body: { root: ws.root, name: '../escape.md' },
    });
    assert.equal(bad.status, 400);

    const missing = await call(handler, {
      path: '/dsh-translation/api/workspace/spec/delete',
      body: { root: ws.root, name: 'nope.md' },
    });
    assert.equal(missing.status, 404);

    const removed = await call(handler, {
      path: '/dsh-translation/api/workspace/spec/delete',
      body: { root: ws.root, name: 'style.md' },
    });
    assert.equal(removed.status, 200);
    assert.equal(removed.json.name, 'style.md');
    await assert.rejects(readFile(path.join(dir, 'style.md'), 'utf8'));
  } finally {
    await ws.cleanup();
  }
});
