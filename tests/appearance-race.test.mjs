import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

// Full production source, synthetic Chrome/DOM and deterministic timers only.
const source = readFileSync(process.env.STYLEUP_POPUP_SOURCE ||
  new URL('../styleup/popup.js', import.meta.url), 'utf8');
const visualKeys = ['selectedTheme', 'baseTheme', 'colorPreset', 'mainColor', 'subColor',
  'accentColor', 'dayTagStyle', 'dayColors', 'autoScroll', 'enableAnimations', 'enableBlur', 'courseFontSize'];
const initial = { selectedTheme: 'default', baseTheme: 'light', colorPreset: 'blue',
  mainColor: '#123456', subColor: '#234567', accentColor: '#345678', dayTagStyle: 'colorful',
  dayColors: { mon: '#456789', sun: '#567890' }, autoScroll: true, enableAnimations: true,
  enableBlur: true, courseFontSize: 14 };
const privateValues = { wcUsername: 'SYNTHETIC_PRIVATE_USERNAME', wcPassword: 'SYNTHETIC_PRIVATE_PASSWORD',
  autoLogin: true, autoLoginFailCount: 4, futurePrivateKey: 'SYNTHETIC_PRIVATE_FUTURE' };
const clone = value => JSON.parse(JSON.stringify(value));
function harness(values = { ...initial, ...privateValues }) {
  const stored = clone(values), reads = [], writes = [], queries = [], messages = [], logs = [];
  const timers = new Map(), elements = new Map(), selectors = new Map(), errors = [];
  let now = 0, nextTimer = 0, currentError, errorWasRead = false, activeWrites = 0, maxActiveWrites = 0;
  const behavior = { getThrows: false, setThrows: false, queryThrows: false,
    sendThrows: new Set(), sendFails: new Set() };
  function element() {
    const classes = new Set(), listeners = {};
    return { dataset: {}, value: '', checked: false, style: {}, textContent: '',
      classList: { add: n => classes.add(n), remove: n => classes.delete(n), contains: n => classes.has(n) },
      addEventListener(name, listener) { listeners[name] = listener; },
      emit(name) { listeners[name].call(this); } };
  }
  const getElement = id => {
    if (!elements.has(id)) elements.set(id, element());
    return elements.get(id);
  };
  function callback(fn, error, value) {
    currentError = error ? { message: 'SYNTHETIC_PRIVATE_ERROR' } : undefined;
    errorWasRead = false;
    try { fn(value); } finally {
      if (error) errors.push(errorWasRead);
      currentError = undefined;
    }
  }
  const runtime = {};
  Object.defineProperty(runtime, 'lastError', { get() { errorWasRead = true; return currentError; } });
  const context = vm.createContext({
    document: { addEventListener() {}, body: element(), getElementById: getElement,
      querySelectorAll: s => selectors.get(s) || [], querySelector: () => null },
    console: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, (...args) => logs.push([level, ...args])])),
    setTimeout(fn, delay) { const id = ++nextTimer; timers.set(id, { fn, due: now + delay }); return id; },
    clearTimeout: id => timers.delete(id),
    chrome: { runtime, storage: { sync: {
      get(keys, fn) {
        if (behavior.getThrows) throw new Error('SYNTHETIC_PRIVATE_GET_THROW');
        const result = Object.fromEntries((keys === null ? Object.keys(stored) : keys)
          .filter(key => Object.hasOwn(stored, key)).map(key => [key, clone(stored[key])]));
        reads.push({ keys: clone(keys), result, fn, done: false });
      },
      set(value, fn) {
        if (behavior.setThrows) throw new Error('SYNTHETIC_PRIVATE_SET_THROW');
        ++activeWrites;
        maxActiveWrites = Math.max(activeWrites, maxActiveWrites);
        writes.push({ value: clone(value), fn, done: false });
      },
    } }, tabs: {
      query(query, fn) {
        if (behavior.queryThrows) throw new Error('SYNTHETIC_PRIVATE_QUERY_THROW');
        queries.push({ query: clone(query), fn, done: false });
      },
      sendMessage(id, message, fn) {
        if (behavior.sendThrows.has(id)) throw new Error('SYNTHETIC_PRIVATE_SEND_THROW');
        messages.push({ id, message: clone(message) });
        callback(fn, behavior.sendFails.has(id));
      },
    } },
  });
  vm.runInContext(source, context, { filename: 'popup.js' });
  return { context, stored, reads, writes, queries, messages, logs, errors, behavior,
    element, getElement, selectors,
    get maxActiveWrites() { return maxActiveWrites; },
    edit(settings) { context.saveSettings(clone(settings)); context.applyToWebClass(); },
    advance(ms) {
      const end = now + ms;
      while (true) {
        const next = [...timers].filter(([,t]) => t.due <= end).sort((a,b) => a[1].due - b[1].due)[0];
        if (!next) break;
        const [id, timer] = next;
        timers.delete(id); now = timer.due; timer.fn();
      }
      now = end;
    },
    read(index = reads.length - 1, { error = false, result } = {}) {
      const item = reads[index]; assert.ok(item && !item.done, `read ${index} pending`); item.done = true;
      callback(item.fn, error, error ? undefined : result || item.result);
    },
    write(index = writes.length - 1, { error = false } = {}) {
      const item = writes[index]; assert.ok(item && !item.done, `write ${index} pending`); item.done = true;
      --activeWrites;
      if (!error) Object.assign(stored, item.value);
      callback(item.fn, error);
    },
    query(index = queries.length - 1, { error = false, tabs = [{ id: 1 }, { id: 2 }] } = {}) {
      const item = queries[index]; assert.ok(item && !item.done, `query ${index} pending`); item.done = true;
      callback(item.fn, error, error ? undefined : tabs);
    },
  };
}
function applied(h) { return h.messages.at(-1).message.settings; }
function assertPrivate(h) {
  for (const read of h.reads) assert.deepEqual(read.keys, visualKeys);
  for (const { message } of h.messages) {
    assert.equal(message.action, 'applyFullSettings');
    assert.ok(Object.keys(message.settings).every(key => visualKeys.includes(key)));
    assert.equal(JSON.stringify(message).includes('SYNTHETIC_PRIVATE'), false);
  }
  assert.equal(JSON.stringify(h.logs).includes('SYNTHETIC_PRIVATE'), false);
  assert.ok(h.errors.every(Boolean), 'runtime.lastError must be consumed');
}

test('pending edits apply at 300 ms before the debounced save, including false and zero', () => {
  const h = harness();
  h.edit({ baseTheme: 'dark', mainColor: '#000000', autoScroll: false, courseFontSize: 0 });
  h.advance(299); assert.equal(h.reads.length, 0); assert.equal(h.writes.length, 0);
  h.advance(1); h.read(); h.query();
  assert.deepEqual(applied(h), { ...initial, baseTheme: 'dark', mainColor: '#000000',
    autoScroll: false, courseFontSize: 0, selectedTheme: 'theme-dark' });
  assert.equal(h.writes.length, 0);
  h.advance(500); assert.equal(h.writes.length, 1); h.write();
  assert.equal(h.stored.baseTheme, 'dark'); assert.equal(h.stored.selectedTheme, 'theme-dark');
  assertPrivate(h);
});

test('real base-theme, toggle and font-size handlers use the latest local values', () => {
  const h = harness(), dark = h.element(); dark.dataset.baseTheme = 'dark';
  h.selectors.set('.base-theme-option', [dark]);
  h.context.setupBaseThemeSelector(); h.context.setupToggleSwitches(); h.context.setupFontSizeSlider();
  dark.emit('click');
  h.getElement('enable-animations').checked = false; h.getElement('enable-animations').emit('change');
  h.getElement('enable-blur').checked = false; h.getElement('enable-blur').emit('change');
  h.getElement('course-font-size').value = '18'; h.getElement('course-font-size').emit('input');
  h.advance(300); h.read(); h.query();
  assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).selectedTheme, 'theme-dark');
  assert.equal(applied(h).enableAnimations, false); assert.equal(applied(h).enableBlur, false);
  assert.equal(applied(h).courseFontSize, 18); assertPrivate(h);
});

test('rapid edits batch different fields and keep only the latest repeated field', () => {
  const h = harness();
  h.edit({ baseTheme: 'dark' }); h.advance(100);
  h.edit({ mainColor: '#000000', dayColors: { mon: '#112233', sun: '#334455' } }); h.advance(100);
  h.edit({ baseTheme: 'light', colorPreset: 'purple' }); h.advance(299);
  assert.equal(h.reads.length, 0); assert.equal(h.writes.length, 0);
  h.advance(1); h.read(); h.query(); h.advance(500);
  assert.equal(h.reads.length, 1); assert.equal(h.queries.length, 1); assert.equal(h.writes.length, 1);
  assert.deepEqual(h.writes[0].value, { baseTheme: 'light', mainColor: '#000000',
    dayColors: { mon: '#112233', sun: '#334455' }, colorPreset: 'purple', selectedTheme: 'theme-purple' });
  assert.equal(applied(h).mainColor, '#000000'); assert.equal(applied(h).selectedTheme, 'theme-purple');
  assertPrivate(h);
});

test('a storage get arriving after the pending batch was sent still sees in-flight edits', () => {
  const h = harness(); h.edit({ baseTheme: 'dark', mainColor: '#000000' }); h.advance(500);
  assert.equal(h.writes.length, 1); assert.equal(h.stored.baseTheme, 'light');
  h.read(); h.query();
  assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).mainColor, '#000000');
  assert.equal(applied(h).selectedTheme, 'theme-dark'); assertPrivate(h);
});

test('a delayed get snapshot stays correct even after the local save completes', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(500); h.write();
  assert.equal(h.reads[0].result.baseTheme, 'light'); h.read(); h.query();
  assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).selectedTheme, 'theme-dark');
  assertPrivate(h);
});

test('later unrelated edits retain the latest fields while an older storage write is in flight', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(500);
  h.edit({ mainColor: '#000000' }); h.advance(300); h.read(1); h.query();
  assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).mainColor, '#000000');
  assert.equal(applied(h).selectedTheme, 'theme-dark');
  h.advance(500); assert.equal(h.writes.length, 1); h.write(0);
  assert.equal(h.writes.length, 2); h.write(1);
  assert.equal(h.stored.baseTheme, 'dark'); assert.equal(h.stored.mainColor, '#000000');
  assert.equal(h.maxActiveWrites, 1); assertPrivate(h);
});

test('writes serialize latest repeated edits even when the first set takes longer than two debounce periods', () => {
  const h = harness();
  h.edit({ mainColor: '#111111' }); h.advance(300); h.read(); h.query(); h.advance(500);
  h.edit({ mainColor: '#222222' }); h.advance(300); h.read(); h.query(); h.advance(500);
  h.edit({ mainColor: '#333333' }); h.advance(300); h.read(); h.query(); h.advance(500);
  assert.equal(h.writes.length, 1); assert.equal(applied(h).mainColor, '#333333');
  h.write(0); assert.equal(h.writes.length, 2); assert.equal(h.writes[1].value.mainColor, '#333333');
  h.write(1); assert.equal(h.stored.mainColor, '#333333'); assert.equal(h.maxActiveWrites, 1);
  h.advance(10000); assert.equal(h.writes.length, 2); assertPrivate(h);
});

test('completing an in-flight set does not bypass a newer edit debounce timer', () => {
  const h = harness(); h.edit({ mainColor: '#111111' }); h.advance(500);
  h.edit({ mainColor: '#222222' }); h.write(0); h.advance(499);
  assert.equal(h.writes.length, 1); h.advance(1); assert.equal(h.writes.length, 2);
  assert.equal(h.writes[1].value.mainColor, '#222222'); assertPrivate(h);
});

test('an old get callback is discarded as soon as a newer apply is requested', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(300);
  h.edit({ baseTheme: 'light', colorPreset: 'green' }); h.read(0);
  assert.equal(h.queries.length, 0);
  h.advance(300); h.read(1); h.query();
  assert.equal(applied(h).selectedTheme, 'theme-green'); assertPrivate(h);
});

test('get callbacks arriving in reverse order cannot persist or broadcast an older theme', () => {
  const h = harness(); h.context.applyToWebClass(); h.advance(300);
  h.stored.baseTheme = 'dark'; h.context.applyToWebClass(); h.advance(300);
  h.read(1); h.query(); h.read(0);
  assert.equal(h.queries.length, 1); assert.equal(h.messages.length, 2);
  assert.equal(applied(h).selectedTheme, 'theme-dark');
  h.advance(500); assert.equal(h.writes[0].value.selectedTheme, 'theme-dark'); assertPrivate(h);
});

test('an old tabs query is discarded before the next debounce timer expires', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(300); h.read();
  h.edit({ baseTheme: 'light', colorPreset: 'red' }); h.query(0);
  assert.equal(h.messages.length, 0); h.advance(300); h.read(); h.query();
  assert.equal(applied(h).selectedTheme, 'theme-red'); assertPrivate(h);
});

test('tabs queries arriving in reverse order cannot overwrite the latest broadcast', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(300); h.read();
  h.edit({ baseTheme: 'light', colorPreset: 'purple' }); h.advance(300); h.read();
  h.query(1); h.query(0);
  assert.equal(h.messages.length, 2); assert.equal(applied(h).selectedTheme, 'theme-purple'); assertPrivate(h);
});

for (const colorPreset of ['blue', 'green', 'red', 'purple', 'orange', 'teal', 'pink', 'indigo', 'custom']) {
  for (const baseTheme of ['light', 'dark']) {
    test(`pending ${baseTheme}/${colorPreset} preserves legacy selectedTheme compatibility`, () => {
      const h = harness(); h.edit({ baseTheme, colorPreset }); h.advance(300); h.read(); h.query();
      const expected = baseTheme === 'dark' ? 'theme-dark' :
        ['green', 'red', 'purple'].includes(colorPreset) ? `theme-${colorPreset}` : 'default';
      assert.equal(applied(h).selectedTheme, expected); h.advance(500);
      assert.equal(h.writes[0].value.selectedTheme, expected); assertPrivate(h);
    });
  }
}

test('empty storage keeps the legacy default without inventing undefined fields', () => {
  const h = harness({}); h.context.applyToWebClass(); h.advance(300); h.read(); h.query();
  assert.deepEqual(applied(h), { selectedTheme: 'default' }); assertPrivate(h);
});

test('local pending and in-flight unrelated values never enter appearance messages or logs', () => {
  const h = harness(); h.edit({ ...privateValues, baseTheme: 'dark' }); h.advance(500);
  h.read(0, { result: { ...initial, ...privateValues } }); h.query();
  assert.equal(applied(h).baseTheme, 'dark'); assertPrivate(h);
  h.write(); h.advance(500); h.write(); assertPrivate(h);
  assert.equal(h.stored.wcPassword, privateValues.wcPassword);
});

for (const failure of ['callback', 'throw']) {
  test(`storage set ${failure} leaves latest visual edits available, with no retry loop`, () => {
    const h = harness(); h.behavior.setThrows = failure === 'throw';
    h.edit({ baseTheme: 'dark' }); h.advance(500);
    if (failure === 'callback') h.write(0, { error: true });
    h.advance(10000); assert.equal(h.writes.length, failure === 'throw' ? 0 : 1);
    h.behavior.setThrows = false; h.read(); h.query();
    assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).selectedTheme, 'theme-dark');
    h.edit({ mainColor: '#000000' }); h.advance(300); h.read(); h.query(); h.advance(500); h.write();
    assert.equal(applied(h).mainColor, '#000000'); assert.equal(h.stored.mainColor, '#000000');
    // A failed older field is not silently claimed to be durable or automatically retried.
    assert.equal(h.stored.baseTheme, 'light'); assertPrivate(h);
  });
}

test('a failed in-flight write does not block a later debounced batch', () => {
  const h = harness(); h.edit({ mainColor: '#111111' }); h.advance(500);
  h.edit({ mainColor: '#222222', enableBlur: false }); h.advance(500);
  assert.equal(h.writes.length, 1); h.write(0, { error: true });
  assert.equal(h.writes.length, 2); h.write(1); assert.equal(h.stored.mainColor, '#222222');
  assert.equal(h.stored.enableBlur, false); assertPrivate(h);
});

for (const failure of ['callback', 'throw']) {
  test(`storage get ${failure} sends nothing and a later edit recovers`, () => {
    const h = harness(); h.behavior.getThrows = failure === 'throw';
    h.edit({ baseTheme: 'dark' }); h.advance(300);
    if (failure === 'callback') h.read(0, { error: true });
    assert.equal(h.queries.length, 0); assert.equal(h.messages.length, 0);
    h.advance(500); assert.equal(h.writes.length, 1); assert.equal('selectedTheme' in h.writes[0].value, false);
    h.behavior.getThrows = false; h.edit({ enableBlur: false }); h.advance(300); h.read(); h.query();
    assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).enableBlur, false); assertPrivate(h);
  });
  test(`tabs query ${failure} sends nothing and a later request recovers`, () => {
    const h = harness(); h.behavior.queryThrows = failure === 'throw';
    h.edit({ baseTheme: 'dark' }); h.advance(300); h.read();
    if (failure === 'callback') h.query(0, { error: true });
    assert.equal(h.messages.length, 0); h.behavior.queryThrows = false;
    h.context.applyToWebClass(); h.advance(300); h.read(); h.query();
    assert.equal(applied(h).baseTheme, 'dark'); assertPrivate(h);
  });
}

test('no matching tabs still persists selectedTheme and does not retry queries', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(300); h.read(); h.query(0, { tabs: [] });
  assert.equal(h.messages.length, 0); h.advance(10000); h.write();
  assert.equal(h.stored.selectedTheme, 'theme-dark'); assert.equal(h.queries.length, 1); assertPrivate(h);
});

test('a failed tab send does not stop other tabs and never logs its error payload', () => {
  const h = harness(); h.behavior.sendThrows.add(1); h.behavior.sendFails.add(2);
  h.edit({ baseTheme: 'dark' }); h.advance(300); h.read(); h.query(0, { tabs: [{id:1}, {id:2}, {id:3}] });
  assert.deepEqual(h.messages.map(m => m.id), [2, 3]); assert.equal(applied(h).baseTheme, 'dark'); assertPrivate(h);
});

test('an uncompleted storage write queues a bounded latest batch without polling or blocking preview', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(500);
  for (let i = 0; i < 20; ++i) {
    h.edit({ courseFontSize: i }); h.advance(300); h.read(); h.query(); h.advance(500);
  }
  h.advance(1000000);
  assert.equal(h.writes.length, 1); assert.equal(applied(h).courseFontSize, 19);
  assert.equal(h.reads.length, 21); assert.equal(h.queries.length, 20); assertPrivate(h);
});

test('latest request failure never revives an older delayed query', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(300); h.read();
  h.edit({ baseTheme: 'light' }); h.advance(300); h.read(1, { error: true }); h.query(0);
  assert.equal(h.messages.length, 0); assertPrivate(h);
});

test('unmodified fields use fresh storage while previously edited fields keep popup-local intent', () => {
  const h = harness(); h.edit({ baseTheme: 'dark' }); h.advance(300); h.read(); h.query();
  h.advance(500); h.write();
  // Simulated external changes document the popup-lifetime overlay policy, not cross-device ordering.
  Object.assign(h.stored, { baseTheme: 'light', mainColor: '#abcdef' });
  h.context.applyToWebClass(); h.advance(300); h.read(); h.query();
  assert.equal(applied(h).baseTheme, 'dark'); assert.equal(applied(h).mainColor, '#abcdef');
  assertPrivate(h);
});

test('unrelated values still in the pending save batch never enter preview', () => {
  const h = harness(); h.edit({ ...privateValues, mainColor: '#000000' }); h.advance(300);
  assert.equal(h.writes.length, 0); h.read(); h.query();
  assert.equal(applied(h).mainColor, '#000000'); assertPrivate(h);
});
