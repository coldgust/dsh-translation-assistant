import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';

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
assert.equal(captured.id, 'dsh-translation-assistant');

/**
 * Activate the client half against a fake Cordis context and render its page.
 * @param {object} options - test options.
 * @returns {object} page driver.
 */
function createPage(options = {}) {
  const storage = options.storage ?? makeStorage();
  // Real users get whole-document mode on by default. Tests default to the
  // batched shape so the segment-list requests stay the asserted baseline;
  // pass `transMode: 'whole' | 'array'` to exercise the one-request modes.
  // `noWholeDocPref` skips the injection entirely, leaving the component's
  // own default. Only fills the key in when it is not stored yet, so a
  // reload keeps the preferences the previous page instance saved.
  if (!options.noWholeDocPref) {
    let storedPrefs = {};
    try {
      storedPrefs = JSON.parse(storage.getItem('dsh-translation-assistant:prefs:v2') || '{}') || {};
    } catch {
      storedPrefs = {};
    }
    if (storedPrefs.transMode === undefined) {
      storedPrefs.transMode = options.transMode ?? 'batch';
      storage.setItem('dsh-translation-assistant:prefs:v2', JSON.stringify(storedPrefs));
    }
  }
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
  // Tests mostly describe translation with the segment-list shape. Requests
  // now arrive per chunk, so each call carries one list at a time: fill in
  // the missing list with an empty array and, in whole-document mode, a
  // reply that only carries the lists is normalized by joining the
  // paragraphs back.
  const runHandler = (action, body, signal) => {
    let payload = body;
    if (action === 'translate' && body) {
      payload = { sentences: [], paragraphs: [], ...body };
      const value = handlers[action](payload, signal);
      if (body.document && value && value.document === undefined && Array.isArray(value.paragraphs)) {
        return {
          ...value,
          document: value.paragraphs.join('\n\n'),
        };
      }
      return value;
    }
    return handlers[action](payload, signal);
  };
  const fetchImpl = async (url, init = {}) => {
    // Workspace endpoints nest under /workspace/, so the action is everything
    // after the /api/ prefix, not just the last path segment.
    const action = String(url).replace(/^.*\/api\//, '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    fetchLog.push({ action, body });
    if (!handlers[action]) {
      // Workspace guidelines default to "none" so tests without a spec
      // fixture still work; the drawer simply hides the section.
      if (action === 'workspace/spec') {
        return { ok: true, status: 200, json: async () => ({ available: false, docs: [], skipped: [] }) };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }
    // A handler may return a promise to hold the request in flight, which is
    // how tests observe intermediate progress states. The abort signal rides
    // along so a handler can reject when the page stops the pass.
    const value = await runHandler(action, body, init.signal);
    // A handler may answer with a full error response to exercise the
    // client's failure paths.
    if (value && typeof value === 'object' && value.ok === false && Number.isFinite(Number(value.status))) {
      return value;
    }
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
  const translateCalls = page.fetchLog.filter((entry) => entry.action === 'translate');
  assert.equal(translateCalls.some((entry) => (entry.body.sentences || []).length === 3), true, 'sentences go out as one chunk');
  assert.equal(translateCalls.some((entry) => (entry.body.paragraphs || []).length === 2), true, 'paragraphs go out as one chunk');
  await page.click('逐句对比');
  assert.match(page.text(), /句1译/);
  assert.match(page.text(), /句3译/);
});

/** The rejection a real fetch produces when its signal fires. */
function abortRejection() {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

/** A request handler that hangs until the page aborts its signal. */
function hangingUntilAbort() {
  return (_body, signal) => new Promise((resolve, reject) => {
    if (signal) signal.addEventListener('abort', () => reject(abortRejection()));
    // Never settles on its own: the test stops the pass through the header.
  });
}

test('the header stop button aborts a running batched translation', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: hangingUntilAbort(),
    },
  });
  await page.flush();
  // Nothing is running yet, so the header has no stop button.
  assert.equal(page.findButton(page.t('stopTranslation')), undefined);
  const source = Array.from({ length: 20 }, (_item, index) => `Paragraph ${index + 1}.`).join('\n\n');
  await page.typeIn(page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')), source);
  await page.click('开始翻译');
  assert.ok(page.findButton(page.t('stopTranslation')), 'stop button must appear while translating');
  await page.click(page.t('stopTranslation'));
  assert.doesNotMatch(page.text(), /已停止|请求失败|翻译没有返回/, 'a stop is silent: no notice box at all');
  assert.equal(page.findButton(page.t('stopTranslation')), undefined, 'stop button hides once stopped');
  // 20 paragraphs make 4 paragraph chunks plus sentence chunks; only the
  // chunks already in flight were sent, the rest were skipped.
  const calls = page.fetchLog.filter((entry) => entry.action === 'translate').length;
  assert.equal(calls < 6, true, `chunks must be skipped after a stop, got ${calls} calls`);
  // Nothing landed: the landing input keeps the draft.
  assert.doesNotMatch(page.text(), /Paragraph 1 译|段1译/);
  const textarea = page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder'));
  assert.equal(textarea.props.value, source);
});

test('the stop button works in whole-document mode without a batched fallback', async () => {
  const page = createPage({
    transMode: 'whole',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: hangingUntilAbort(),
    },
  });
  await page.flush();
  await page.typeIn(page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')), 'First.\n\nSecond.');
  await page.click('开始翻译');
  assert.ok(page.findButton(page.t('stopTranslation')), 'stop button must appear while translating');
  await page.click(page.t('stopTranslation'));
  assert.doesNotMatch(page.text(), /已停止|请求失败|翻译没有返回/);
  // The stopped whole-document request did not fall back to the batched pass.
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'translate').length, 1);
  assert.equal(page.findButton(page.t('stopTranslation')), undefined);
});

test('a running full retranslation can be stopped, keeping what landed', async () => {
  const page = createPage({
    transMode: 'whole',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ document: '段落一译\n\n段落二译', model: 'm' }),
      retranslate: hangingUntilAbort(),
    },
  });
  await page.flush();
  await page.typeIn(page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')), 'First.\n\nSecond.');
  await page.click('开始翻译');
  await page.click('全文');
  await page.click('AI 重译');
  assert.ok(page.findButton(page.t('stopTranslation')), 'stop button must appear while retranslating');
  await page.click(page.t('stopTranslation'));
  assert.doesNotMatch(page.text(), /已停止|请求失败|重译没有返回/);
  // One retranslate request went out and the previous translation survives.
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'retranslate').length, 1);
  assert.match(page.text(), /段落一译/);
  assert.equal(page.findButton(page.t('stopTranslation')), undefined);
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
  const fullText = fullTextBox(page);
  assert.equal(fullText.props.value, '段落甲译\n\n段落乙译');
  // The full text is editable: no read-only flag and a change handler attached.
  assert.equal(fullText.props.readOnly, undefined);
  assert.equal(typeof fullText.props.onChange, 'function');
  await page.click('复制译文');
  assert.deepEqual(page.copiedTexts, ['段落甲译\n\n段落乙译']);
  assert.match(page.text(), /已复制/);
  await page.click('复制原文');
  assert.match(page.copiedTexts[1], /Second paragraph/);
});

test('the full-text view switches between translation, source, and compare', async () => {
  const storage = makeStorage();
  const page = createPage({
    storage,
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

  // Translation only is the default: the source pane stays out of the card.
  assert.equal(fullTextBox(page).props.value, '段落甲译\n\n段落乙译');
  assert.equal(sourcePane(page), undefined);
  assert.equal(page.findButton('译文').props['aria-selected'], true);

  await page.click('原文');
  assert.match(textOf(sourcePane(page)), /First paragraph\./);
  assert.equal(page.findButton('原文').props['aria-selected'], true);
  assert.equal(fullTextBox(page), undefined, 'the source mode has no editable box');

  await page.click('对比');
  assert.match(page.text(), /First paragraph\./);
  assert.match(page.text(), /段落甲译/);
  const columns = page.hostNodes((node) => String(node.props.className).includes('dta-fullCols'));
  assert.equal(columns.length, 1, 'the compare mode lays the two panes out in columns');
  assert.match(textOf(sourcePane(page)), /Second paragraph\./);
  assert.ok(fullTextBox(page), 'the translation pane stays editable in compare mode');

  // The choice is remembered for the next visit.
  assert.equal(JSON.parse(storage.dump()['dsh-translation-assistant:prefs:v2']).fullMode, 'both');
  const reloaded = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
    },
  });
  await reloaded.flush();
  assert.match(reloaded.text(), /First paragraph\./);
  assert.match(reloaded.text(), /段落甲译/);
  assert.equal(reloaded.findButton('对比').props['aria-selected'], true);
});

test('editing the full text writes back to the segments and clears the score', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({
        sentences: ['句甲译', '句乙译'],
        paragraphs: ['段落甲译', '段落乙译'],
        model: 'm',
      }),
      scoreFull: () => ({ score: 81, comment: '整体通顺' }),
      'score-document': () => ({ score: 81, comment: '整体通顺' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.click('全文');
  await page.click('全文评分');
  assert.match(page.text(), /AI 评分 81/);

  await page.typeIn(fullTextBox(page), '改后甲段。\n\n改后乙段。');
  assert.equal(fullTextBox(page).props.value, '改后甲段。\n\n改后乙段。');
  // Editing through the full text resets the whole-document score.
  assert.doesNotMatch(page.text(), /AI 评分 81/);

  await page.click('逐段对比');
  const segmentBoxes = page.hostNodes((node) => node.type === 'textarea'
    && String(node.props.className).includes('dta-translationText'));
  assert.equal(segmentBoxes.length, 2);
  assert.equal(segmentBoxes[0].props.value, '改后甲段。');
  assert.equal(segmentBoxes[1].props.value, '改后乙段。');
});

test('editing a sentence rebuilds its paragraph and the full text', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({
        sentences: ['第一句。', '第二句。', '第三句。'],
        paragraphs: ['第一段整译。', '第二段整译。'],
        model: 'm',
      }),
      score: () => ({ score: 66, comment: '一般' }),
      retranslate: () => ({ translation: '重译第一句。' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'One. Two.\n\nThree.',
  );
  await page.click('开始翻译');
  // Score the first paragraph so the rebuild can be seen dropping that score.
  await page.click('AI 评分');
  assert.match(page.text(), /AI 评分 66/);

  await page.click('逐句对比');
  await page.typeIn(page.findTextarea((node) => node.props.value === '第一句。'), '第一句改。');

  // The paragraph the sentence belongs to is rebuilt from its sentences.
  await page.click('逐段对比');
  const paragraphBoxes = page.hostNodes((node) => node.type === 'textarea'
    && String(node.props.className).includes('dta-translationText'));
  assert.equal(paragraphBoxes[0].props.value, '第一句改。第二句。');
  assert.equal(paragraphBoxes[1].props.value, '第二段整译。', 'other paragraphs stay untouched');
  assert.doesNotMatch(page.text(), /AI 评分 66/);

  // And the full text follows the paragraph, since it is built from it.
  await page.click('全文');
  assert.equal(fullTextBox(page).props.value, '第一句改。第二句。\n\n第二段整译。');

  // The sentence itself keeps the edit.
  await page.click('逐句对比');
  assert.ok(page.findTextarea((node) => node.props.value === '第一句改。'));

  // AI retranslation in the sentence view syncs the same way.
  await page.click('AI 重译');
  await page.click('逐段对比');
  assert.equal(
    page.hostNodes((node) => node.type === 'textarea'
      && String(node.props.className).includes('dta-translationText'))[0].props.value,
    '重译第一句。第二句。',
  );
});

test('a rebuilt paragraph keeps a space between Latin sentences', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['Alpha.', 'Beta.'], paragraphs: ['Alpha and beta.'], model: 'm' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Alpha. Beta.',
  );
  await page.click('开始翻译');
  await page.click('逐句对比');
  await page.typeIn(page.findTextarea((node) => node.props.value === 'Alpha.'), 'Gamma.');
  await page.click('逐段对比');
  const boxes = page.hostNodes((node) => node.type === 'textarea'
    && String(node.props.className).includes('dta-translationText'));
  assert.equal(boxes[0].props.value, 'Gamma. Beta.');
});

test('editing a paragraph or the full text reaches the sentence view', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({
        sentences: ['句一。', '句二。', '句三。'],
        paragraphs: ['段一整译。', '段二整译。'],
        model: 'm',
      }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'One. Two.\n\nThree.',
  );
  await page.click('开始翻译');

  // The paragraph view is the default; editing a paragraph spreads it over the
  // two sentences it contains, leaving the next paragraph's sentence alone.
  await page.typeIn(page.findTextarea((node) => node.props.value === '段一整译。'), '改一。改二。');
  await page.click('逐句对比');
  assert.deepEqual(segmentValues(page), ['改一。', '改二。', '句三。']);

  // The full-text box writes paragraphs too, so it syncs the same way. A block
  // with fewer sentences than its paragraph leaves the spare box empty.
  await page.click('全文');
  await page.typeIn(fullTextBox(page), '全文一。\n\n全文二。');
  await page.click('逐句对比');
  assert.deepEqual(segmentValues(page), ['全文一。', '', '全文二。']);
});

test('a paragraph edit keeps its text when sentence counts differ', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句一。', '句二。'], paragraphs: ['段整译。'], model: 'm' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'One. Two.',
  );
  await page.click('开始翻译');
  await page.typeIn(page.findTextarea((node) => node.props.value === '段整译。'), '只有一句话。');
  await page.click('逐句对比');
  const values = segmentValues(page);
  assert.equal(values.length, 2);
  // The sentence count is fixed, so the text is kept whole in the first box and
  // the spare one stays empty instead of holding a chopped-up fragment.
  assert.deepEqual(values, ['只有一句话。', '']);
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
  await page.click('提示词重译');
  const promptInput = page.findInput((node) => node.props.placeholder === page.t('promptPlaceholder'));
  assert.ok(promptInput, 'prompt input must appear');
  assert.equal(promptInput.props.maxLength, 100);
  promptInput.props.onChange({ target: { value: '更口语化' } });
  await page.flush();
  assert.match(page.text(), /4\/100/);
  await page.click('重译');
  const call = page.fetchLog.find((entry) => entry.action === 'retranslate');
  assert.equal(call.body.extraPrompt, '更口语化');
  assert.match(page.text(), /新译文/);
});

test('a custom instruction is capped at 100 characters', async () => {
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
  await page.click('提示词重译');
  const long = '甲'.repeat(140);
  const promptInput = page.findInput((node) => node.props.placeholder === page.t('promptPlaceholder'));
  // The placeholder is an example only; it must not quote a stale length limit.
  assert.doesNotMatch(page.t('promptPlaceholder'), /\d/);
  promptInput.props.onChange({ target: { value: long } });
  await page.flush();
  const capped = page.findInput((node) => node.props.placeholder === page.t('promptPlaceholder'));
  assert.equal(capped.props.value.length, 100, 'the box holds 100 characters at most');
  assert.match(page.text(), /100\/100/);
  await page.click('重译');
  const call = page.fetchLog.find((entry) => entry.action === 'retranslate');
  assert.equal(call.body.extraPrompt.length, 100);
});

test('a scored segment can be improved from its own feedback', async () => {
  const longComment = `术语与前文不一致，第二句断句生硬，建议合并短句并统一称呼：${'细'.repeat(60)}`;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句译'], paragraphs: ['段落译'], model: 'm' }),
      score: () => ({ score: 62, comment: longComment }),
      retranslate: () => ({ translation: '按建议改好的译文' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'One.',
  );
  await page.click('开始翻译');
  assert.equal(page.findButton('按建议优化'), undefined, 'no suggestion before the segment is scored');

  await page.click('AI 评分');
  assert.ok(page.findButton('按建议优化'), 'a scored segment offers its own suggestion');
  const scoreLine = page.hostNodes((node) => node.props.className === 'dta-scoreLine')[0];
  assert.ok(scoreLine, 'the score and its comment share one line');
  assert.match(textOf(scoreLine), /按建议优化/, 'the suggestion sits after the score comment, not after the badge');
  await page.click('按建议优化');
  const call = page.fetchLog.find((entry) => entry.action === 'retranslate');
  assert.match(call.body.extraPrompt, /62/);
  assert.ok(
    call.body.extraPrompt.includes(longComment),
    'the whole feedback must survive the 100-character cap meant for typed prompts',
  );
  assert.ok(call.body.extraPrompt.length > 100, 'a machine-written suggestion is not capped at 100 characters');
  assert.match(page.text(), /按建议改好的译文/);

  // The suggestion applied to the text it judged, so it is consumed with it.
  assert.equal(page.findButton('按建议优化'), undefined);
  assert.doesNotMatch(page.text(), /AI 评分 62/);
  assert.ok(page.findButton('AI 评分'), 'the segment can be scored again');
});

test('batch suggestions rewrite every scored segment and consume their scores', async () => {
  const prompts = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      score: (body) => ({
        score: body.translation === '段落甲' ? 80 : 70,
        comment: `评语：${body.translation}`,
      }),
      retranslate: (body) => {
        prompts.push(body.extraPrompt);
        return { translation: `优化-${body.source}` };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  assert.equal(page.findButton('全部优化'), undefined, 'the batch action waits for scores');

  await page.click('全部评分');
  assert.ok(page.findButton('全部优化'), 'a fully scored view can apply every suggestion at once');
  await page.click('全部优化');
  assert.equal(prompts.length, 2, 'one request per scored segment');
  assert.ok(prompts.some((text) => /80/.test(text) && /段落甲/.test(text)), 'each prompt quotes its own score and feedback');
  assert.ok(prompts.every((text) => /段落甲|段落乙/.test(text)));
  assert.match(page.text(), /优化-First paragraph\./);
  assert.match(page.text(), /优化-Second paragraph\./);
  assert.equal(page.findButton('全部优化'), undefined, 'no suggestion survives the rewrite');
  assert.ok(page.findButton('全部评分'));
});

test('the paragraph view can stop a running batch optimize from the progress strip', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      score: () => ({ score: 80, comment: '可以' }),
      retranslate: hangingUntilAbort(),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.click('全部评分');
  await page.click('全部优化');
  // The batch optimize button morphs into its progress label.
  assert.match(page.text(), /优化中 0\/2/, 'the optimize progress shows on the button');
  assert.ok(page.findButton(page.t('stopTranslation')), 'the stop button sits beside it');
  await page.click(page.t('stopTranslation'));
  assert.doesNotMatch(page.text(), /已停止|请求失败|重译没有返回/, 'a stop is silent: no notice box at all');
  assert.equal(page.findButton(page.t('stopTranslation')), undefined);
  // Nothing landed, so the scores survive and the batch action is offered again.
  assert.ok(page.findButton('全部优化'), 'the stopped pass leaves the scores untouched');
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'retranslate').length, 2);
});

test('a single segment retranslate can be stopped beside its own button', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      retranslate: hangingUntilAbort(),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  // Only one stop button exists while one segment is rewriting.
  await page.click('AI 重译');
  assert.match(page.text(), /重译中…/, 'the busy segment button shows its own progress');
  assert.ok(page.findButton(page.t('stopTranslation')), 'the stop sits beside the busy button');
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'retranslate').length, 1);
  await page.click(page.t('stopTranslation'));
  assert.doesNotMatch(page.text(), /已停止|请求失败|重译没有返回/, 'a stop is silent: no notice box at all');
  assert.equal(page.findButton(page.t('stopTranslation')), undefined);
  // The segment is idle again with its translation untouched.
  assert.ok(page.findButton('AI 重译'), 'the segment button returns to its label');
  assert.match(page.text(), /段落甲/);
});

test('the workspace translates a picked file and saves the proofread copy', async () => {
  const writes = [];
  const files = new Map();
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Docs', path: '/ws/docs' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{ relPath: 'intro.md', name: 'intro.md', ext: 'md', size: 14, mtimeMs: 1 }],
      }),
      'workspace/read': (body) => ({
        content: body.relPath === 'intro.md' ? 'Hello.\n\nWorld.' : (files.get(body.relPath) ?? ''),
        encoding: 'text',
        name: body.relPath,
        ext: 'md',
        size: 14,
      }),
      'workspace/write': (body) => {
        files.set(body.relPath, body.content);
        writes.push(body);
        return { relPath: body.relPath, bytes: body.content.length };
      },
      translate: (body) => ({
        sentences: body.sentences.map((_item, index) => `S${index + 1}`),
        paragraphs: body.paragraphs.map((_item, index) => `P${index + 1}`),
        model: 'm',
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  // The registry auto-selects the workspace, so the tree loads without any
  // path entry.
  await page.flush();
  const listCall = page.fetchLog.find((entry) => entry.action === 'workspace/list');
  assert.ok(listCall, 'the registered workspace opened automatically');
  assert.equal(listCall.body.root, '/ws/docs');
  assert.match(page.text(), /intro\.md/);
  // The common flow: a single click on the file name starts translating an
  // untranslated file — no separate button needed.
  await page.click('intro.md');
  await page.flush();
  assert.match(page.text(), /P1译|P1/);
  assert.ok(page.text().includes(page.t('wsSaveToFile')));
  const translateCalls = page.fetchLog.filter((entry) => entry.action === 'translate');
  assert.ok(translateCalls.length >= 1, 'the file text went through the normal translation pass');
  // Default output: a copy inside the subfolder, the original untouched.
  await page.click(page.t('wsSaveToFile'));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].relPath, `\u8bd1\u6587/intro.md`);
  assert.equal(writes[0].overwrite, true);
  assert.match(page.text(), /\u5df2\u4fdd\u5b58\u5230 \u8bd1\u6587\/intro\.md\u3002/);
  // Back to the list; the state is internal — the row now offers a retranslate
  // pass instead of a fresh translate, and reopens without the model.
  await page.click(page.t('wsBackToList'));
  await page.flush();
  assert.ok(page.findButton(page.t('wsRetranslate')), 'a translated file offers a retranslate pass');
  const translateCount = page.fetchLog.filter((entry) => entry.action === 'translate').length;
  // Clicking the file name itself reopens the proofread view — no separate button.
  await page.click('intro.md');
  await page.flush();
  assert.match(page.text(), /P1译|P1/, 'the saved translation is loaded back');
  assert.equal(
    page.fetchLog.filter((entry) => entry.action === 'translate').length,
    translateCount,
    'reopening a proofread file must not retranslate',
  );
});

test('translate all runs through the pending files and writes each copy', async () => {
  const writes = [];
  const files = new Map();
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Ws', path: '/ws' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [
          { relPath: 'a.md', name: 'a.md', ext: 'md', size: 5, mtimeMs: 1 },
          { relPath: 'b.txt', name: 'b.txt', ext: 'txt', size: 6, mtimeMs: 2 },
        ],
      }),
      'workspace/read': (body) => ({
        content: ['a.md', 'b.txt'].includes(body.relPath)
          ? `Content of ${body.relPath}.\n\nSecond.`
          : (files.get(body.relPath) ?? ''),
        encoding: 'text',
        name: body.relPath,
        ext: 'md',
        size: 20,
      }),
      'workspace/write': (body) => {
        files.set(body.relPath, body.content);
        writes.push(body);
        return { relPath: body.relPath };
      },
      translate: (body) => ({
        sentences: body.sentences.map((_item, index) => `S${index + 1}`),
        paragraphs: body.paragraphs.map((_item, index) => `P${index + 1}`),
        model: 'm',
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  assert.match(page.text(), /\u5f85\u7ffb\u8bd1 2 \u4e2a/);
  await page.click(page.t('wsTranslateAll'));
  await page.flush();
  const paths = writes.map((entry) => entry.relPath).sort();
  assert.deepEqual(paths, ['\u8bd1\u6587/a.md', '\u8bd1\u6587/b.txt']);
  // Batch output is machine-saved: every row now offers a retranslate pass.
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'workspace/write').length, 2);
  assert.ok(page.findButton(page.t('wsRetranslate')));
});

test('preview output keeps the translation on the page and names the workspace button', async () => {
  const storage = makeStorage();
  storage.setItem(
    'dsh-translation-assistant:prefs:v2',
    JSON.stringify({ transMode: 'batch', wsSettings: { output: 'preview' } }),
  );
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Docs Project', path: '/ws/docs' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{ relPath: 'intro.md', name: 'intro.md', ext: 'md', size: 14, mtimeMs: 1 }],
      }),
      'workspace/read': (body) => ({
        content: body.relPath === 'intro.md' ? 'Hello.\n\nWorld.' : '',
        encoding: 'text',
        name: body.relPath,
        ext: 'md',
        size: 14,
      }),
      'workspace/write': () => ({ relPath: 'never' }),
      translate: (body) => ({
        sentences: body.sentences.map((_item, index) => `S${index + 1}`),
        paragraphs: body.paragraphs.map((_item, index) => `P${index + 1}`),
        model: 'm',
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  await page.click('intro.md');
  await page.flush();
  // Nothing lands on disk; the translation still shows in the comparison view.
  assert.equal(
    page.fetchLog.filter((entry) => entry.action === 'workspace/write').length,
    0,
    'preview mode must not write any file',
  );
  assert.match(page.text(), /P1译|P1/);
  assert.ok(page.text().includes(page.t('wsBannerPreview')), 'the banner explains the preview mode');
  assert.equal(page.findButton(page.t('wsSaveToFile')), undefined, 'preview offers no save button');
  // While workspace content is open, the toggle button names the workspace.
  assert.ok(page.text().includes('Docs Project'), 'the workspace button shows the workspace name');
  // Back to the list, then reopen: the on-page translation comes from history.
  await page.click(page.t('wsBackToList'));
  await page.flush();
  await page.click('intro.md');
  await page.flush();
  assert.match(page.text(), /P1译|P1/, 'the previewed translation reopens from history');
  assert.equal(
    page.fetchLog.filter((entry) => entry.action === 'workspace/write').length,
    0,
    'reopening a preview file still writes nothing',
  );
});

test('the drawer names the file while it translates on its own', async () => {
  // A whole file issues one request per paragraph, so hold every request and
  // release them together.
  const resolvers = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Docs', path: '/ws/docs' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{ relPath: 'intro.md', name: 'intro.md', ext: 'md', size: 14, mtimeMs: 1 }],
      }),
      'workspace/read': (body) => ({
        content: body.relPath === 'intro.md' ? 'Hello.\n\nWorld.' : '',
        encoding: 'text',
        name: body.relPath,
        ext: 'md',
        size: 14,
      }),
      'workspace/write': () => ({ relPath: 'never' }),
      // Hold the pass in flight so the mid-run label is observable.
      translate: () => new Promise((resolve) => {
        resolvers.push(() => resolve({ sentences: [], paragraphs: ['P1'], model: 'm' }));
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  await page.click('intro.md');
  await page.flush();
  // The in-flight label names the clicked file, so it cannot read like the
  // pending count beside it.
  assert.ok(
    page.text().includes('intro.md · '),
    'the translating label leads with the file name',
  );
  resolvers.forEach((release) => release());
  await page.flush();
  assert.ok(
    !page.text().includes('intro.md · '),
    'the label clears once the pass is done',
  );
});

test('workspace guidelines ride along and the toggle switches them off', async () => {
  const translateBodies = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Docs', path: '/ws/docs' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{ relPath: 'intro.md', name: 'intro.md', ext: 'md', size: 14, mtimeMs: 1 }],
      }),
      'workspace/read': (body) => ({
        content: body.relPath === 'intro.md' ? 'Hello.\n\nWorld.' : '',
        encoding: 'text',
        name: body.relPath,
        ext: 'md',
        size: 14,
      }),
      'workspace/write': () => ({ relPath: 'never' }),
      'workspace/spec': () => ({
        available: true,
        docs: [{ name: 'glossary.md', bytes: 12, text: 'AI → 人工智能' }],
        skipped: [],
      }),
      translate: (body) => {
        translateBodies.push(body);
        return {
          sentences: body.sentences.map((_item, index) => `S${index + 1}`),
          paragraphs: body.paragraphs.map((_item, index) => `P${index + 1}`),
          model: 'm',
        };
      },
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  assert.match(page.text(), /规范 1 个/, 'the drawer lists the guideline documents');
  await page.click('intro.md');
  await page.flush();
  const expected = '### glossary.md\n\nAI → 人工智能';
  assert.ok(
    translateBodies.every((body) => body.spec === expected),
    'the translating pass carries the joined guidelines',
  );
  // The banner names the guideline documents currently attached.
  const bannerSpec = page.hostNodes(
    (node) => node.type === 'span' && node.props.className === 'dta-wsBannerSpec',
  )[0];
  assert.ok(bannerSpec, 'the banner shows which guideline documents apply');
  assert.match(textOf(bannerSpec), /glossary\.md/);
  // Back to the list (the drawer closed itself when the file opened); the
  // guidelines toggle lives there.
  await page.click(page.t('wsBackToList'));
  await page.flush();
  const specBox = page.hostNodes(
    (node) => node.type === 'input' && node.props.type === 'checkbox' && node.props.checked,
  )[0];
  assert.ok(specBox, 'the guidelines toggle is on by default');
  specBox.props.onChange({ target: { checked: false } });
  await page.flush();
  const beforeToggle = translateBodies.length;
  await page.click(page.t('wsRetranslate'));
  await page.flush();
  assert.ok(translateBodies.length > beforeToggle, 'the retranslate pass issued new requests');
  assert.ok(
    translateBodies.slice(beforeToggle).every((body) => body.spec === undefined),
    'no request carries guidelines once the toggle is off',
  );
});

test('the drawer creates, edits, and deletes guideline documents', async () => {
  const writes = [];
  const files = new Map();
  const deletes = [];
  let specOn = false;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Docs', path: '/ws/docs' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{ relPath: 'intro.md', name: 'intro.md', ext: 'md', size: 14, mtimeMs: 1 }],
      }),
      'workspace/read': (body) => ({
        content: body.relPath === 'intro.md' ? 'Hello.\n\nWorld.' : (files.get(body.relPath) ?? ''),
        encoding: 'text',
        name: body.relPath,
        ext: 'md',
        size: 20,
      }),
      'workspace/write': (body) => {
        writes.push(body);
        files.set(body.relPath, body.content);
        return { relPath: body.relPath, bytes: body.content.length };
      },
      'workspace/spec/delete': (body) => {
        deletes.push(body);
        files.delete(`.translation-spec/${body.name}`);
        return { name: body.name };
      },
      'workspace/spec': () => {
        if (!specOn) return { available: false, docs: [], skipped: [] };
        const docs = [...files.entries()]
          .filter(([rel]) => rel.startsWith('.translation-spec/') && rel.endsWith('.md'))
          .map(([rel, content]) => ({
            name: rel.slice('.translation-spec/'.length),
            bytes: content.length,
            text: content,
          }))
          .sort((a, b) => (a.name < b.name ? -1 : 1));
        return { available: docs.length > 0, docs, skipped: [] };
      },
      translate: (body) => ({
        sentences: body.sentences.map((_item, index) => `S${index + 1}`),
        paragraphs: body.paragraphs.map((_item, index) => `P${index + 1}`),
        model: 'm',
      }),
    },
  });
  const specCount = (n) => page.t('wsSpecCount').replace('{count}', String(n));
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  // The manage entry always exists; without documents it just says 规范.
  assert.ok(page.findButton(page.t('wsSpecTitle')), 'the workspace drawer offers the guideline manager');
  assert.ok(!page.text().includes(specCount(1)), 'the count appears only once documents exist');
  specOn = true;
  files.set('.translation-spec/glossary.md', 'AI → 人工智能');
  await page.click(page.t('wsRefresh'));
  await page.flush();
  assert.ok(page.text().includes(specCount(1)), 'the manage entry counts the documents');
  // Open the guideline drawer and edit the document there.
  await page.click(specCount(1));
  await page.flush();
  assert.ok(page.text().includes('glossary.md'), 'the drawer lists the document');
  const card = page.hostNodes(
    (node) => node.type === 'button' && node.props.className === 'dta-wsSpecCard',
  )[0];
  assert.ok(card, 'the guideline card is clickable');
  card.props.onClick();
  await page.flush();
  const editor = page.hostNodes(
    (node) => node.type === 'textarea' && node.props.className === 'dta-wsSpecText',
  )[0];
  assert.ok(editor, 'the editor opens with the document content');
  assert.equal(editor.props.value, 'AI → 人工智能');
  editor.props.onChange({ target: { value: 'AI → 人工智能\nLLM → 大模型' } });
  await page.flush();
  await page.click(page.t('wsSpecSave'));
  await page.flush();
  const saved = writes.find((body) => body.relPath === '.translation-spec/glossary.md');
  assert.ok(saved, 'the edit was written into .translation-spec');
  assert.equal(saved.overwrite, true);
  assert.equal(saved.content, 'AI → 人工智能\nLLM → 大模型');
  assert.ok(page.text().includes('glossary.md'), 'saving returns to the list');
  // Create a second document from the drawer head.
  await page.click(page.t('wsSpecAdd'));
  await page.flush();
  const input = page.hostNodes(
    (node) => node.type === 'input' && node.props.className === 'dta-wsSpecInput',
  )[0];
  assert.ok(input, 'the create form asks for a file name');
  input.props.onChange({ target: { value: 'style' } });
  await page.flush();
  await page.click(page.t('wsSpecCreate'));
  await page.flush();
  assert.ok(
    writes.some((body) => body.relPath === '.translation-spec/style.md' && body.content === ''),
    'creating writes an empty .md file',
  );
  assert.ok(page.text().includes(specCount(2)));
  // An invalid name is rejected without a write.
  await page.click(page.t('wsSpecAdd'));
  await page.flush();
  const badInput = page.hostNodes(
    (node) => node.type === 'input' && node.props.className === 'dta-wsSpecInput',
  )[0];
  badInput.props.onChange({ target: { value: 'bad name!' } });
  await page.flush();
  const writeCount = writes.length;
  await page.click(page.t('wsSpecCreate'));
  await page.flush();
  assert.equal(writes.length, writeCount, 'an invalid name writes nothing');
  assert.match(page.text(), /文件名只能用/);
  await page.click(page.t('promptCancel'));
  await page.flush();
  // Deleting happens inside the editor and asks for confirmation first.
  const glossaryCard = page.hostNodes(
    (node) => node.type === 'button' && node.props.className === 'dta-wsSpecCard'
      && textOf(node).includes('glossary.md'),
  )[0];
  assert.ok(glossaryCard, 'the glossary card is listed again');
  glossaryCard.props.onClick();
  await page.flush();
  page.findButton(page.t('wsSpecDelete'), 0).props.onClick({ preventDefault() {} });
  await page.flush();
  const confirm = page.findButton(page.t('wsSpecConfirmDelete'), 0);
  assert.ok(confirm, 'the first click only asks for confirmation');
  confirm.props.onClick({ preventDefault() {} });
  await page.flush();
  assert.equal(deletes.length, 1);
  assert.equal(deletes[0].name, 'glossary.md');
  assert.ok(page.text().includes(specCount(1)), 'the list drops the deleted document');
  // Closing the drawer hands the layer back to the workspace.
  const specClose = page.hostNodes(
    (node) => node.type === 'button' && node.props.className === 'dta-drawerClose',
  )[0];
  assert.ok(specClose, 'the guideline drawer has a close button');
  specClose.props.onClick({ preventDefault() {} });
  await page.flush();
  assert.ok(page.findButton(specCount(1)), 'the workspace drawer is back');
});

test('the workspace list renders as a collapsible directory tree', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [{ id: 'ws1', title: 'Tree', path: '/ws/tree' }],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [
          { relPath: 'top.md', name: 'top.md', ext: 'md', size: 10, mtimeMs: 1 },
          { relPath: 'sub/nested.md', name: 'nested.md', ext: 'md', size: 12, mtimeMs: 2 },
          { relPath: 'sub/deep/inner.txt', name: 'inner.txt', ext: 'txt', size: 6, mtimeMs: 3 },
        ],
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  // Folders render as collapsible rows with their nested file counts.
  assert.ok(page.findButton('sub2'), 'the sub folder row shows a count of two files');
  assert.match(page.text(), /nested\.md/);
  assert.match(page.text(), /inner\.txt/);
  // Collapsing hides nested rows but keeps sibling files visible.
  await page.click('sub2');
  assert.doesNotMatch(page.text(), /nested\.md/);
  assert.match(page.text(), /top\.md/);
  // Expanding again brings the whole subtree back.
  await page.click('sub2');
  assert.match(page.text(), /nested\.md/);
  assert.match(page.text(), /inner\.txt/);
});

test('the workspace selector switches between registered workspaces', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [
          { id: 'w1', title: 'Docs', path: '/ws/docs' },
          { id: 'w2', title: 'Notes', path: '/ws/notes' },
        ],
      }),
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{
          relPath: body.root === '/ws/docs' ? 'doc.md' : 'note.md',
          name: body.root === '/ws/docs' ? 'doc.md' : 'note.md',
          ext: 'md',
          size: 4,
          mtimeMs: 1,
        }],
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  assert.match(page.text(), /doc\.md/, 'the first workspace opens by default');
  const select = page.hostNodes((node) => node.type === 'select' && node.props.className === 'dta-wsSelect')[0];
  assert.ok(select, 'the workspace selector renders');
  select.props.onChange({ target: { value: 'w2' } });
  await page.flush();
  assert.match(page.text(), /note\.md/, 'switching loads the other workspace');
  const roots = page.fetchLog
    .filter((entry) => entry.action === 'workspace/list')
    .map((entry) => entry.body.root);
  assert.deepEqual(roots, ['/ws/docs', '/ws/notes']);
});

test('an empty registry shows guidance and re-detects', async () => {
  let registryReply = { available: true, workspaces: [] };
  let registryCalls = 0;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => {
        registryCalls += 1;
        return registryReply;
      },
      'workspace/list': (body) => ({
        root: body.root,
        entries: [{ relPath: 'doc.md', name: 'doc.md', ext: 'md', size: 4, mtimeMs: 1 }],
      }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  assert.match(page.text(), /Harness/);
  assert.equal(registryCalls, 1);
  // The user adds a project in Harness, then presses detect again.
  registryReply = {
    available: true,
    workspaces: [{ id: 'w1', title: 'Docs', path: '/ws/docs' }],
  };
  await page.click(page.t('wsReloadRegistry'));
  await page.flush();
  await page.flush();
  assert.equal(registryCalls, 2, 'the detect-again button reruns the registry request');
  assert.doesNotMatch(page.text(), /Harness/);
  assert.match(page.text(), /doc\.md/, 'a workspace that appeared is opened right away');
});

test('an outdated host points to a restart instead of the generic fallback', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({ ok: false, status: 404, json: { error: 'Unknown endpoint.' } }),
      'workspace/list': (body) => ({ root: body.root, entries: [] }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  assert.match(page.text(), new RegExp(page.t('wsHostStale').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('an unavailable registry falls back to manual path entry', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      // No registry handler: the request fails, so the page falls back.
      'workspace/list': (body) => ({ root: body.root, entries: [] }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  assert.match(page.text(), new RegExp(page.t('wsUnavailable').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.equal(
    page.findInput((node) => node.props.placeholder === page.t('wsRootPlaceholder')),
    undefined,
    'the manual input stays hidden until asked for',
  );
  await page.click(page.t('wsManualToggle'));
  const pathInput = page.findInput((node) => node.props.placeholder === page.t('wsRootPlaceholder'));
  assert.ok(pathInput, 'the manual toggle reveals the path input');
  pathInput.props.onChange({ target: { value: '/ws/manual' } });
  await page.flush();
  await page.click(page.t('wsOpen'));
  await page.flush();
  const listCall = page.fetchLog.find((entry) => entry.action === 'workspace/list');
  assert.ok(listCall, 'the manual path opened the workspace');
  assert.equal(listCall.body.root, '/ws/manual');
});

test('the saved workspace id wins over the first registry entry', async () => {
  const storage = makeStorage();
  storage.setItem(
    'dsh-translation-assistant:prefs:v2',
    JSON.stringify({ transMode: 'batch', wsWorkspaceId: 'w2' }),
  );
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [
          { id: 'w1', title: 'Docs', path: '/ws/docs' },
          { id: 'w2', title: 'Notes', path: '/ws/notes' },
        ],
      }),
      'workspace/list': (body) => ({ root: body.root, entries: [] }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  const listCall = page.fetchLog.find((entry) => entry.action === 'workspace/list');
  assert.ok(listCall, 'the saved workspace opened automatically');
  assert.equal(listCall.body.root, '/ws/notes');
});

test('a legacy saved root maps onto the matching registered workspace', async () => {
  const storage = makeStorage();
  storage.setItem(
    'dsh-translation-assistant:prefs:v2',
    JSON.stringify({ transMode: 'batch', wsRoot: '/ws/notes' }),
  );
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      'workspace/registry': () => ({
        available: true,
        workspaces: [
          { id: 'w1', title: 'Docs', path: '/ws/docs' },
          { id: 'w2', title: 'Notes', path: '/ws/notes' },
        ],
      }),
      'workspace/list': (body) => ({ root: body.root, entries: [] }),
    },
  });
  await page.flush();
  await page.click(page.t('workspace'));
  await page.flush();
  const listCall = page.fetchLog.find((entry) => entry.action === 'workspace/list');
  assert.ok(listCall, 'the legacy root mapped onto its workspace');
  assert.equal(listCall.body.root, '/ws/notes');
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
  assert.ok(page.findButton('全文评分'), 'the full-text action is labelled without the AI prefix');
  assert.equal(page.findButton('AI 全文评分'), undefined);
  await page.click('全文评分');
  assert.match(page.text(), /AI 评分 90/);
  assert.match(page.text(), /全文流畅一致/);
  await page.click('隐藏评分');
  assert.doesNotMatch(page.text(), /AI 评分 90/);
});

test('the full-text view optimises the document from its own feedback', async () => {
  const prompts = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      'score-document': () => ({ score: 74, comment: '第二段术语不统一' }),
      retranslate: (body) => {
        prompts.push(body);
        return { translation: `优化-${body.source}` };
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
  assert.equal(page.findButton('按建议优化'), undefined, 'no document suggestion before the full text is scored');

  await page.click('全文评分');
  assert.ok(page.findButton('按建议优化'), 'a scored document offers the suggestion action');
  const fullScoreLine = page.hostNodes((node) => node.props.className === 'dta-scoreLine')[0];
  assert.ok(fullScoreLine, 'the full-text score and comment share one line');
  assert.match(textOf(fullScoreLine), /按建议优化/, 'the full-text suggestion follows its score comment');
  await page.click('按建议优化');
  assert.equal(prompts.length, 2, 'every translated paragraph is rewritten once');
  assert.ok(prompts.every((body) => body.kind === 'paragraph'));
  assert.ok(prompts.every((body) => /74/.test(body.extraPrompt) && /第二段术语不统一/.test(body.extraPrompt)));
  assert.equal(fullTextBox(page).props.value, '优化-First paragraph.\n\n优化-Second paragraph.');
  assert.equal(page.findButton('按建议优化'), undefined, 'the document score is consumed by the rewrite');
  assert.ok(page.findButton('全文评分'), 'the document can be scored again');
});

test('the full-text view retranslates per paragraph by default and whole-document when switched on', async () => {
  const rewrites = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      retranslate: (body) => {
        rewrites.push(body);
        return {
          translation: body.source.split('\n\n').map((part) => `重译-${part}`).join('\n\n'),
        };
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
  assert.ok(page.findButton('AI 重译'), 'the full-text toolbar offers the document retranslate');

  await page.click('AI 重译');
  assert.equal(rewrites.length, 2, 'every translated paragraph is retranslated once by default');
  assert.ok(rewrites.every((body) => body.kind === 'paragraph'));
  assert.ok(
    rewrites.every((body) => typeof body.translation === 'string' && body.translation.trim()),
    'the existing translation rides along as reference',
  );
  assert.ok(rewrites.every((body) => body.extraPrompt === undefined), 'no instruction without the prompt box');
  assert.equal(fullTextBox(page).props.value, '重译-First paragraph.\n\n重译-Second paragraph.');
  assert.doesNotMatch(page.text(), /AI 评分 \d/, 'the rewrite clears the full-text score');

  // Switch to whole-document mode: one request carries the full text.
  const modeSelect = page.hostNodes((node) => node.type === 'select' && node.props['aria-label'] === '翻译模式')[0];
  assert.ok(modeSelect, 'the translation-mode switch is in the workspace toolbar');
  modeSelect.props.onChange({ target: { value: 'whole' } });
  await page.flush();
  await page.click('AI 重译');
  assert.equal(rewrites.length, 3, 'the whole document goes out in one request');
  assert.equal(rewrites[2].kind, 'document');
  assert.equal(rewrites[2].source, 'First paragraph.\n\nSecond paragraph.');
  assert.equal(rewrites[2].translation, '重译-First paragraph.\n\n重译-Second paragraph.', 'the full translation rides along as reference');

  // The first pass only replaced the baseline, so this one leaves a snapshot —
  // the same rule the per-segment rewrite follows.
  await openVersions(page);
  assert.equal(textOf(versionTags(page)[0]), '重译前', 'the pass leaves one rollback point');
  assert.equal(versionTags(page).length, 2, 'the machine baseline and the rewrite snapshot');
});

test('the full-text prompt retranslate follows the switch: per paragraph by default', async () => {
  const calls = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      retranslate: (body) => {
        calls.push(body);
        if (body.source.startsWith('Second')) throw new Error('boom');
        return { translation: `口语-${body.source}` };
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
  assert.equal(page.findInput((node) => node.props.maxLength === 100), undefined, 'no prompt box until it is asked for');

  await page.click('提示词重译');
  const input = page.findInput((node) => node.props.maxLength === 100);
  assert.ok(input, 'the prompt box opens inside the full-text card');
  input.props.onChange({ target: { value: '更口语一些' } });
  await page.flush();
  assert.match(page.text(), /5\/100/, 'the counter tracks the instruction');

  await page.click('重译');
  assert.equal(calls.length, 2, 'the instruction reaches every paragraph');
  assert.ok(calls.every((body) => body.extraPrompt === '更口语一些'));
  assert.equal(fullTextBox(page).props.value, '口语-First paragraph.\n\n段落乙');
  assert.match(page.text(), /1 段重译失败，其余段落已完成。/, 'a partial failure is reported once');
});

test('the full-text prompt retranslate sends one document request when switched on', async () => {
  const calls = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      retranslate: (body) => {
        calls.push(body);
        if (calls.length === 1) {
          return {
            translation: body.source.split('\n\n').map((part) => `口语-${part}`).join('\n\n'),
          };
        }
        // The model merged the paragraphs: the reply cannot be mapped back.
        return { translation: '被合并成一整段的译文。' };
      },
    },
  });
  await page.flush();
  // The switch lives on the landing form and in the full-text card only.
  const modeSelect = page.hostNodes((node) => node.type === 'select' && node.props['aria-label'] === '翻译模式')[0];
  assert.ok(modeSelect, 'the translation-mode switch is in the full-text card');
  modeSelect.props.onChange({ target: { value: 'whole' } });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.click('全文');
  assert.equal(page.findInput((node) => node.props.maxLength === 100), undefined, 'no prompt box until it is asked for');

  await page.click('提示词重译');
  const input = page.findInput((node) => node.props.maxLength === 100);
  input.props.onChange({ target: { value: '更口语一些' } });
  await page.flush();
  await page.click('重译');
  assert.equal(calls.length, 1, 'the instruction rides on the single document request');
  assert.equal(calls[0].kind, 'document');
  assert.equal(calls[0].extraPrompt, '更口语一些');
  assert.equal(fullTextBox(page).props.value, '口语-First paragraph.\n\n口语-Second paragraph.');

  await page.click('AI 重译');
  assert.match(page.text(), /被分成 1 段，与原文的 2 段对不上/, 'a paragraph mismatch is reported');
  assert.equal(fullTextBox(page).props.value, '口语-First paragraph.\n\n口语-Second paragraph.', 'a mismatch writes nothing');
});

test('whole-document mode translates the full text in one request and falls back when it does not line up', async () => {
  const calls = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        if (body.document) {
          if (calls.length === 1) return { document: '整篇-第一段。\n\n整篇-第二段。', model: 'm' };
          // The model merged the paragraphs: the client falls back.
          return { document: '整篇被合并成一段。', model: 'm' };
        }
        return { sentences: ['逐段-第一句。', '逐段-第二句。'], paragraphs: ['逐段-第一段。', '逐段-第二段。'], model: 'm' };
      },
    },
  });
  await page.flush();
  const modeSelect = page.hostNodes((node) => node.type === 'select' && node.props['aria-label'] === '翻译模式')[0];
  assert.ok(modeSelect, 'the translation-mode switch sits next to the language picks');
  assert.equal(modeSelect.props.value, 'batch', 'tests start in the batched mode');
  modeSelect.props.onChange({ target: { value: 'whole' } });
  await page.flush();
  const helpIcon = page.hostNodes((node) => node.type === 'span' && node.props.className === 'dta-modeHelp')[0];
  assert.ok(helpIcon, 'the mode picker carries a hover help icon');
  assert.equal(helpIcon.props['data-open'], false, 'the bubble starts closed');
  const bubble = page.hostNodes((node) => node.type === 'span' && node.props.className === 'dta-modeBubble')[0];
  assert.ok(bubble, 'the bubble is always in the DOM; CSS controls its visibility');
  assert.match(textOf(bubble), /连贯优先.*对齐优先.*速度优先/, 'the bubble spells out all three modes');
  helpIcon.props.onClick({ preventDefault() {}, stopPropagation() {} });
  await page.flush();
  const reopened = page.hostNodes((node) => node.type === 'span' && node.props.className === 'dta-modeHelp')[0];
  assert.equal(reopened.props['data-open'], true, 'clicking the icon opens the bubble');
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  assert.equal(calls.length, 1, 'the first pass is one document request');
  assert.equal(calls[0].document, 'First paragraph.\n\nSecond paragraph.');
  assert.deepEqual(calls[0].sentences, [], 'no segment lists ride along');
  assert.match(page.text(), /整篇-第一段。/);
  // The sentence boxes are derived from the paragraph translations.
  await page.click('逐句对比');
  assert.match(page.text(), /整篇-第一段。/, 'sentence boxes carry the derived translation');

  // A merged reply cannot line up with the paragraphs: the same click falls
  // back to the batched request automatically.
  await page.click('新建翻译');
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.flush();
  assert.equal(calls.length, 4, 'the whole-document pass plus the two fallback chunks');
  assert.equal(calls[1].document, 'First paragraph.\n\nSecond paragraph.');
  assert.equal(calls[2].document, undefined);
  assert.deepEqual(calls[2].sentences, ['First paragraph.', 'Second paragraph.']);
  assert.deepEqual(calls[3].paragraphs, ['First paragraph.', 'Second paragraph.']);
  await page.click('逐段对比');
  assert.match(page.text(), /逐段-第一段。/);
});

test('whole-document mode starts checked and sends the document request', async () => {
  const calls = [];
  const page = createPage({
    noWholeDocPref: true,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        return body.document
          ? { document: '整篇-第一段。\n\n整篇-第二段。', model: 'm' }
          : { sentences: ['逐段-第一句。'], paragraphs: ['逐段-第一段。'], model: 'm' };
      },
    },
  });
  await page.flush();
  const modeSelect = page.hostNodes((node) => node.type === 'select' && node.props['aria-label'] === '翻译模式')[0];
  assert.ok(modeSelect, 'the switch is on the landing form');
  assert.equal(modeSelect.props.value, 'whole', 'whole-document mode is the default');
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  assert.equal(calls.length, 1, 'the first pass is one document request');
  assert.equal(calls[0].document, 'First paragraph.\n\nSecond paragraph.');
});

test('whole-document mode splits the reply on blank lines even with irregular spacing', async () => {
  const calls = [];
  const page = createPage({
    transMode: 'whole',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        // The model joins the paragraphs with single newlines plus an extra
        // blank line — the run of newlines still splits into two pieces.
        return body.document
          ? { document: '标记-第一段。\n\n\n标记-第二段。', model: 'm' }
          : { sentences: [], paragraphs: [], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  assert.equal(calls.length, 1, 'the plain reply lands without a fallback');
  await page.click('逐段对比');
  assert.match(page.text(), /标记-第一段。/);
  assert.match(page.text(), /标记-第二段。/);
});

test('segment-array mode sends the paragraphs as one array and consumes the aligned reply', async () => {
  const calls = [];
  const page = createPage({
    transMode: 'array',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        return Array.isArray(body.document)
          ? { paragraphs: body.document.map((source) => `数组-${source}`), model: 'm' }
          : { sentences: [], paragraphs: [], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  assert.equal(calls.length, 1, 'the whole document goes out as one array request');
  assert.deepEqual(calls[0].document, ['First paragraph.', 'Second paragraph.']);
  assert.deepEqual(calls[0].sentences, [], 'no segment lists ride along');
  await page.click('逐段对比');
  assert.match(page.text(), /数组-First paragraph\./);
  assert.match(page.text(), /数组-Second paragraph\./);
  assert.doesNotMatch(page.text(), /请求失败/, 'a successful array pass leaves no error notice');
});

test('segment-array mode falls back to the batched path when the reply does not line up', async () => {
  const calls = [];
  const page = createPage({
    transMode: 'array',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        if (Array.isArray(body.document)) {
          // The model merged the paragraphs: the aligned array is unusable.
          return { paragraphs: ['被合并成一整段的译文。'], model: 'm' };
        }
        return { sentences: ['逐段-第一句。', '逐段-第二句。'], paragraphs: ['逐段-第一段。', '逐段-第二段。'], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  assert.equal(calls.length, 3, 'the array pass plus the two fallback chunks');
  assert.equal(Array.isArray(calls[1].document), false, 'the fallback rides the segment lists');
  await page.click('逐段对比');
  assert.match(page.text(), /逐段-第一段。/);
});

test('a stored wholeDoc boolean migrates to the matching translation mode', () => {
  const storage = makeStorage();
  storage.setItem('dsh-translation-assistant:prefs:v2', JSON.stringify({ wholeDoc: false }));
  const page = createPage({ storage, noWholeDocPref: true });
  return page.flush().then(() => {
    const modeSelect = page.hostNodes((node) => node.type === 'select' && node.props['aria-label'] === '翻译模式')[0];
    assert.ok(modeSelect, 'the mode picker renders');
    assert.equal(modeSelect.props.value, 'batch', 'wholeDoc false becomes the batched mode');
  });
});

test('text without blank lines translates one paragraph per line in whole-document mode', async () => {
  const calls = [];
  const page = createPage({
    transMode: 'whole',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        return body.document
          ? { document: '一行-甲。\n\n一行-乙。\n\n一行-丙。', model: 'm' }
          : { sentences: [], paragraphs: [], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Line one.\nLine two.\nLine three.',
  );
  await page.click('开始翻译');
  assert.equal(calls.length, 1, 'the whole document goes out in one request');
  assert.equal(
    calls[0].document,
    'Line one.\nLine two.\nLine three.',
    'the raw text rides the request without any marker injection',
  );
  await page.click('逐段对比');
  assert.match(page.text(), /一行-甲。/);
  assert.match(page.text(), /一行-丙。/);
  // The full text carries one paragraph translation per line, in order.
  await page.click('全文');
  const fullText = fullTextBox(page);
  assert.ok(fullText, 'the full-text view is reachable');
  assert.match(fullText.props.value, /一行-甲。\n\n一行-乙。\n\n一行-丙。/);
});

test('the batched progress counter tracks paragraphs only, never sentences', async () => {
  const calls = [];
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        // Hold the first three chunks in flight so the counter is observable.
        if (calls.length <= 3) return gate;
        return { sentences: [], paragraphs: [], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'One. Two.\n\nThree. Four.\n\nFive. Six.\n\nSeven. Eight.\n\nNine. Ten.\n\nEleven. Twelve.\n\nThirteen. Fourteen.',
  );
  await page.click('开始翻译');
  await page.flush();
  assert.match(page.text(), /翻译中 0\/7/, 'the counter denominator is the paragraph count');
  assert.doesNotMatch(page.text(), /翻译中 0\/21/, 'sentences never inflate the counter');
  release({ sentences: new Array(14).fill('句。'), paragraphs: ['段一', '段二', '段三', '段四', '段五', '段六', '段七'], model: 'm' });
  await page.flush();
  assert.match(page.text(), /段一/, 'the translation lands after the held chunks resolve');
  assert.doesNotMatch(page.text(), /翻译中/, 'the counter is gone once the pass finishes');
  assert.doesNotMatch(page.text(), /请求失败/, 'a successful batched pass leaves no error notice behind');
});

test('a host that rejects document requests falls back to the batched path', async () => {
  const calls = [];
  const page = createPage({
    transMode: 'whole',
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        calls.push(body);
        if (body.document) {
          // An older Host only knows the segment lists.
          return {
            ok: false,
            status: 400,
            json: async () => ({ error: 'There is no text to translate.' }),
          };
        }
        return { sentences: ['逐段-第一句。', '逐段-第二句。'], paragraphs: ['逐段-第一段。', '逐段-第二段。'], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  await page.flush();
  assert.equal(calls.length, 3, 'the document request plus the two batched chunks');
  await page.click('逐段对比');
  assert.match(page.text(), /逐段-第一段。/, 'the batched fallback lands the translation');
  assert.doesNotMatch(page.text(), /请求内容不符合要求/, 'the rejection never reaches the user');
});

test('the sentence view offers scoring and suggestions per sentence', async () => {
  const prompts = [];
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段甲'], model: 'm' }),
      score: (body) => ({ score: 72, comment: `评语-${body.translation}` }),
      retranslate: (body) => {
        prompts.push(body);
        return { translation: `优化-${body.source}` };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    '第一段。\n\n第二段。',
  );
  await page.click('开始翻译');
  await page.click('逐句对比');
  assert.match(page.text(), /句甲/);
  assert.equal(page.findButton('按建议优化'), undefined, 'no suggestion before a sentence is scored');

  await page.click('AI 评分');
  assert.ok(page.findButton('按建议优化'), 'a scored sentence offers its own suggestion');
  await page.click('按建议优化');
  assert.equal(prompts[0].kind, 'sentence');
  assert.match(prompts[0].extraPrompt, /72/);
  assert.match(prompts[0].extraPrompt, /评语-句甲/);
  assert.match(page.text(), /优化-第一段。/);
  // Sentence edits still flow back into the paragraph view.
  await page.click('逐段对比');
  assert.match(page.text(), /优化-第一段。/);
});

test('suggestion buttons follow the score visibility toggle', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句译'], paragraphs: ['段译'], model: 'm' }),
      score: () => ({ score: 80, comment: '还行' }),
      'score-document': () => ({ score: 82, comment: '通篇尚可' }),
      retranslate: () => ({ translation: '优化后' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  await page.click('AI 评分');
  assert.ok(page.findButton('按建议优化'), 'a scored segment offers a suggestion while scores are visible');
  assert.ok(page.findButton('全部优化'));

  await page.click('隐藏评分');
  assert.equal(page.findButton('按建议优化'), undefined, 'hidden scores hide the per-segment suggestion');
  assert.equal(page.findButton('全部优化'), undefined, 'hidden scores hide the batch suggestion');

  await page.click('显示评分');
  assert.ok(page.findButton('按建议优化'), 'revealing scores brings the suggestion back');

  await page.click('全文');
  await page.click('全文评分');
  assert.ok(page.findButton('按建议优化'), 'the full text offers its suggestion once scored');
  await page.click('隐藏评分');
  assert.equal(page.findButton('按建议优化'), undefined, 'the full-text suggestion hides with the scores too');
});

test('image OCR fills the source box and translates the recognized text', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      ocr: () => ({ text: '图片里的原文。', model: 'm' }),
      translate: (body) => {
        if (body.sentences.length) assert.deepEqual(body.sentences, ['图片里的原文。']);
        return { sentences: ['图片译文'], paragraphs: ['图片译文'], model: 'm' };
      },
    },
  });
  await page.flush();
  const fileInput = imageInput(page);
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
  // Every segment is scored now, so the batch action reads as a rescore.
  assert.ok(page.findButton('重新评分'), 'a fully scored document must offer a rescore action');
  assert.equal(page.findButton('全部评分'), undefined);

  // Editing one segment clears its score, which turns the label back.
  const editor = page.findTextarea((node) => node.props.value === '段落甲');
  await page.typeIn(editor, '段落甲改');
  assert.ok(page.findButton('全部评分'), 'editing a segment must restore the score-all label');
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
    const fileInput = imageInput(page);
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

/** @param {object} page - page driver. @returns {object} the history toggle button. */
function historyButton(page) {
  return page.hostNodes((node) => node.type === 'button'
    && String(node.props.className).includes('dta-histBtn'))[0];
}

/** @param {object} page - page driver. @returns {string} the text shown on the history button. */
function historyLabel(page) {
  const label = page.hostNodes((node) => node.props.className === 'dta-histLabel')[0];
  return label ? textOf(label) : '';
}

/** @param {object} page - page driver. @returns {object[]} history row open buttons. */
function historyRows(page) {
  return page.hostNodes((node) => node.type === 'button' && node.props.className === 'dta-historyOpen');
}

/** @param {object} page - page driver. @returns {object | undefined} the full-text box. */
function fullTextBox(page) {
  return page.hostNodes((node) => node.type === 'textarea'
    && String(node.props.className).includes('dta-fullText'))[0];
}

/** @param {object} page - page driver. @returns {object | undefined} the hidden image picker. */
function imageInput(page) {
  return page.hostNodes((node) => node.type === 'input'
    && node.props.type === 'file'
    && String(node.props.accept || '').includes('image/'))[0];
}

/** @param {object} page - page driver. @returns {object | undefined} the hidden document picker. */
function documentInput(page) {
  return page.hostNodes((node) => node.type === 'input'
    && node.props.type === 'file'
    && String(node.props.accept || '').includes('.docx'))[0];
}

/** @param {object} page - page driver. @returns {object | undefined} the model picker. */
function modelSelect(page) {
  return page.hostNodes((node) => node.type === 'select'
    && String(node.props.className).includes('dta-modelSelect'))[0];
}

/** @param {object} page - page driver. @returns {object[]} the model picker's provider groups. */
function modelGroups(page) {
  return page.hostNodes((node) => node.type === 'optgroup');
}

/** @param {object} page - page driver. @returns {object | undefined} the full-text source pane. */
function sourcePane(page) {
  return page.hostNodes((node) => String(node.props.className).includes('dta-fullSource'))[0];
}

/** @param {object} page - page driver. @returns {string[]} segment translations in order. */
function segmentValues(page) {
  return page.hostNodes((node) => node.type === 'textarea'
    && String(node.props.className).includes('dta-translationText')).map((node) => node.props.value);
}

test('every translation lands in history and can be switched back or replaced', async () => {
  let round = 0;
  const storage = makeStorage();
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        // Chunks arrive per list; key the reply off the text, not the count.
        const first = String(body.sentences[0] || body.paragraphs[0] || '');
        return first.startsWith('First')
          ? { sentences: ['甲句译文'], paragraphs: ['甲段译文'], model: 'm' }
          : { sentences: ['乙句译文'], paragraphs: ['乙段译文'], model: 'm' };
      },
    },
  });
  await page.flush();
  assert.ok(historyButton(page), 'the history toggle must be in the header');
  // With nothing open the button names the panel instead of showing a count.
  assert.equal(historyLabel(page), page.t('historyTitle'));
  assert.equal(
    page.findButton(page.t('newTranslation')),
    undefined,
    'no new-document action before a document exists',
  );

  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First document.',
  );
  await page.click('开始翻译');
  assert.match(page.text(), /甲段译文/);

  // "New translation" leaves the finished document in history and reopens the form.
  const newButton = page.findButton('新建翻译');
  assert.ok(newButton.props.className.includes('dta-newBtn'), 'the new-document action sits in the header');
  assert.ok(
    newButton.props.className.includes('dta-btn--sm'),
    'the header action stays a small button next to the history chip',
  );
  await page.click('新建翻译');
  assert.ok(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'a fresh source form must appear',
  );
  assert.doesNotMatch(page.text(), /甲段译文/);
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Second document.',
  );
  await page.click('开始翻译');
  assert.match(page.text(), /乙段译文/);
  // Once a document is open the button shows its title, never a bare count.
  assert.equal(historyLabel(page), 'Second document.');

  // The panel lists both documents, newest first.
  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();
  assert.match(page.text(), /翻译历史/);
  assert.match(page.text(), /First document\./);
  assert.match(page.text(), /Second document\./);
  let rows = historyRows(page);
  assert.equal(rows.length, 2);
  assert.match(textOf(rows[0]), /Second document\./);

  // Switching back restores the older document with its translations and scores hidden.
  rows[1].props.onClick({ preventDefault() {} });
  await page.flush();
  assert.match(page.text(), /甲段译文/);
  assert.doesNotMatch(page.text(), /乙段译文/);
  assert.doesNotMatch(page.text(), /翻译历史/);

  // Editing a restored document updates its entry, not a new one.
  const editor = page.findTextarea((node) => node.props.value === '甲段译文');
  await page.typeIn(editor, '甲段改过的译文');
  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();
  rows = historyRows(page);
  assert.equal(rows.length, 2);

  // The whole history survives a reload.
  const reloaded = createPage({ storage });
  await reloaded.flush();
  assert.equal(historyLabel(reloaded), 'First document.');
  assert.match(reloaded.text(), /甲段改过的译文/);
});

test('deleting a history entry takes two clicks and falls back to the next entry', async () => {
  let round = 0;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        // Chunks arrive per list; key the reply off the text, not the count.
        const first = String(body.sentences[0] || body.paragraphs[0] || '');
        return first.startsWith('First')
          ? { sentences: ['甲句译文'], paragraphs: ['甲段译文'], model: 'm' }
          : { sentences: ['乙句译文'], paragraphs: ['乙段译文'], model: 'm' };
      },
    },
  });
  await page.flush();
  for (const [text, label] of [['First document.', '甲段译文'], ['Second document.', '乙段译文']]) {
    if (label === '乙段译文') {
      await page.click('新建翻译');
    } else {
      assert.ok(text);
    }
    await page.typeIn(
      page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
      text,
    );
    await page.click('开始翻译');
    assert.match(page.text(), new RegExp(label));
  }
  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();

  const deleteButtons = page.hostNodes((node) => node.type === 'button'
    && String(node.props.className).includes('dta-btn--danger'));
  assert.equal(deleteButtons.length, 2);
  // First click only arms the row.
  deleteButtons[0].props.onClick({ preventDefault() {} });
  await page.flush();
  assert.match(page.text(), /确认删除/);
  assert.equal(historyRows(page).length, 2);
  // Second click removes the current entry and opens the remaining one.
  const armed = page.hostNodes((node) => node.type === 'button'
    && String(node.props.className).includes('dta-btn--danger')
    && node.props['data-arm'] === 'true');
  armed[0].props.onClick({ preventDefault() {} });
  await page.flush();
  assert.doesNotMatch(page.text(), /确认删除/);
  assert.equal(historyRows(page).length, 1);
  assert.equal(historyLabel(page), 'First document.');
  assert.match(page.text(), /甲段译文/);
  assert.doesNotMatch(page.text(), /乙段译文/);
});

/** @param {object} page - page driver. @returns {object} the drawer search input. */
function historySearchInput(page) {
  return page.hostNodes((node) => node.type === 'input'
    && String(node.props.className).includes('dta-historySearch'))[0];
}

test('history search filters on source or translation and clears again', async () => {
  let round = 0;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        const first = String(body.sentences[0] || body.paragraphs[0] || '');
        return first.startsWith('Transformer')
          ? { sentences: ['变压器论文。'], paragraphs: ['变压器论文。'], model: 'm' }
          : { sentences: ['营收报告。'], paragraphs: ['营收报告。'], model: 'm' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Transformer paper.',
  );
  await page.click('开始翻译');
  await page.click('新建翻译');
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Revenue report.',
  );
  await page.click('开始翻译');

  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();
  assert.ok(historySearchInput(page), 'the drawer must offer a search box');

  // A hit only in the translated text.
  historySearchInput(page).props.onChange({ target: { value: '变压器' } });
  await page.flush();
  assert.equal(historyRows(page).length, 1);
  assert.match(textOf(historyRows(page)[0]), /Transformer paper\./);

  // A case-insensitive hit only in the source text.
  historySearchInput(page).props.onChange({ target: { value: 'REVENUE' } });
  await page.flush();
  assert.equal(historyRows(page).length, 1);
  assert.match(textOf(historyRows(page)[0]), /Revenue report\./);

  // Keywords are AND-ed across both sides of one document.
  historySearchInput(page).props.onChange({ target: { value: 'report 营收' } });
  await page.flush();
  assert.equal(historyRows(page).length, 1);

  // A miss shows the dedicated hint; clearing the query restores the list.
  historySearchInput(page).props.onChange({ target: { value: 'zzz' } });
  await page.flush();
  assert.equal(historyRows(page).length, 0);
  assert.match(page.text(), new RegExp(page.t('historyNoMatch')));
  page.hostNodes((node) => node.type === 'button' && node.props.className === 'dta-searchClear')[0]
    .props.onClick({ preventDefault() {} });
  await page.flush();
  assert.equal(historyRows(page).length, 2);
});

test('history keeps at most 200 documents, newest first', async () => {
  const storage = makeStorage();
  const entries = [];
  for (let index = 0; index < 205; index += 1) {
    const stamp = 1_600_000_000_000 + index * 1000;
    entries.push({
      id: `h${index}`,
      createdAt: stamp,
      updatedAt: stamp,
      doc: {
        sourceText: `Doc ${index}.`,
        sourceLanguage: 'auto',
        targetLanguage: '中文',
        sentences: [{ source: `Doc ${index}.`, translation: `文档 ${index}` }],
        paragraphs: [{ source: `Doc ${index}.`, translation: `文档 ${index}` }],
      },
    });
  }
  storage.setItem('dsh-translation-assistant:history:v1', JSON.stringify(entries));
  const page = createPage({ storage, handlers: { health: () => ({ ok: true, model: 'm' }) } });
  await page.flush();
  assert.equal(historyLabel(page), 'Doc 204.');

  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();
  const rows = historyRows(page);
  assert.equal(rows.length, 200);
  assert.match(textOf(rows[0]), /Doc 204\./);
  assert.doesNotMatch(textOf(rows[199]), /Doc 4\.$/);
  assert.match(page.text(), /最多保留 200 条/);
});

test('pinning a history entry keeps it on top across reloads', async () => {
  let round = 0;
  const storage = makeStorage();
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        // Chunks arrive per list; key the reply off the text, not the count.
        const first = String(body.sentences[0] || body.paragraphs[0] || '');
        return first.startsWith('First')
          ? { sentences: ['甲句译文'], paragraphs: ['甲段译文'], model: 'm' }
          : { sentences: ['乙句译文'], paragraphs: ['乙段译文'], model: 'm' };
      },
    },
  });
  await page.flush();
  for (const [text, label] of [['First document.', '甲段译文'], ['Second document.', '乙段译文']]) {
    if (label === '乙段译文') await page.click('新建翻译');
    await page.typeIn(
      page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
      text,
    );
    await page.click('开始翻译');
    assert.match(page.text(), new RegExp(label));
  }

  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();
  assert.match(textOf(historyRows(page)[0]), /Second document\./);

  const pinButtons = page.hostNodes((node) => node.type === 'button'
    && node.props.className === 'dta-historyPin');
  assert.equal(pinButtons.length, 2);
  assert.equal(pinButtons[1].props['aria-pressed'], false);

  // Pinning the older document lifts it above the newer one.
  pinButtons[1].props.onClick({ preventDefault() {} });
  await page.flush();
  assert.match(textOf(historyRows(page)[0]), /First document\./);
  const pinned = page.hostNodes((node) => node.type === 'button'
    && node.props.className === 'dta-historyPin')[0];
  assert.equal(pinned.props['aria-pressed'], true);
  assert.equal(pinned.props['data-pinned'], 'true');

  // Unpinning falls back to recency, then pin it again for the reload check.
  pinned.props.onClick({ preventDefault() {} });
  await page.flush();
  assert.match(textOf(historyRows(page)[0]), /Second document\./);
  page.hostNodes((node) => node.type === 'button' && node.props.className === 'dta-historyPin')[1]
    .props.onClick({ preventDefault() {} });
  await page.flush();

  const reloaded = createPage({ storage, handlers: { health: () => ({ ok: true, model: 'm' }) } });
  await reloaded.flush();
  // Boot still opens the most recently used document, not the pinned one.
  assert.match(reloaded.text(), /乙段译文/);
  historyButton(reloaded).props.onClick({ preventDefault() {} });
  await reloaded.flush();
  assert.match(textOf(historyRows(reloaded)[0]), /First document\./);
  assert.equal(
    reloaded.hostNodes((node) => node.type === 'button' && node.props.className === 'dta-historyPin')[0]
      .props['aria-pressed'],
    true,
  );
});

test('search results quote the hit in context with highlighted keywords', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => ({
        sentences: body.sentences.map(() => '这里是译文，包含变压器这个关键词，前后都有一些上下文文字。'),
        paragraphs: body.paragraphs.map(() => '这里是译文，包含变压器这个关键词，前后都有一些上下文文字。'),
        model: 'm',
      }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'A long source paragraph that talks about attention mechanisms and gradients in depth.',
  );
  await page.click('开始翻译');
  historyButton(page).props.onClick({ preventDefault() {} });
  await page.flush();
  // Nothing is quoted or highlighted before a query exists.
  assert.equal(page.hostNodes((node) => node.props.className === 'dta-historySnippet').length, 0);
  assert.equal(page.hostNodes((node) => node.type === 'mark').length, 0);

  historySearchInput(page).props.onChange({ target: { value: '变压器' } });
  await page.flush();
  const snippets = page.hostNodes((node) => node.props.className === 'dta-historySnippet');
  assert.equal(snippets.length, 1);
  const snippetText = textOf(snippets[0]);
  // The excerpt is cut from the middle of the document, with ellipses and context.
  assert.match(snippetText, /^…/);
  assert.match(snippetText, /变压器/);
  assert.ok(snippetText.length > '变压器'.length + 8, `too little context: ${snippetText}`);
  const marks = page.hostNodes((node) => node.type === 'mark' && node.props.className === 'dta-hl');
  assert.equal(marks.length, 1);
  assert.equal(textOf(marks[0]), '变压器');

  // Every keyword gets its own highlight.
  historySearchInput(page).props.onChange({ target: { value: '变压器 上下文' } });
  await page.flush();
  const multi = page.hostNodes((node) => node.type === 'mark' && node.props.className === 'dta-hl');
  assert.deepEqual(multi.map(textOf).sort(), ['上下文', '变压器']);

  // A miss drops the quote again.
  historySearchInput(page).props.onChange({ target: { value: 'zzz' } });
  await page.flush();
  assert.equal(page.hostNodes((node) => node.props.className === 'dta-historySnippet').length, 0);
});

/** @param {object} page - page driver. @returns {object | undefined} the revisions entry in the header. */
function versionsButton(page) {
  return page.hostNodes((node) => node.type === 'button'
    && String(node.props.className).includes('dta-versionsBtn'))[0];
}

/** @param {object} page - page driver. @returns {object[]} revision rows in the drawer. */
function versionRows(page) {
  return page.hostNodes((node) => node.type === 'li'
    && String(node.props.className).includes('dta-versionRow'));
}

/** @param {object} page - page driver. @returns {object[]} revision kind tags. */
function versionTags(page) {
  return page.hostNodes((node) => String(node.props.className).includes('dta-versionTag'));
}

/**
 * Open the revisions drawer.
 * @param {object} page - page driver.
 * @returns {Promise<void>} resolves after the drawer rendered.
 */
async function openVersions(page) {
  const button = versionsButton(page);
  assert.ok(button, 'the header must offer the revisions drawer');
  button.props.onClick({ preventDefault() {} });
  await page.flush();
}

test('a finished translation opens a revision drawer holding its baseline', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句译'], paragraphs: ['段落译'], model: 'm' }),
    },
  });
  await page.flush();
  assert.equal(versionsButton(page), undefined, 'no revisions entry before a document exists');
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.',
  );
  await page.click('开始翻译');

  assert.ok(versionsButton(page), 'the header offers the revisions drawer');
  assert.match(textOf(versionsButton(page)), /修改记录/);
  await openVersions(page);
  const drawer = page.hostNodes((node) => node.type === 'aside')[0];
  assert.ok(drawer, 'revisions open in a side drawer');
  assert.match(textOf(drawer), /修改记录/);
  assert.match(page.text(), /当前版本/);
  assert.match(page.text(), /段落译/);
  assert.ok(page.findButton('保存当前版本'), 'the drawer can snapshot the current text on demand');

  // The machine translation is the baseline, and it matches what is open now.
  const tags = versionTags(page);
  assert.equal(tags.length, 1);
  assert.equal(textOf(tags[0]), '初始翻译');
  assert.match(page.text(), /与当前一致/);
  assert.equal(page.findButton('回退到这里').props.disabled, true, 'nothing to restore from an identical snapshot');
});

test('an AI rewrite keeps the previous text as a revision and rollback restores it', async () => {
  let rewrite = 0;
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['甲句译文'], paragraphs: ['甲段译文'], model: 'm' }),
      retranslate: () => {
        rewrite += 1;
        return { translation: rewrite === 1 ? '乙段译文' : '丙段译文' };
      },
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.',
  );
  await page.click('开始翻译');

  // The first rewrite replaces the baseline itself, so the baseline already
  // covers it: no duplicate row for the same text.
  await page.click('AI 重译');
  assert.match(page.text(), /乙段译文/);
  assert.equal(versionTags(page).length, 0, 'the drawer is closed while translating');
  await page.click('AI 重译');
  assert.match(page.text(), /丙段译文/);

  await openVersions(page);
  const rows = versionRows(page);
  assert.equal(rows.length, 2, 'one snapshot for the text the second rewrite replaced');
  assert.equal(textOf(versionTags(page)[0]), '重译前');
  assert.match(textOf(rows[0]), /1 处与当前不同/);
  assert.match(textOf(rows[0]), /乙段译文/);
  assert.equal(textOf(versionTags(page)[1]), '初始翻译');

  await page.click('回退到这里');
  assert.match(page.text(), /乙段译文/);
  assert.doesNotMatch(page.text(), /丙段译文/);
  assert.match(page.text(), /已回退到「重译前」/);
  assert.equal(
    page.hostNodes((node) => node.type === 'aside').length,
    0,
    'a rollback returns to the document and closes the drawer',
  );

  // Rolling back keeps what it replaced, so the rollback itself is undoable.
  await openVersions(page);
  const after = versionRows(page);
  assert.equal(after.length, 3);
  assert.equal(textOf(versionTags(page)[0]), '回退前');
  assert.match(textOf(after[0]), /丙段译文/);
  const restoredRow = findAll(
    after[1],
    (node) => node.type === 'button' && textOf(node).trim() === '回退到这里',
  )[0];
  assert.equal(restoredRow.props.disabled, true, 'the restored revision now matches the text');
});

test('a batch suggestion pass stores one revision for the whole pass', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句甲', '句乙'], paragraphs: ['段落甲', '段落乙'], model: 'm' }),
      score: () => ({ score: 70, comment: '再顺一点' }),
      retranslate: (body) => ({ translation: `优化-${body.source}` }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.\n\nSecond paragraph.',
  );
  await page.click('开始翻译');
  // A manual edit makes the pre-batch text distinct from the baseline.
  await page.typeIn(page.findTextarea((node) => node.props.value === '段落甲'), '手改甲');
  await page.click('全部评分');
  await page.click('全部优化');
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'retranslate').length, 2);

  await openVersions(page);
  const rows = versionRows(page);
  assert.equal(rows.length, 2, 'two rewrites in one click still produce a single snapshot');
  assert.equal(textOf(versionTags(page)[0]), '优化前');
  assert.match(textOf(rows[0]), /2 处与当前不同/);
  assert.match(textOf(rows[0]), /手改甲/);
  assert.equal(textOf(versionTags(page)[1]), '初始翻译');
});

test('revisions can be saved by hand, deleted after a second click, and survive a reload', async () => {
  const storage = makeStorage();
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: () => ({ sentences: ['句译'], paragraphs: ['段落译'], model: 'm' }),
    },
  });
  await page.flush();
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'First paragraph.',
  );
  await page.click('开始翻译');
  await openVersions(page);

  // Saving without a change refreshes the baseline instead of stacking a copy.
  await page.click('保存当前版本');
  assert.match(page.text(), /已保存当前版本/);
  assert.equal(versionTags(page).length, 1);
  assert.equal(textOf(versionTags(page)[0]), '初始翻译');

  // A snapshot only reads as "different" once the text moves on from it.
  await page.typeIn(page.findTextarea((node) => node.props.value === '段落译'), '段落改过');
  assert.equal(versionTags(page).length, 1);
  assert.match(textOf(versionRows(page)[0]), /1 处与当前不同/);
  assert.match(textOf(versionRows(page)[0]), /段落译/);

  // Saving the edited text adds a real revision on top of it.
  await page.click('保存当前版本');
  assert.equal(versionTags(page).length, 2);
  assert.equal(textOf(versionTags(page)[0]), '手动保存');
  assert.match(textOf(versionRows(page)[0]), /与当前一致/);
  assert.match(textOf(versionRows(page)[1]), /1 处与当前不同/);

  // Revisions live with their document and come back after a reload.
  const reloaded = createPage({ storage });
  await reloaded.flush();
  assert.ok(versionsButton(reloaded));
  assert.match(textOf(versionsButton(reloaded)), /修改记录 2/);
  await openVersions(reloaded);
  assert.equal(versionTags(reloaded).length, 2);

  // Deleting takes an arming click, like deleting a document.
  await reloaded.click('删除');
  assert.ok(reloaded.findButton('确认删除'), 'the first click only arms the delete');
  assert.equal(versionTags(reloaded).length, 2);
  await reloaded.click('确认删除');
  assert.equal(versionTags(reloaded).length, 1);

  // Deleting the baseline leaves the drawer empty, not broken.
  await reloaded.click('删除');
  await reloaded.click('确认删除');
  assert.equal(versionTags(reloaded).length, 0);
  assert.match(reloaded.text(), /还没有修改记录/);
  assert.match(reloaded.text(), /段落改过/, 'the document itself is untouched');
});

test('a text file is imported, translated, and downloaded under its own name', async () => {
  const storage = makeStorage();
  const page = createPage({
    storage,
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        assert.deepEqual(body.paragraphs, ['First paragraph.', 'Second paragraph.']);
        return { sentences: ['一。', '二。'], paragraphs: ['第一段。', '第二段。'], model: 'm' };
      },
    },
  });
  await page.flush();
  const input = documentInput(page);
  assert.ok(input, 'a document picker must be present');
  const file = {
    name: 'notes.md',
    type: 'text/markdown',
    size: 64,
    text: async () => '\uFEFFFirst paragraph.\r\n\r\nSecond paragraph.\r\n',
  };
  input.props.onChange({ target: { files: [file], value: 'x' } });
  await page.flush();
  assert.match(page.text(), /第一段。/);
  assert.match(page.text(), /第二段。/);

  // The file name is remembered with the document, not just in the page state.
  const stored = JSON.parse(storage.getItem('dsh-translation-assistant:history:v1'));
  assert.equal(stored[0].doc.fileName, 'notes.md');

  await page.click('全文');
  const created = [];
  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  let blob = null;
  globalThis.document = {
    createElement(tag) {
      const anchor = {
        tag,
        click() {
          created.push({ href: anchor.href, download: anchor.download });
        },
      };
      return anchor;
    },
    body: { appendChild() {} },
  };
  URL.createObjectURL = (value) => {
    blob = value;
    return 'blob:mock';
  };
  try {
    await page.click('下载译文');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    URL.createObjectURL = previousCreate;
  }
  assert.equal(created.length, 1);
  assert.equal(created[0].download, 'notes.md');
  assert.equal(created[0].href, 'blob:mock');
  assert.equal(await blob.text(), '第一段。\n\n第二段。\n');
  assert.match(page.text(), /已下载「notes.md」/);
});

test('a .docx file is read without any external library', async () => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>',
    '<w:p><w:r><w:t>First paragraph.</w:t></w:r></w:p>',
    '<w:p><w:r><w:t xml:space="preserve">Second </w:t></w:r><w:r><w:t>&amp; last.</w:t></w:r></w:p>',
    '<w:p><w:r><w:t>Third</w:t></w:r><w:r><w:tab/><w:t>tabbed</w:t></w:r></w:p>',
    '</w:body></w:document>',
  ].join('');
  const archive = makeZip([
    { name: '[Content_Types].xml', data: '<Types/>' },
    { name: 'word/document.xml', data: xml },
  ]);
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        assert.deepEqual(body.paragraphs, ['First paragraph.', 'Second & last.', 'Third\ttabbed']);
        return { sentences: [], paragraphs: body.paragraphs.map((_item, index) => `段${index + 1}`), model: 'm' };
      },
    },
  });
  await page.flush();
  const file = {
    name: 'spec.docx',
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: archive.length,
    arrayBuffer: async () => archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength),
  };
  documentInput(page).props.onChange({ target: { files: [file], value: 'x' } });
  await page.flush();
  assert.match(page.text(), /段1/);
  assert.match(page.text(), /段3/);
});

test('an unreadable or oversized import explains the problem without a request', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
    },
  });
  await page.flush();
  const input = documentInput(page);
  // A legacy .doc cannot be unpacked, so it says so instead of guessing.
  input.props.onChange({
    target: { files: [{ name: 'old.doc', type: 'application/msword', size: 10 }], value: 'x' },
  });
  await page.flush();
  assert.match(page.text(), /不支持旧版 \.doc/);

  input.props.onChange({
    target: { files: [{ name: 'big.txt', type: 'text/plain', size: 9 * 1024 * 1024, text: async () => 'x' }], value: 'x' },
  });
  await page.flush();
  assert.match(page.text(), /文件太大/);
  assert.equal(page.fetchLog.filter((entry) => entry.action === 'translate').length, 0);
});

test('the header switches the model used by later requests and remembers the choice', async () => {
  const storage = makeStorage();
  const models = [
    { provider: 'deepseek-account', model: 'deepseek-flash', label: 'Flash', providerLabel: 'DeepSeek' },
    { provider: 'other', model: 'big-model', label: 'Big', providerLabel: 'Other vendor' },
  ];
  const handlers = {
    health: () => ({
      ok: true,
      model: 'deepseek-account/deepseek-flash',
      default: { provider: 'deepseek-account', model: 'deepseek-flash' },
      models,
    }),
    translate: (body) => ({
      sentences: [],
      paragraphs: body.paragraphs.map(() => (body.route ? '大模型译' : '默认译')),
      model: body.route ? 'other/big-model' : 'deepseek-account/deepseek-flash',
    }),
  };
  const page = createPage({ storage, handlers });
  await page.flush();
  const select = modelSelect(page);
  assert.ok(select, 'the picker appears when more than one model is available');
  assert.equal(select.props.value, 'default');
  // The default option plus one per model, with the catalog label in use.
  assert.match(textOf(select), /跟随默认模型 · deepseek-flash/);
  assert.match(textOf(select), /Big/);
  // Candidates are grouped by provider so two vendors do not look like one list.
  const groups = modelGroups(page);
  assert.deepEqual(groups.map((node) => node.props.label), ['DeepSeek', 'Other vendor']);
  assert.deepEqual(groups.map((node) => textOf(node)), ['Flash', 'Big']);

  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  assert.equal(page.fetchLog.find((entry) => entry.action === 'translate').body.route, undefined,
    'the default route is left to the Host');

  select.props.onChange({ target: { value: 'other/big-model' } });
  await page.flush();
  assert.match(page.text(), /「Big」/);
  // The confirmation is a Message-style toast with its own close button,
  // not an inline notice box.
  const toast = page.hostNodes(
    (node) => node.type === 'div' && typeof node.props.className === 'string'
      && node.props.className.includes('dta-toast'),
  )[0];
  assert.ok(toast, 'the switch hint renders as a toast');
  assert.equal(toast.props.role, 'status');
  assert.ok(
    toast.props.className.includes('dta-toast--success'),
    'a completed switch confirms with the success styling',
  );
  assert.match(textOf(toast), /「Big」/);
  const closeToast = page.hostNodes(
    (node) => node.type === 'button' && node.props.className === 'dta-toastClose',
  )[0];
  assert.ok(closeToast, 'the toast carries a manual close button');
  closeToast.props.onClick();
  await page.flush();
  assert.equal(
    page.hostNodes((node) => node.type === 'div' && typeof node.props.className === 'string'
      && node.props.className.includes('dta-toast')).length,
    0,
    'the close button dismisses the toast early',
  );
  await page.click('新建翻译');
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello again.',
  );
  await page.click('开始翻译');
  const call = page.fetchLog.filter((entry) => entry.action === 'translate').pop();
  assert.deepEqual(call.body.route, { provider: 'other', model: 'big-model' });
  assert.match(page.text(), /大模型译/);
  const prefs = JSON.parse(storage.getItem('dsh-translation-assistant:prefs:v2'));
  assert.deepEqual(prefs.route, { provider: 'other', model: 'big-model' });

  const reloaded = createPage({ storage, handlers });
  await reloaded.flush();
  assert.equal(modelSelect(reloaded).props.value, 'other/big-model');
});

test('a failed model listing explains why no picker is offered', async () => {
  const page = createPage({
    handlers: {
      health: () => ({
        ok: true,
        model: 'deepseek-account/deepseek-flash',
        default: { provider: 'deepseek-account', model: 'deepseek-flash' },
        models: [{ provider: 'deepseek-account', model: 'deepseek-flash' }],
        modelFailures: [{ provider: 'broken', message: 'model listing timed out' }],
      }),
      translate: (body) => ({ sentences: [], paragraphs: body.paragraphs.map(() => '译'), model: 'm' }),
    },
  });
  await page.flush();
  assert.equal(modelSelect(page), undefined, 'one candidate is not a choice');
  assert.match(page.text(), /读不到可切换的模型列表.*broken.*model listing timed out/);
});

test('the default label survives a switch, because the Host reports it separately', async () => {
  const page = createPage({
    handlers: {
      health: () => ({
        ok: true,
        model: 'deepseek-account/deepseek-flash',
        default: { provider: 'deepseek-account', model: 'deepseek-flash' },
        models: [
          { provider: 'deepseek-account', model: 'deepseek-flash', label: 'Flash' },
          { provider: 'deepseek-account', model: 'deepseek-pro', label: 'Pro' },
        ],
      }),
      translate: (body) => ({ sentences: [], paragraphs: body.paragraphs.map(() => '译'), model: 'm' }),
    },
  });
  await page.flush();
  const select = modelSelect(page);
  // One provider means a flat list rather than a single-entry optgroup.
  assert.deepEqual(modelGroups(page), []);
  select.props.onChange({ target: { value: 'deepseek-account/deepseek-pro' } });
  await page.flush();
  assert.equal(modelSelect(page).props.value, 'deepseek-account/deepseek-pro');
  const rendered = modelSelect(page);
  assert.match(textOf(rendered), /跟随默认模型 · deepseek-flash/);
});

test('a stored model that is no longer offered falls back to the default route', async () => {
  const storage = makeStorage({
    'dsh-translation-assistant:prefs:v2': JSON.stringify({
      route: { provider: 'other', model: 'retired' },
    }),
  });
  const page = createPage({
    storage,
    handlers: {
      health: () => ({
        ok: true,
        model: 'deepseek-account/deepseek-flash',
        models: [{ provider: 'deepseek-account', model: 'deepseek-flash' }],
      }),
      translate: (body) => ({ sentences: [], paragraphs: body.paragraphs.map(() => '译'), model: 'm' }),
    },
  });
  await page.flush();
  assert.match(page.text(), /之前选择的模型现在不可用/);
  await page.typeIn(
    page.findTextarea((node) => node.props.placeholder === page.t('sourcePlaceholder')),
    'Hello.',
  );
  await page.click('开始翻译');
  assert.equal(page.fetchLog.find((entry) => entry.action === 'translate').body.route, undefined);
});

/**
 * Build a minimal ZIP archive: enough for the page's own reader, with the
 * central directory it walks and deflate compression it inflates.
 * @param {{ name: string, data: string }[]} entries - archive entries.
 * @returns {Buffer} archive bytes.
 */
function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = Buffer.from(entry.data, 'utf8');
    const deflated = deflateRawSync(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(deflated.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, deflated);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(deflated.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += 30 + name.length + deflated.length;
  }
  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

test('an HTML file keeps its blocks, drops scripts, and downloads as HTML', async () => {
  const page = createPage({
    handlers: {
      health: () => ({ ok: true, model: 'm' }),
      translate: (body) => {
        assert.deepEqual(body.paragraphs, [
          'Title & more',
          'First bold paragraph.\nSecond line.',
          'Tom & Jerry—done now.',
        ]);
        return {
          sentences: [],
          paragraphs: ['标题与更多', '第一段粗体。\n第二行。', '汤姆和杰瑞——完成了。'],
          model: 'm',
        };
      },
    },
  });
  await page.flush();
  const html = [
    '<!doctype html>',
    '<html><head><meta charset="utf-8"><title>Doc</title><style>p{color:red}</style></head>',
    '<body>',
    '<h1>Title &amp; more</h1>',
    '<p>First <strong>bold</strong> paragraph.<br>Second line.</p>',
    '<p>Tom &amp; Jerry&mdash;done&nbsp;now.</p>',
    '<script>alert("x")</script>',
    '</body></html>',
  ].join('');
  documentInput(page).props.onChange({
    target: {
      files: [{ name: 'page.html', type: 'text/html', size: html.length, text: async () => html }],
      value: 'x',
    },
  });
  await page.flush();
  assert.match(page.text(), /标题与更多/);
  assert.match(page.text(), /第一段粗体/);

  await page.click('全文');
  const created = [];
  const previousDocument = globalThis.document;
  const previousCreate = URL.createObjectURL;
  let blob = null;
  globalThis.document = {
    createElement(tag) {
      const anchor = {
        tag,
        click() {
          created.push({ download: anchor.download });
        },
      };
      return anchor;
    },
    body: { appendChild() {} },
  };
  URL.createObjectURL = (value) => {
    blob = value;
    return 'blob:mock';
  };
  try {
    await page.click('下载译文');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    URL.createObjectURL = previousCreate;
  }
  assert.equal(created[0].download, 'page.html');
  const output = await blob.text();
  assert.match(output, /^<!doctype html>/);
  assert.match(output, /<title>page<\/title>/);
  assert.match(output, /<p>标题与更多<\/p>/);
  assert.match(output, /<p>第一段粗体。<br>第二行。<\/p>/);
  assert.doesNotMatch(output, /<script/);
});
