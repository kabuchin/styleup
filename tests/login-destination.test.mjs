import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

// Execute the complete production file; never copy or extract its login helpers.
// The mock document remains loading so unrelated header/theme initialization is
// not simulated. Call the actual registered login functions after evaluation.
// No browser, server, network, extension install, or real credentials are used.
const sourcePath = process.env.STYLEUP_CONTENT_PATH || new URL('../styleup/content.js', import.meta.url);
const source = readFileSync(typeof sourcePath === 'string' ? resolve(sourcePath) : sourcePath, 'utf8');
const ORIGIN = 'https://ed24lb.osaka-sandai.ac.jp';
const LOGIN = `${ORIGIN}/webclass/login.php`;
const EXTERNAL = 'https://example.invalid/collect';
const credentials = { wcUsername: 'SYNTHETIC_USER', wcPassword: 'SYNTHETIC_PASSWORD', autoLogin: true };

function harness(options = {}) {
  const state = {
    page: options.page ?? LOGIN, base: options.base, action: options.action ?? 'login.php',
    override: options.override, reads: [], writes: [], inputs: [], submissions: [],
    callbacks: [], timers: [], frames: [], warnings: [], logs: [], events: [],
    clickCount: 0, submitCount: 0, present: options.present ?? true,
  };
  if (Object.hasOwn(options, 'action')) state.action = options.action;
  const documentListeners = [];
  const genericElement = () => ({
    children: [], style: {}, classList: { add() {}, remove() {}, contains() { return false; } },
    appendChild(child) { this.children.push(child); },
    insertBefore(child) { state.warnings.push(child); },
    addEventListener() {}, remove() {}, setAttribute() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
  });
  const window = { addEventListener() {} };
  Object.defineProperty(window, 'location', { get: () => new URL(state.page) });
  function resolvedAction(raw) {
    // HTML action/formaction URL reflection: missing/empty values use the
    // document URL; nonempty values resolve against the document base URL.
    if (raw === null || raw === undefined || raw === '') return state.page;
    try { return new URL(raw, state.base || state.page).href; } catch { return raw; }
  }
  const form = {
    ...genericElement(), isConnected: true,
    get action() { return resolvedAction(state.action); },
    submit() {
      state.submitCount++;
      options.onSubmit?.(api);
      if (options.submitThrows) throw new Error('Synthetic submit failure');
      state.submissions.push({ via: 'submit', destination: form.action });
    },
    querySelector(selector) {
      if (selector.includes('username')) return options.missingUsername ? null : user;
      if (selector.includes('passwd')) return options.missingPassword ? null : password;
      if (selector.includes('submit')) return options.noButton ? null : button;
      return null;
    },
    parentElement: genericElement(),
  };
  const button = {
    isConnected: true, form,
    hasAttribute(name) { return name === 'formaction' && state.override !== undefined && state.override !== null; },
    get formAction() {
      if (!this.hasAttribute('formaction') && options.absentOverrideThrows) throw new Error('Absent override must not be read');
      return resolvedAction(state.override);
    },
    click() {
      state.clickCount++;
      options.onClick?.(api);
      if (options.clickThrows) throw new Error('Synthetic click failure');
      const destination = button.hasAttribute('formaction') ? button.formAction : button.form.action;
      state.submissions.push({ via: 'click', destination });
    },
  };
  function field(name) {
    return { value: '', form, isConnected: true,
      dispatchEvent(event) { state.inputs.push([name, event.type]); options.onInput?.(name, api); },
    };
  }
  const user = field('username');
  const password = field('password');
  const document = {
    readyState: 'loading', head: genericElement(), body: genericElement(), documentElement: genericElement(),
    createElement: genericElement, getElementById() { return null; },
    querySelector(selector) { return state.present && selector.includes('loginform') ? form : null; },
    querySelectorAll() { return []; },
    addEventListener(type, callback, options) { documentListeners.push({ type, callback, options }); },
  };
  Object.defineProperty(document, 'baseURI', { get: () => state.base || state.page });
  const chrome = {
    runtime: { lastError: null, onMessage: { addListener() {} } },
    storage: { sync: {
      get(keys, callback) {
        state.reads.push(Array.from(keys));
        if (options.getThrows) throw new Error('Synthetic storage get failure');
        state.callbacks.push(callback);
      },
      set(data, callback) {
        state.writes.push(JSON.parse(JSON.stringify(data)));
        if (options.setThrows) throw new Error('Synthetic storage set failure');
        callback?.();
      },
    } },
  };
  const context = vm.createContext({
    window, document, chrome, URL, Event,
    console: Object.fromEntries(['log', 'warn', 'error'].map(level => [level, (...args) => state.logs.push([level, ...args])])),
    localStorage: { getItem() { return null; }, setItem() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    setTimeout(callback, delay) { const timer = { callback, delay }; state.timers.push(timer); return timer; },
    clearTimeout(timer) { state.timers = state.timers.filter(item => item !== timer); },
    requestAnimationFrame(callback) { state.frames.push(callback); },
  });
  const api = {
    state, form, button, user, password, context, chrome, documentListeners,
    start() { context.handleLoginPage(); },
    read(data = { ...credentials, ...options.data }) {
      const callbacks = state.callbacks.splice(0);
      chrome.runtime.lastError = options.storageError ? { message: 'Synthetic storage error' } : null;
      try { for (const callback of callbacks) callback(data); } finally { chrome.runtime.lastError = null; }
    },
    drain() {
      for (const callback of state.frames.splice(0)) callback();
      for (const timer of state.timers.splice(0)) timer.callback();
    },
    run() { api.start(); api.read(); api.drain(); return api; },
  };
  options.configure?.(api);
  vm.runInContext(source, context, { filename: 'content.js', timeout: 1000 });
  assert.equal(typeof context.handleLoginPage, 'function');
  assert.equal(typeof context.handleLoginForm, 'function');
  assert.equal(typeof context.executeLogin, 'function');
  return api;
}

function assertNotFilled(h) {
  assert.equal(h.user.value, '');
  assert.equal(h.password.value, '');
  assert.deepEqual(h.state.inputs, []);
}
function assertNotSubmitted(h) {
  assert.deepEqual(h.state.submissions, []);
  assert.equal(h.state.clickCount, 0);
  assert.equal(h.state.submitCount, 0);
}
function assertBlocked(h, readCount = 0) {
  assertNotFilled(h);
  assertNotSubmitted(h);
  assert.equal(h.state.reads.length, readCount);
  assert.deepEqual(h.state.writes, []);
}
function assertFilled(h) {
  assert.equal(h.user.value, credentials.wcUsername);
  assert.equal(h.password.value, credentials.wcPassword);
  assert.deepEqual(h.state.inputs, [['username', 'input'], ['password', 'input']]);
}

const accepted = [
  ['secure same-origin control', {}, LOGIN],
  ['page query and hash', { page: `${LOGIN}?redirect=1#form` }, LOGIN],
  ['absolute action', { action: `${ORIGIN}/webclass/authenticate.php` }, `${ORIGIN}/webclass/authenticate.php`],
  ['relative action', { action: './authenticate.php' }, `${ORIGIN}/webclass/authenticate.php`],
  ['root-relative action', { action: '/authenticate' }, `${ORIGIN}/authenticate`],
  ['query-only action', { action: '?submit=1' }, `${LOGIN}?submit=1`],
  ['fragment-only action', { action: '#submit' }, `${LOGIN}#submit`],
  ['missing action uses document', { action: null }, LOGIN],
  ['empty action uses document', { action: '' }, LOGIN],
  ['empty action ignores external base', { action: '', base: EXTERNAL }, LOGIN],
  ['same-origin base', { action: 'auth', base: `${ORIGIN}/webclass/forms/` }, `${ORIGIN}/webclass/forms/auth`],
  ['absolute action ignores external base', { action: LOGIN, base: EXTERNAL }, LOGIN],
  ['HTTPS protocol-relative action', { action: '//ed24lb.osaka-sandai.ac.jp/auth' }, `${ORIGIN}/auth`],
  ['default HTTPS port', { page: `${ORIGIN}:443/webclass/login.php`, action: `${ORIGIN}:443/auth` }, `${ORIGIN}/auth`],
  ['normalized host case', { page: 'https://ED24LB.OSAKA-SANDAI.AC.JP/webclass/login.php' }, LOGIN],
  ['absent submit override ignored', { absentOverrideThrows: true }, LOGIN],
  ['relative submit override', { override: 'submit.php' }, `${ORIGIN}/webclass/submit.php`],
  ['query submit override', { override: '?submit=2' }, `${LOGIN}?submit=2`],
  ['fragment submit override', { override: '#submit' }, `${LOGIN}#submit`],
  ['empty submit override uses page', { override: '', action: `${ORIGIN}/auth`, base: EXTERNAL }, LOGIN],
  ['explicit absolute submit override', { override: `${ORIGIN}/auth` }, `${ORIGIN}/auth`],
  ['no button submits form', { noButton: true }, LOGIN],
];
for (const [name, options, destination] of accepted) {
  test(`allows ${name}`, () => {
    const h = harness(options).run();
    assertFilled(h);
    assert.equal(h.state.reads.length, 1);
    assert.deepEqual(h.state.reads[0], ['wcUsername', 'wcPassword', 'autoLogin', 'autoLoginFailCount']);
    assert.deepEqual(h.state.writes, [{ autoLoginFailCount: 1 }]);
    assert.deepEqual(h.state.submissions, [{ via: options.noButton ? 'submit' : 'click', destination }]);
  });
}

const invalidUrls = [
  ['HTTP', 'http://ed24lb.osaka-sandai.ac.jp/webclass/login.php'],
  ['external host', EXTERNAL],
  ['host suffix lookalike', 'https://ed24lb.osaka-sandai.ac.jp.example.invalid/webclass/login.php'],
  ['subdomain', 'https://login.ed24lb.osaka-sandai.ac.jp/webclass/login.php'],
  ['trailing host dot', 'https://ed24lb.osaka-sandai.ac.jp./webclass/login.php'],
  ['nondefault port', `${ORIGIN}:444/webclass/login.php`],
  ['username in URL', 'https://user@ed24lb.osaka-sandai.ac.jp/webclass/login.php'],
  ['password in URL', 'https://user:pass@ed24lb.osaka-sandai.ac.jp/webclass/login.php'],
  ['hostname in userinfo', 'https://ed24lb.osaka-sandai.ac.jp@example.invalid/webclass/login.php'],
  ['blob inherited origin', `blob:${ORIGIN}/webclass/login.php`],
  ['JavaScript scheme', 'javascript:void(0)'],
  ['data scheme', 'data:text/plain,/webclass/login.php'],
];
for (const [name, value] of invalidUrls) {
  for (const key of ['page', 'action', 'override']) {
    test(`blocks ${name} ${key} before credential read`, () => assertBlocked(harness({ [key]: value }).run()));
  }
}
for (const page of [
  `${ORIGIN}/webclass/?next=/webclass/login.php`, `${ORIGIN}/webclass/#/webclass/login.php`,
  `${LOGIN}/extra`, `${ORIGIN}/prefix/webclass/login.php`, `${ORIGIN}/webclass/LOGIN.php`,
  `${ORIGIN}/webclass/%6cogin.php`,
]) {
  test(`blocks non-exact login path ${page}`, () => assertBlocked(harness({ page }).run()));
}
for (const [name, options] of [
  ['external base resolves relative action externally', { base: EXTERNAL }],
  ['external base resolves submit override externally', { action: LOGIN, base: EXTERNAL, override: 'submit' }],
  ['safe override cannot conceal unsafe fallback form', { action: EXTERNAL, override: LOGIN }],
  ['malformed form action', { action: 'https://[' }],
  ['malformed button override', { override: 'https://[' }],
]) {
  test(`blocks ${name}`, () => assertBlocked(harness(options).run()));
}

const alteredTargets = [
  ['page origin', h => { h.state.page = EXTERNAL; }],
  ['page path', h => { h.state.page = `${ORIGIN}/other`; }],
  ['form action', h => { h.state.action = EXTERNAL; }],
  ['submit override', h => { h.state.override = EXTERNAL; }],
  ['base URL', h => { h.state.base = EXTERNAL; }],
  ['button form owner', h => { h.button.form = { action: EXTERNAL }; }],
  ['detached form', h => { h.form.isConnected = false; }],
  ['detached button', h => { h.button.isConnected = false; }],
];
for (const [name, change] of alteredTargets) {
  test(`blocks initial ${name}`, () => assertBlocked(harness({ configure: change }).run()));
  test(`blocks ${name} changed while storage is pending`, () => {
    const h = harness(); h.start(); change(h); h.read(); h.drain(); assertBlocked(h, 1);
  });
  test(`blocks ${name} changed before delayed submit`, () => {
    const h = harness(); h.start(); h.read(); assertFilled(h); change(h); h.drain();
    assertNotSubmitted(h);
    // The existing fail-count increment occurs when scheduling, not submitting.
    assert.deepEqual(h.state.writes, [{ autoLoginFailCount: 1 }]);
  });
  test(`blocks fallback after click changes ${name} and throws`, () => {
    const h = harness({ onClick: change, clickThrows: true }).run();
    assertFilled(h); assert.equal(h.state.clickCount, 1); assert.equal(h.state.submitCount, 0);
    assert.deepEqual(h.state.submissions, []);
  });
}
for (const name of ['user', 'password']) {
  for (const [label, change] of [
    ['form owner', h => { h[name].form = { action: EXTERNAL }; }],
    ['detached field', h => { h[name].isConnected = false; }],
  ]) {
    test(`blocks initial ${name} ${label}`, () => assertBlocked(harness({ configure: change }).run()));
    test(`blocks ${name} ${label} changed during storage read`, () => {
      const h = harness(); h.start(); change(h); h.read(); h.drain(); assertBlocked(h, 1);
    });
  }
}

test('rechecks after username input event before filling password', () => {
  const h = harness({ onInput(name, h) { if (name === 'username') h.state.action = EXTERNAL; } }).run();
  assert.equal(h.user.value, credentials.wcUsername); assert.equal(h.password.value, '');
  assert.deepEqual(h.state.inputs, [['username', 'input']]); assertNotSubmitted(h);
  assert.deepEqual(h.state.writes, []);
});
test('rechecks after password input event before scheduling', () => {
  const h = harness({ onInput(name, h) { if (name === 'password') h.state.override = EXTERNAL; } }).run();
  assertFilled(h); assertNotSubmitted(h); assert.deepEqual(h.state.writes, []);
});
test('direct handleLoginForm also validates page and target', () => {
  const h = harness({ page: `${ORIGIN}/other` }); h.context.handleLoginForm(h.form); h.read(); h.drain(); assertBlocked(h);
});
test('direct executeLogin also validates target', () => {
  const h = harness({ action: EXTERNAL }); h.context.executeLogin(h.form, h.button); assertBlocked(h);
});
test('late DOMContentLoaded form rechecks page before reading', () => {
  const h = harness({ present: false });
  const initialCount = h.documentListeners.length; h.start();
  const retry = h.documentListeners.slice(initialCount).find(item => item.type === 'DOMContentLoaded');
  assert.ok(retry); h.state.present = true; h.state.page = `${ORIGIN}/other`;
  retry.callback(); h.read(); h.drain(); assertBlocked(h);
});
test('late safe DOMContentLoaded form is filled and submitted', () => {
  const h = harness({ present: false });
  const initialCount = h.documentListeners.length; h.start();
  const retry = h.documentListeners.slice(initialCount).find(item => item.type === 'DOMContentLoaded');
  assert.ok(retry); h.state.present = true; retry.callback(); h.read(); h.drain();
  assertFilled(h); assert.equal(h.state.submissions.length, 1);
});
for (const options of [{ missingUsername: true }, { missingPassword: true }, { present: false }]) {
  test(`missing form/field fails closed ${JSON.stringify(options)}`, () => assertBlocked(harness(options).run()));
}
test('disabled auto-login still autofills safe form without submit or failure increment', () => {
  const h = harness({ data: { autoLogin: false } }).run(); assertFilled(h); assertNotSubmitted(h);
  assert.deepEqual(h.state.writes, []);
});
test('disabled auto-login does not bypass unsafe destination guard', () => {
  assertBlocked(harness({ action: EXTERNAL, data: { autoLogin: false } }).run());
});
for (const data of [{ wcUsername: '' }, { wcPassword: '' }, { wcUsername: '', wcPassword: '' }]) {
  test(`missing credentials do not fill or submit ${Object.keys(data)}`, () => assertBlocked(harness({ data }).run(), 1));
}
for (const count of [0, 1, 2]) {
  test(`preserves existing failure count increment from ${count}`, () => {
    const h = harness({ data: { autoLoginFailCount: count } }).run(); assertFilled(h);
    assert.deepEqual(h.state.writes, [{ autoLoginFailCount: count + 1 }]);
    assert.equal(h.state.submissions.length, 1);
  });
}
for (const count of [3, 4]) {
  test(`preserves stop and warning at failure count ${count}`, () => {
    const h = harness({ data: { autoLoginFailCount: count } }).run(); assertBlocked(h, 1);
    assert.equal(h.state.warnings.length, 1);
  });
}
test('preserves explicit failure counter reset', () => {
  const h = harness(); h.context.resetLoginFailCount();
  assert.deepEqual(h.state.writes, [{ autoLoginFailCount: 0 }]); assertNotFilled(h); assertNotSubmitted(h);
});
test('safe click failure retains safe form.submit fallback', () => {
  const h = harness({ clickThrows: true, override: `${ORIGIN}/other-auth` }).run();
  assertFilled(h); assert.equal(h.state.clickCount, 1); assert.equal(h.state.submitCount, 1);
  assert.deepEqual(h.state.submissions, [{ via: 'submit', destination: LOGIN }]);
});
test('failed click and failed form.submit are contained', () => {
  const h = harness({ clickThrows: true, submitThrows: true }).run();
  assertFilled(h); assert.equal(h.state.clickCount, 1); assert.equal(h.state.submitCount, 1);
  assert.deepEqual(h.state.submissions, []);
});
test('runtime storage error fails closed even when callback has data', () => assertBlocked(harness({ storageError: true }).run(), 1));
test('missing storage callback data fails closed', () => {
  const h = harness(); h.start(); h.read(null); h.drain(); assertBlocked(h, 1);
});
test('synchronous storage get failure cannot fill or submit', () => {
  const h = harness({ getThrows: true }); assert.throws(() => h.start(), /Synthetic storage get failure/);
  h.drain(); assertBlocked(h, 1);
});
test('synchronous counter write failure cannot schedule a submit', () => {
  const h = harness({ setThrows: true }); h.start();
  assert.throws(() => h.read(), /Synthetic storage set failure/); h.drain();
  assertFilled(h); assertNotSubmitted(h);
});
test('login code does not log synthetic credentials', () => {
  const h = harness().run();
  const log = JSON.stringify(h.state.logs);
  assert.ok(!log.includes(credentials.wcUsername)); assert.ok(!log.includes(credentials.wcPassword));
});
