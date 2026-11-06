import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const popupSource = readFileSync(new URL('../styleup/popup.js', import.meta.url), 'utf8');
const contentSource = readFileSync(new URL('../styleup/content.js', import.meta.url), 'utf8');
const appearance = {
  selectedTheme: 'theme-green', baseTheme: 'dark', colorPreset: 'green',
  mainColor: '#112233', subColor: '#223344', accentColor: '#334455',
  dayTagStyle: 'colorful', dayColors: { mon: '#445566' },
  autoScroll: false, enableAnimations: false, enableBlur: false, courseFontSize: 18,
};
const privateSettings = {
  wcUsername: 'TEST_ONLY_USERNAME', wcPassword: 'TEST_ONLY_PASSWORD',
  autoLogin: true, autoLoginFailCount: 2, futurePrivateSetting: 'TEST_ONLY_FUTURE_SECRET',
};

function classList() {
  const values = new Set();
  return { add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    contains: name => values.has(name) };
}
function harness(source, values = {}) {
  const messages = [], logs = [], reads = [], writes = [];
  const timers = new Map();
  let nextTimer = 0;
  let listener;
  const stored = structuredClone(values);
  const element = () => ({ classList: classList(), appendChild() {}, style: {},
    setAttribute() {}, querySelectorAll: () => [], addEventListener() {} });
  const context = vm.createContext({
    document: { readyState: 'loading', head: element(), documentElement: element(),
      body: element(), createElement: element, addEventListener() {},
      querySelectorAll: () => [], querySelector: () => null, getElementById: () => null },
    window: { addEventListener() {}, location: new URL('https://ed24lb.osaka-sandai.ac.jp/webclass/') },
    localStorage: { getItem: () => null, setItem() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    console: { log: (...args) => logs.push(args), warn() {}, error() {} },
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, delay }); return id; },
    clearTimeout: id => timers.delete(id), setInterval() {}, requestAnimationFrame() {},
    chrome: {
      runtime: { onMessage: { addListener(fn) { listener = fn; } } },
      storage: { sync: {
        get(keys, callback) {
          reads.push(keys);
          const result = keys === null ? { ...stored } : Object.fromEntries(
            (Array.isArray(keys) ? keys : Object.keys(keys)).map(key => [key,
              Object.hasOwn(stored, key) ? stored[key] : keys[key]]),
          );
          callback(result);
        },
        set(value, callback) { writes.push(value); Object.assign(stored, value); callback?.(); },
      } },
      tabs: { query(_query, callback) { callback([{ id: 1 }, { id: 2 }]); },
        sendMessage(id, message, callback) { messages.push({ id, message }); callback?.(); } },
    },
  });
  vm.runInContext(source, context);
  return { context, messages, logs, reads, writes, stored,
    dispatch(message) { return listener(message, {}, () => {}); },
    flush(delay) {
      for (const [id, timer] of [...timers]) if (timer.delay === delay) {
        timers.delete(id); timer.fn();
      }
    },
  };
}

function contentHarness() {
  const h = harness(contentSource);
  vm.runInContext(`setTheme = () => {}; applyCustomColors = () => {};
    applyDayTagStyle = () => {}; applyCourseFontSize = () => {};`, h.context);
  return h;
}

test('appearance broadcasts include visual settings but never credentials or unrelated keys', () => {
  const h = harness(popupSource, { ...appearance, ...privateSettings });
  h.context.applyToWebClass();
  h.flush(300);
  assert.equal(h.messages.length, 2);
  for (const { message } of h.messages) {
    assert.equal(message.action, 'applyFullSettings');
    assert.deepEqual(JSON.parse(JSON.stringify(message.settings)), { ...appearance, selectedTheme: 'theme-dark' });
    for (const key of Object.keys(privateSettings)) assert.equal(Object.hasOwn(message.settings, key), false, key);
  }
  h.flush(500);
  assert.equal(h.stored.wcUsername, privateSettings.wcUsername);
  assert.equal(h.stored.wcPassword, privateSettings.wcPassword);
  assert.equal(h.stored.autoLogin, true);
});

test('complete appearance application does not log settings values', () => {
  const h = contentHarness();
  h.dispatch({ action: 'applyFullSettings', settings: { ...appearance, ...privateSettings } });
  assert.equal(JSON.stringify(h.logs).includes('TEST_ONLY_'), false);
  assert.equal(h.context.window.styleupSettings.courseFontSize, 18);
});

test('incremental appearance application does not log settings values', () => {
  const h = contentHarness();
  h.dispatch({ action: 'updateSettings', settings: { courseFontSize: 20, ...privateSettings } });
  assert.equal(JSON.stringify(h.logs).includes('TEST_ONLY_'), false);
  assert.equal(h.context.window.styleupSettings.courseFontSize, 20);
});

for (const [baseTheme, colorPreset, selectedTheme] of [
  ['dark', 'red', 'theme-dark'], ['light', 'green', 'theme-green'],
  ['light', 'red', 'theme-red'], ['light', 'purple', 'theme-purple'],
  ['light', 'blue', 'default'],
]) {
  test(`visual-only messages preserve theme selection: ${baseTheme}/${colorPreset}`, () => {
    const h = harness(popupSource, { ...appearance, ...privateSettings, baseTheme, colorPreset });
    h.context.applyToWebClass();
    h.flush(300);
    assert.equal(h.messages.length, 2);
    assert.equal(h.messages[0].message.settings.selectedTheme, selectedTheme);
    assert.equal(h.messages[0].message.settings.courseFontSize, 18);
    assert.equal(h.messages[0].message.settings.autoScroll, false);
    assert.equal(Object.hasOwn(h.messages[0].message.settings, 'wcPassword'), false);
  });
}

test('empty storage still sends the existing default theme and no private values', () => {
  const h = harness(popupSource);
  h.context.applyToWebClass();
  h.flush(300);
  assert.equal(h.messages.length, 2);
  assert.deepEqual(JSON.parse(JSON.stringify(h.messages[0].message.settings)), { selectedTheme: 'default' });
});
