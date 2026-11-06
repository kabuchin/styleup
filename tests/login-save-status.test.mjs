import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(process.env.STYLEUP_POPUP_PATH ? resolve(process.env.STYLEUP_POPUP_PATH) : new URL('../styleup/popup.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../styleup/popup.html', import.meta.url), 'utf8');
const fixture = { wcUsername: 'SYNTHETIC_USER', wcPassword: ' SYNTHETIC_PASSWORD ', autoLogin: true, autoLoginFailCount: 0 };

function harness({ throws = false, immediate = false } = {}) {
  let click;
  let now = 0, nextTimer = 1, runtimeError = null, errorReads = 0;
  const timers = new Map(), callbacks = [], writes = [], logs = [];
  const stored = { wcUsername: 'OLD_SYNTHETIC_USER', wcPassword: 'OLD_SYNTHETIC_PASSWORD', autoLogin: false, autoLoginFailCount: 3 };
  const button = { disabled: false, addEventListener(name, callback) { assert.equal(name, 'click'); click = callback; } };
  const success = { style: { display: 'none' } }, failure = { style: { display: 'none' }, textContent: '保存できませんでした。もう一度保存してください。' }, count = { style: { display: 'flex' } };
  const elements = { 'save-login': button, 'save-status': success, 'save-error': failure, 'login-fail-count': count,
    username: { value: ' SYNTHETIC_USER ' }, password: { value: fixture.wcPassword }, 'auto-login': { checked: true } };
  const runtime = {};
  Object.defineProperty(runtime, 'lastError', { get() { errorReads++; return runtimeError; } });
  const context = vm.createContext({ document: { addEventListener() {}, getElementById: id => elements[id] },
    chrome: { runtime, storage: { sync: { set(data, callback) {
      const snapshot = JSON.parse(JSON.stringify(data));
      writes.push(snapshot);
      if (throws) throw new Error('Synthetic API failure; do not display payload');
      const complete = error => {
        runtimeError = error === true ? { message: 'SYNTHETIC_PRIVATE_ERROR_PAYLOAD' } : error || null;
        if (!error) Object.assign(stored, snapshot);
        try { callback(); } finally { runtimeError = null; }
      };
      if (immediate) complete(false); else callbacks.push(complete);
    } } } },
    setTimeout(fn, delay) { const id = nextTimer++; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout: id => timers.delete(id),
    console: Object.fromEntries(['log', 'warn', 'error'].map(key => [key, (...args) => logs.push(args)])),
  });
  vm.runInContext(source, context, { filename: 'popup.js', timeout: 1000 });
  context.setupLoginSettings();
  return { button, success, failure, count, elements, stored, writes, logs, timers,
    get errorReads() { return errorReads; },
    click: () => click(), complete(error = false) { assert.ok(callbacks.length); callbacks.shift()(error); },
    advance(ms) { now += ms; for (const [id, item] of [...timers]) if (item.at <= now) { timers.delete(id); item.fn(); } },
  };
}

function visible(element) { return element.style.display === 'flex'; }

test('error notice is separate from existing success UI and uses an accessible generic message', () => {
  assert.match(html, /id="save-status"[\s\S]*?ログイン情報を保存しました/);
  assert.match(html, /class="alert alert-warning" id="save-error" role="alert" style="display: none;"/);
  assert.match(html, /保存できませんでした。もう一度保存してください。/);
});

test('save remains pending until storage confirms success and preserves saved-value semantics', () => {
  const h = harness(); h.click();
  assert.deepEqual(h.writes, [fixture]);
  assert.equal(h.button.disabled, true);
  assert.equal(visible(h.success), false);
  assert.equal(visible(h.failure), false);
  assert.equal(visible(h.count), true);
  h.complete();
  assert.equal(h.button.disabled, false);
  assert.equal(visible(h.success), true);
  assert.equal(visible(h.failure), false);
  assert.equal(visible(h.count), false);
  assert.deepEqual(h.stored, fixture);
  assert.equal(h.errorReads, 1);
});

test('storage callback failure never shows success or clears the visible failure count', () => {
  const h = harness(); h.click(); h.complete(true);
  assert.equal(h.button.disabled, false);
  assert.equal(visible(h.success), false);
  assert.equal(visible(h.failure), true);
  assert.equal(visible(h.count), true);
  assert.equal(h.stored.autoLoginFailCount, 3);
  assert.equal(h.errorReads, 1);
  assert.equal(h.timers.size, 0);
  assert.equal(h.elements.username.value, ' SYNTHETIC_USER ');
  assert.equal(h.elements.password.value, fixture.wcPassword);
  assert.deepEqual(h.logs, []);
});

test('a synchronous storage API exception also permits retry without a false success', () => {
  const h = harness({ throws: true });
  assert.doesNotThrow(() => h.click());
  assert.equal(h.button.disabled, false);
  assert.equal(visible(h.success), false);
  assert.equal(visible(h.failure), true);
  assert.equal(visible(h.count), true);
  h.click(); assert.equal(h.writes.length, 2);
  assert.equal(h.elements.password.value, fixture.wcPassword);
  assert.deepEqual(h.logs, []);
});

test('a pending save does not issue overlapping writes', () => {
  const h = harness(); h.click(); h.click();
  assert.equal(h.writes.length, 1);
  h.complete(); h.click(); assert.equal(h.writes.length, 2);
});

test('failed save can be retried with new input, then hides the old error', () => {
  const h = harness(); h.click(); h.complete(true);
  h.elements.username.value = ' RETRIED_USER ';
  h.elements.password.value = 'RETRIED_PASSWORD';
  h.elements['auto-login'].checked = false;
  h.click();
  assert.equal(visible(h.failure), false);
  assert.equal(visible(h.count), true);
  h.complete();
  assert.equal(visible(h.failure), false);
  assert.equal(visible(h.success), true);
  assert.deepEqual(h.stored, { wcUsername: 'RETRIED_USER', wcPassword: 'RETRIED_PASSWORD', autoLogin: false, autoLoginFailCount: 0 });
});

test('a failed later save hides an earlier success without losing input', () => {
  const h = harness(); h.click(); h.complete(); h.advance(1000);
  h.elements.password.value = 'SECOND_SYNTHETIC_PASSWORD';
  h.click(); assert.equal(visible(h.success), false);
  h.complete(true); h.advance(5000);
  assert.equal(visible(h.success), false);
  assert.equal(visible(h.failure), true);
  assert.equal(h.elements.password.value, 'SECOND_SYNTHETIC_PASSWORD');
  assert.equal(h.stored.wcPassword, fixture.wcPassword);
});

test('a later success gets its full display interval instead of an older timer', () => {
  const h = harness(); h.click(); h.complete(); h.advance(2000);
  h.click(); h.complete(); h.advance(1000);
  assert.equal(visible(h.success), true);
  h.advance(1999); assert.equal(visible(h.success), true);
  h.advance(1); assert.equal(visible(h.success), false);
});

test('initial successful save keeps the existing three-second timeout', () => {
  const h = harness(); h.click(); h.complete(); h.advance(2999);
  assert.equal(visible(h.success), true);
  h.advance(1); assert.equal(visible(h.success), false);
});

test('immediate storage completion still leaves the button enabled', () => {
  const h = harness({ immediate: true }); h.click();
  assert.equal(h.button.disabled, false);
  assert.equal(visible(h.success), true);
  assert.equal(visible(h.failure), false);
});

test('empty values and disabled auto-login retain existing clear/save behavior', () => {
  const h = harness(); h.elements.username.value = '  '; h.elements.password.value = ''; h.elements['auto-login'].checked = false;
  h.click(); h.complete();
  assert.deepEqual(h.stored, { wcUsername: '', wcPassword: '', autoLogin: false, autoLoginFailCount: 0 });
});

for (const error of [{}, { message: '' }]) {
  test(`a runtime error without a usable message still fails: ${JSON.stringify(error)}`, () => {
    const h = harness(); h.click(); h.complete(error);
    assert.equal(visible(h.success), false);
    assert.equal(visible(h.failure), true);
    assert.equal(visible(h.count), true);
    assert.equal(h.button.disabled, false);
  });
}

test('failure feedback never writes input or internal error values into the DOM', () => {
  const h = harness(); h.click(); h.complete({ message: 'SYNTHETIC_PRIVATE_ERROR_PAYLOAD' });
  assert.equal(h.failure.textContent, '保存できませんでした。もう一度保存してください。');
  assert.equal(JSON.stringify(h.failure).includes('SYNTHETIC'), false);
  assert.equal(JSON.stringify(h.success).includes('SYNTHETIC'), false);
  assert.deepEqual(h.logs, []);
});
