import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const clientUrl = new URL('../lib/client.js', import.meta.url);

test('browser bundle keeps the lazy-CJS module loader wrapper', async () => {
  const source = await readFile(clientUrl, 'utf8');
  assert.ok(source.startsWith('window.__ModuleLoader__.load({'), 'bundle must register a factory');
  assert.match(source, /id: "dsh-translation-assistant"/);
  assert.match(source, /factory: \(require\) => \{ var module = \{ exports: \{\} \}; var exports = module\.exports;/);
  assert.ok(source.trimEnd().endsWith('return module.exports; } });'), 'factory must return its exports');
});

test('browser bundle only requires platform modules', async () => {
  const source = await readFile(clientUrl, 'utf8');
  const required = [...source.matchAll(/require\(["']([^"']+)["']\)/g)].map((match) => match[1]);
  assert.ok(required.length > 0, 'bundle must require react');
  const allowed = new Set(['react', 'react/jsx-runtime']);
  for (const id of new Set(required)) {
    assert.ok(allowed.has(id), `unexpected runtime require in client bundle: ${id}`);
  }
});

test('host entry exposes the plugin exports', async () => {
  // @ts-ignore - lib/ is generated JavaScript and has no declarations.
  const host = await import('../lib/index.js');
  assert.equal(typeof host.apply, 'function');
  assert.ok(Array.isArray(host.inject));
  const schema = host.Config && host.Config['~standard'];
  assert.ok(schema && typeof schema.validate === 'function', 'option B Config must implement Standard Schema');
  const result = schema.validate({ maxTokens: 'not-a-number', targetLanguage: '中文' });
  assert.equal(result.value.maxTokens, 8192, 'invalid config still falls back to defaults');
  assert.equal(result.value.targetLanguage, '中文');
});
