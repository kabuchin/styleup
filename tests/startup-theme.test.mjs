import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('../styleup/content.js', import.meta.url), 'utf8');
function tokens() {
  const values = new Set();
  return {
    add(...names) {
      for (const name of names) {
        if (!name || /[\t\n\f\r ]/.test(name)) throw new DOMException('Invalid token', 'InvalidCharacterError');
        values.add(name);
      }
    },
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name),
  };
}
function startup(cachedTheme, { inaccessible = false, bodyMissing = false } = {}) {
  const timers = new Map(), observers = [], inserted = [];
  let nextTimer = 0;
  const html = { classList: tokens(), appendChild(element) { inserted.push(element); } };
  const body = { classList: tokens() };
  const document = { readyState: 'loading', documentElement: html, head: html,
    body: bodyMissing ? null : body, createElement: () => ({}), addEventListener() {},
    querySelectorAll: () => [], querySelector: () => null, getElementById: () => null };
  const context = vm.createContext({ document,
    window: { addEventListener() {}, location: new URL('https://ed24lb.osaka-sandai.ac.jp/webclass/') },
    localStorage: { getItem(key) {
      if (inaccessible) throw new DOMException('Storage blocked', 'SecurityError');
      return key === 'styleup-theme-cache' ? cachedTheme : null;
    }, setItem() {} },
    MutationObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {} disconnect() { this.disconnected = true; }
    },
    chrome: { runtime: { onMessage: { addListener() {} } } },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id), setInterval() {}, requestAnimationFrame() {},
    console: { log() {}, warn() {}, error() {} },
  });
  let error;
  try { vm.runInContext(source, context); } catch (caught) { error = caught; }
  return { error, html, body, document, inserted, observers,
    reveal() { for (const timer of timers.values()) if (timer.delay === 100) timer.fn(); } };
}

for (const cached of ['theme-dark theme-red', 'theme-dark\n', 'unknown-theme', '', null, 'default']) {
  test(`bad or default cache does not abort or strand the hidden page: ${JSON.stringify(cached)}`, () => {
    const h = startup(cached);
    assert.equal(h.error, undefined);
    h.reveal();
    assert.equal(h.html.classList.contains('styleup-ready'), true);
    for (const name of ['theme-dark', 'theme-green', 'theme-red', 'theme-purple', 'unknown-theme', 'default']) {
      assert.equal(h.html.classList.contains(name), false, name);
    }
  });
}

test('blocked website storage does not abort startup or prevent revealing the page', () => {
  const h = startup(null, { inaccessible: true });
  assert.equal(h.error, undefined);
  h.reveal();
  assert.equal(h.html.classList.contains('styleup-ready'), true);
});

for (const theme of ['theme-dark', 'theme-green', 'theme-red', 'theme-purple']) {
  test(`supported cached theme is still applied immediately: ${theme}`, () => {
    const h = startup(theme);
    assert.equal(h.error, undefined);
    assert.equal(h.html.classList.contains(theme), true);
    assert.equal(h.body.classList.contains(theme), true);
    h.reveal();
    assert.equal(h.html.classList.contains('styleup-ready'), true);
  });
}

test('supported cached theme waits safely for a body created later', () => {
  const h = startup('theme-dark', { bodyMissing: true });
  assert.equal(h.error, undefined);
  h.document.body = h.body;
  const observer = h.observers[0];
  observer.callback([], observer);
  assert.equal(h.body.classList.contains('theme-dark'), true);
  assert.equal(observer.disconnected, true);
  h.reveal();
  assert.equal(h.html.classList.contains('styleup-ready'), true);
});
