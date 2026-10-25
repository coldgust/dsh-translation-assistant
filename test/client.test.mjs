import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * Minimal React-compatible renderer used to exercise the browser page without
 * a DOM. It supports the hook subset the page uses (useState, useMemo, useRef,
 * useEffect) for one root component, plus direct-child function components
 * without hooks (LanguageSelect, BusyDot, Frame etc.).
 */
const Fragment = Symbol('Fragment');
let activeInstance = null;
let hookIndex = 0;

function depsEqual(left, right) {
  if (!left || !right || left.length !== right.length) return false;
  return left.every((value, index) => Object.is(value, right[index]));
}

function useState(initial) {
  if (!activeInstance) throw new Error('useState outside a component');
  const instance = activeInstance;
  const index = hookIndex;
  hookIndex += 1;
  if (!(index in instance.store)) {
    instance.store[index] = typeof initial === 'function' ? initial() : initial;
  }
  const set = (next) => {
    const value = typeof next === 'function' ? next(instance.store[index]) : next;
    if (Object.is(value, instance.store[index])) return;
    instance.store[index] = value;
    instance.pending = true;
  };
  return [instance.store[index], set];
}

function useMemo(factory, deps) {
  if (!activeInstance) throw new Error('useMemo outside a component');
  const instance = activeInstance;
  const index = hookIndex;
  hookIndex += 1;
  const previous = instance.memos[index];
  if (previous && depsEqual(previous.deps, deps)) return previous.value;
  const value = factory();
  instance.memos[index] = { value, deps };
  return value;
}

function useRef(initial) {
  if (!activeInstance) throw new Error('useRef outside a component');
  const instance = activeInstance;
  const index = hookIndex;
  hookIndex += 1;
  if (!(index in instance.refs)) instance.refs[index] = { current: initial };
  return instance.refs[index];
}

function useEffect(effect, deps) {
  if (!activeInstance) throw new Error('useEffect outside a component');
  const instance = activeInstance;
  const index = hookIndex;
  hookIndex += 1;
  const previous = instance.effects[index];
  if (previous && depsEqual(previous.deps, deps)) return;
  const slot = { deps, cleanup: previous ? previous.cleanup : undefined };
  instance.effects[index] = slot;
  instance.effectQueue.push({ slot, effect });
}

const miniReact = {
  Fragment,
  createElement(type, props, ...children) {
    const merged = { ...(props || {}) };
    if (children.length === 1) merged.children = children[0];
    else if (children.length > 1) merged.children = children;
    return { type, props: merged };
  },
  useState,
  useMemo,
  useRef,
  useEffect,
};

/**
 * Resolve an element tree into plain host nodes.
 * @param {unknown} node - element tree.
 * @returns {object | null} resolved node.
 */
function renderNode(node) {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (typeof node === 'string' || typeof node === 'number') return { kind: 'text', text: String(node) };
  if (Array.isArray(node)) {
    return { kind: 'list', children: node.map(renderNode).filter(Boolean) };
  }
  if (typeof node !== 'object' || !node.type) throw new Error('Invalid element node');
  if (node.type === Fragment) return renderNode(node.props ? node.props.children : null);
  if (typeof node.type === 'string') {
    const children = node.props ? node.props.children : undefined;
    const rendered = children === undefined
      ? []
      : (Array.isArray(children) ? children.map(renderNode) : [renderNode(children)]).filter(Boolean);
    return { kind: 'host', type: node.type, props: node.props || {}, children: rendered };
  }
  if (typeof node.type === 'function') {
    return renderNode(node.type(node.props || {}));
  }
  throw new Error(`Invalid element type: ${String(node.type)}`);
}

/**
 * Concatenate visible text of a resolved tree.
 * @param {object | null} node - resolved node.
 * @returns {string} text.
 */
function textOf(node) {
  if (!node) return '';
  if (node.kind === 'text') return node.text;
  if (node.kind === 'list') return node.children.map(textOf).join('');
  if (node.type === 'textarea' || node.type === 'input') {
    const value = node.props.value;
    return value === undefined || value === null ? '' : String(value);
  }
  return node.children.map(textOf).join('');
}

/**
 * Collect host nodes matching a predicate.
 * @param {object | null} node - resolved node.
 * @param {(node: object) => boolean} predicate - matcher.
 * @param {object[]} out - accumulator.
 * @returns {object[]} matching host nodes.
 */
function findAll(node, predicate, out = []) {
  if (!node) return out;
  if (node.kind === 'list') {
    for (const child of node.children) findAll(child, predicate, out);
    return out;
  }
  if (predicate(node)) out.push(node);
  for (const child of node.children || []) findAll(child, predicate, out);
  return out;
}

/**
 * Create a localStorage stub.
 * @param {Record<string, string>} [seed] - initial entries.
 * @returns {object} storage stub with a dump helper.
 */
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map);
    },
  };
}

let captured = null;
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      captured = definition;
    },
  },
  localStorage: makeStorage(),
};
await import('../client.js');
assert.ok(captured, 'client bundle must register a module factory');
assert.equal(captured.id, '@local/dsh-translation-assistant');

/**
 * Activate the client half against a fake Cordis context and render its page.
 * @param {object} options - test options.
 * @returns {object} page driver.
 */
function createPage(options = {}) {
  const storage = options.storage ?? makeStorage();
  const copiedTexts = [];
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: {
      clipboard: {
        async writeText(value) {
          copiedTexts.push(value);
        },
      },
    },
  });
  globalThis.window = { localStorage: storage };
  const locales = {};
  const registrations = [];
  const ctx = {
    effect(callback) {
      const cleanup = callback();
      return typeof cleanup === 'function' ? cleanup : () => {};
    },
    locale: {
      register(namespace, dicts) {
        locales[namespace] = dicts;
        return () => {};
      },
      bind(namespace) {
        return (key) => {
          const dict = locales[namespace] && locales[namespace].zh;
          return dict && typeof dict[key] === 'string' ? dict[key] : key;
        };
      },
    },
    slots: {
      inject(_slot, callback) {
        callback();
        return () => {};
      },
      register(registration, component) {
        registrations.push({ registration, component });
        return () => {};
      },
    },
  };
  const exports = captured.factory((name) => {
    if (name === 'react') return miniReact;
    throw new Error(`Unexpected module request: ${name}`);
  });
  exports.apply(ctx);
  const pageRegistration = registrations.find((entry) => entry.registration.name === 'main');
  assert.ok(pageRegistration, 'page must register into the main slot');
  assert.equal(pageRegistration.registration.key, 'translation-assistant');
  assert.ok(registrations.some((entry) => entry.registration.name === 'sidebar.panellist'),
    'a sidebar panel entry must be registered');
  const dict = locales[pageRegistration.registration.locale];
  const t = (key) => (dict && dict.zh && dict.zh[key] !== undefined ? dict.zh[key] : key);

  const fetchLog = [];
  const handlers = options.handlers || {};
  const fetchImpl = async (url, init = {}) => {
    const action = String(url).split('/').pop();
    const body = init.body ? JSON.parse(init.body) : undefined;
    fetchLog.push({ action, body });
    const handler = handlers[action];
    if (!handler) throw new Error(`Unexpected fetch: ${url}`);
    const value = handler(body);
    return { ok: true, status: 200, json: async () => value };
  };
  globalThis.fetch = fetchImpl;

  const instance = {
    store: [],
    memos: [],
    refs: [],
    effects: [],
    effectQueue: [],
    pending: false,
    schedule() {
      instance.pending = true;
    },
  };
  let tree = null;

  function render() {
    instance.pending = false;
    activeInstance = instance;
    hookIndex = 0;
    let element;
    try {
      element = pageRegistration.component({ t });
    } finally {
      activeInstance = null;
    }
    tree = renderNode(element);
  }

  async function runEffects() {
    const queue = instance.effectQueue.splice(0);
    for (const item of queue) {
      if (item.slot.cleanup) item.slot.cleanup();
      const cleanup = item.effect();
      item.slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
    }
  }

  async function flush() {
    let idle = 0;
    for (let round = 0; round < 40; round += 1) {
      render();
      await runEffects();
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (!instance.pending) {
        idle += 1;
        if (idle >= 3) return;
      } else {
        idle = 0;
      }
    }
    throw new Error('render loop did not settle');
  }

  function hostNodes(predicate) {
    return findAll(tree, (node) => node.kind === 'host' && predicate(node));
  }

  function findButton(label, occurrence = 0) {
    const matches = hostNodes((node) => node.type === 'button' && textOf(node).trim() === label);
    return matches[occurrence];
  }

  function findTextarea(match) {
    return hostNodes((node) => node.type === 'textarea' && match(node))[0];
  }

  function findInput(match) {
    return hostNodes((node) => node.type === 'input' && match(node))[0];
  }

  return {
    storage,
    fetchLog,
    copiedTexts,
    t,
    tree: () => tree,
    text: () => textOf(tree),
    flush,
    hostNodes,
    findButton,
    findTextarea,
    findInput,
    async click(label, occurrence = 0) {
      const button = findButton(label, occurrence);
      assert.ok(button, `button "${label}" not found; page text: ${textOf(tree)}`);
      button.props.onClick({ preventDefault() {} });
      await flush();
    },
    async typeIn(textarea, value) {
      assert.ok(textarea, 'textarea not found');
      textarea.props.onChange({ target: { value } });
      await flush();
    },
  };
}

test('landing view renders and translates into the paragraph comparison by default', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'deepseek-account/deepseek-flash' }),
      translate: (body) => ({
        sentences: body.sentences.map((_item, index) => `句${index + 1}译`),
        paragraphs: body.paragraphs.map((_item, index) => `段${index + 1}译`),
        model: 'deepseek-account/deepseek-flash',
      }),
    },
  });
  await page.flush();
  assert.match(page.text(), /翻译助手/);
  assert.match(page.text(), /开始翻译/);
  const textarea = page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder'));
  assert.ok(textarea, 'source textarea must be present');
  await page.typeIn(textarea, 'Hello. World.\n\nThird paragraph.');
  await page.click('开始翻译');
  // Paragraph comparison is the default view.
  assert.match(page.text(), /段1译/);
  assert.match(page.text(), /段2译/);
  assert.match(page.text(), /逐段对比/);
  assert.match(page.text(), /逐句对比/);
  const translateCall = page.fetchLog.find((entry) => entry.action === 'translate');
  assert.equal(translateCall.body.sentences.length, 3);
  assert.equal(translateCall.body.paragraphs.length, 2);
  await page.click('逐句对比');
  assert.match(page.text(), /句1译/);
  assert.match(page.text(), /句3译/);
});

test('the full-text view shows the whole translation and copies it', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({
        sentences: ['句甲译', '句乙译'],
        paragraphs: ['段落甲译', '段落乙译'],
        model: 'm',
      }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.click('全文');
  assert.match(page.text(), /段落甲译/);
  assert.match(page.text(), /段落乙译/);
  assert.match(page.text(), /复制译文/);
  const fullText = page.findTextarea((node) => node.props.readOnly === true);
  assert.equal(fullText.props.value, '段落甲译\n\n段落乙译');
  await page.click('复制译文');
  assert.deepEqual(page.copiedTexts, ['段落甲译\n\n段落乙译']);
  assert.match(page.text(), /已复制/);
  await page.click('复制原文');
  assert.match(page.copiedTexts[1], /Second paragraph/);
});

test('scoring stays hidden until requested, then the toggle works', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句一译'], paragraphs: ['段一译'], model: 'm' }),
      score: () => ({ score: 88, comment: '表达自然' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  assert.doesNotMatch(page.text(), /AI 评分 88/);
  const toggle = page.findButton('显示评分');
  assert.ok(toggle);
  assert.equal(toggle.props['aria-pressed'], false);
  await page.click('AI 评分');
  const scoreCall = page.fetchLog.find((entry) => entry.action === 'score');
  assert.equal(scoreCall.body.translation, '段一译');
  assert.match(page.text(), /AI 评分 88/);
  assert.match(page.text(), /表达自然/);
  assert.equal(page.findButton('隐藏评分').props['aria-pressed'], true);
  await page.click('隐藏评分');
  assert.doesNotMatch(page.text(), /AI 评分 88/);
  assert.ok(page.findButton('显示评分'));
});

test('manual edits persist, clear the stale score, and survive a reload', async () => {
  const storage = makeStorage();
  const handlers = {
    health: () => ({ ok: true, model: 'm' }),
    translate: () => ({ sentences: ['句一译', '句二译'], paragraphs: ['译段'], model: 'm' }),
    score: () => ({ score: 75, comment: '还行' }),
  };
  const page = createPage({ storage, handlers });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'One. Two.',
  );
  await page.click('开始翻译');
  await page.click('AI 评分');
  assert.match(page.text(), /AI 评分 75/);
  const editor = page.findTextarea((node) => node.props.value === '译段');
  await page.typeIn(editor, '手动改过的译文');
  assert.match(page.text(), /手动改过的译文/);
  assert.doesNotMatch(page.text(), /AI 评分 75/);

  const reloaded = createPage({ storage, handlers });
  await reloaded.flush();
  assert.match(reloaded.text(), /手动改过的译文/);
  assert.match(reloaded.text(), /逐段对比/);
});

test('retranslation with an instruction shows the prompt field and updates the segment', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['旧句译'], paragraphs: ['旧段落译'], model: 'm' }),
      retranslate: () => ({ translation: '新译文' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  await page.click('加提示词重译');
  const promptInput = page.findInput((node) => node.props.placeholder === page.t('promptPlaceholder'));
  assert.ok(promptInput, 'prompt input must appear');
  promptInput.props.onChange({ target: { value: '更口语化' } });
  await page.flush();
  await page.click('按提示词重译');
  const call = page.fetchLog.find((entry) => entry.action === 'retranslate');
  assert.equal(call.body.extraPrompt, '更口语化');
  assert.match(page.text(), /新译文/);
});

test('the sentence view switches to sentence segments', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句译'], paragraphs: ['第一段译', '第二段译'], model: 'm' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    '第一段。\n\n第二段。',
  );
  await page.click('开始翻译');
  assert.match(page.text(), /第一段译/);
  await page.click('逐句对比');
  assert.match(page.text(), /句译/);
});

test('the full-text view can score the whole document', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      'score-document': (body) => {
        assert.equal(body.translation, '段落甲\n\n段落乙');
        return { score: 90, comment: '全文流畅一致' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.click('全文');
  assert.match(page.text(), /AI 全文评分/);
  await page.click('AI 全文评分');
  assert.match(page.text(), /AI 评分 90/);
  assert.match(page.text(), /全文流畅一致/);
  await page.click('隐藏评分');
  assert.doesNotMatch(page.text(), /AI 评分 90/);
});

test('image OCR fills the source box and translates the recognized text', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      ocr: () => ({ text: '图片里的原文。', model: 'm' }),
      translate: (body) => {
        assert.deepEqual(body.sentences, ['图片里的原文。']);
        return { sentences: ['图片译文'], paragraphs: ['图片译文'], model: 'm' };
      },
    },
  });
  await page.flush();
  const fileInput = page.hostNodes((node) => node.type === 'input' && node.props.type === 'file')[0];
  assert.ok(fileInput, 'image input must be present');
  const file = {
    type: 'image/png',
    name: 'shot.png',
    size: 2048,
    arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
  };
  fileInput.props.onChange({ target: { files: [file], value: 'x' } });
  await page.flush();
  const ocrCall = page.fetchLog.find((entry) => entry.action === 'ocr');
  assert.ok(ocrCall, 'OCR request must be sent');
  assert.equal(ocrCall.body.mediaType, 'image/png');
  const translateCall = page.fetchLog.find((entry) => entry.action === 'translate');
  assert.ok(translateCall, 'recognized text must be translated');
  assert.match(page.text(), /图片译文/);
});

test('batch scoring reveals each finished segment immediately', async () => {
  let releaseSecond;
  let scoreCalls = 0;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      score: () => {
        scoreCalls += 1;
        if (scoreCalls === 2) {
          return new Promise((resolve) => {
            releaseSecond = () => resolve({ score: 70, comment: '第二段' });
          });
        }
        return { score: 80, comment: '第一段' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.click('全部评分');
  // The toggle flips immediately and the finished segment's score is already visible
  // while the second request is still in flight.
  assert.ok(page.findButton('隐藏评分'), 'scores must be revealed as soon as batch scoring starts');
  assert.match(page.text(), /AI 评分 80/);
  assert.doesNotMatch(page.text(), /AI 评分 70/);
  releaseSecond();
  await page.flush();
  assert.match(page.text(), /AI 评分 70/);
});

test('a corrupt image is rejected before any request is sent', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
    },
  });
  await page.flush();
  const previous = globalThis.createImageBitmap;
  globalThis.createImageBitmap = async () => {
    throw new Error('bad image');
  };
  try {
    const fileInput = page.hostNodes((node) => node.type === 'input' && node.props.type === 'file')[0];
    const file = {
      type: 'image/png',
      name: 'bad.png',
      size: 512,
      arrayBuffer: async () => new Uint8Array([0, 0, 0, 0]).buffer,
    };
    fileInput.props.onChange({ target: { files: [file], value: 'x' } });
    await page.flush();
    assert.match(page.text(), /图片无法读取/);
    assert.equal(page.fetchLog.filter((entry) => entry.action === 'ocr').length, 0);
  } finally {
    if (previous === undefined) delete globalThis.createImageBitmap;
    else globalThis.createImageBitmap = previous;
  }
});

test('a failed request surfaces a localized error instead of crashing the page', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => {
        throw new Error('boom');
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  assert.match(page.text(), /翻译助手/);
  assert.match(page.text(), /无法连接翻译服务/);
  assert.doesNotMatch(page.text(), /boom/);
});

test('an oversized document is rejected locally with a localized hint', async () => {
  const page = createPage({
    handlers: { health: () => ({ ok: true, model: 'm' }) },
  });
  await page.flush();
  const longText = Array.from({ length: 401 }, (_value, index) => `Sentence number ${index}.`).join(' ');
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    longText,
  );
  await page.click('开始翻译');
  assert.match(page.text(), /原文过长/);
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'translate').length, 0);
});

test('scores are hidden again after a reload even if they were shown before', async () => {
  const storage = makeStorage();
  const handlers = {
    health: () => ({ ok: true, model: 'm' }),
    translate: () => ({ sentences: ['译一'], paragraphs: ['译段'], model: 'm' }),
    score: () => ({ score: 77, comment: '可以' }),
  };
  const page = createPage({ storage, handlers });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  await page.click('AI 评分');
  assert.match(page.text(), /AI 评分 77/);

  const reloaded = createPage({ storage, handlers });
  await reloaded.flush();
  assert.match(reloaded.text(), /译段/);
  assert.doesNotMatch(reloaded.text(), /AI 评分 77/);
  assert.ok(reloaded.findButton('显示评分'));
});
