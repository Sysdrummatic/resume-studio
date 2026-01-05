const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

const mainScript = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'main.js'), 'utf8');

const DISABLED_MESSAGE = 'Editor login disabled. Configure the ADMIN_PASSWORD environment variable.';
const DEFAULT_ERROR_MESSAGE = 'Incorrect password. Try again.';

function createDom(markup = '') {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>${markup}</body></html>`, {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });
  const { window } = dom;

  window.jsyaml = { load: () => ({}) };
  window.fetch = async () => ({ ok: true, text: async () => '' });

  const originalAddEventListener = window.document.addEventListener.bind(window.document);
  window.document.addEventListener = function addEventListener(type, listener, options) {
    if (type === 'DOMContentLoaded') {
      return undefined;
    }
    return originalAddEventListener(type, listener, options);
  };

  const previousGlobals = {
    window: global.window,
    document: global.document,
    navigator: global.navigator,
    localStorage: global.localStorage,
    location: global.location,
    FormData: global.FormData,
    CustomEvent: global.CustomEvent,
    Event: global.Event,
    fetch: global.fetch,
  };

  global.window = window;
  global.document = window.document;
  global.navigator = window.navigator;
  global.localStorage = window.localStorage;
  global.location = window.location;
  global.FormData = window.FormData;
  global.CustomEvent = window.CustomEvent;
  global.Event = window.Event;
  global.fetch = window.fetch;

  window.eval(mainScript);

  function cleanup() {
    Object.entries(previousGlobals).forEach(([key, value]) => {
      if (value === undefined) {
        delete global[key];
      } else {
        global[key] = value;
      }
    });
    dom.window.close();
  }

  return { dom, window, document: window.document, cleanup };
}

function buildLoginMarkup() {
  return `
    <section id="admin-access">
      <form id="admin-login-form">
        <label for="admin-password">Password</label>
        <input id="admin-password" name="password" type="password" />
        <button type="submit">Unlock editor</button>
        <p id="admin-login-error" hidden>${DEFAULT_ERROR_MESSAGE}</p>
      </form>
    </section>
    <section id="admin-config" hidden>
      <div id="admin-panel" hidden></div>
    </section>
  `;
}

test('refreshAdminLoginState disables controls when no password is configured', (t) => {
  const { window, document, cleanup } = createDom(buildLoginMarkup());
  t.after(cleanup);
  const hooks = window.__ADMIN_TEST_HOOKS;
  const passwordInput = document.getElementById('admin-password');
  const submitButton = document.querySelector('#admin-login-form button[type="submit"]');
  const errorElement = document.getElementById('admin-login-error');

  hooks.setAdminLoginFormState({
    passwordInput,
    submitButton,
    errorElement,
    defaultErrorMessage: DEFAULT_ERROR_MESSAGE,
    disabledMessage: DISABLED_MESSAGE,
  });

  hooks.setAdminPassword(null);
  hooks.refreshAdminLoginState();

  assert.equal(passwordInput.disabled, true);
  assert.equal(submitButton.disabled, true);
  assert.equal(errorElement.hidden, false);
  assert.equal(errorElement.textContent, DISABLED_MESSAGE);
});

test('refreshAdminLoginState enables controls and focuses the input when password exists', (t) => {
  const { window, document, cleanup } = createDom(buildLoginMarkup());
  t.after(cleanup);
  const hooks = window.__ADMIN_TEST_HOOKS;
  const passwordInput = document.getElementById('admin-password');
  const submitButton = document.querySelector('#admin-login-form button[type="submit"]');
  const errorElement = document.getElementById('admin-login-error');

  hooks.setAdminLoginFormState({
    passwordInput,
    submitButton,
    errorElement,
    defaultErrorMessage: DEFAULT_ERROR_MESSAGE,
    disabledMessage: DISABLED_MESSAGE,
  });

  hooks.setAdminPassword('secret');
  hooks.refreshAdminLoginState();

  assert.equal(passwordInput.disabled, false);
  assert.equal(submitButton.disabled, false);
  assert.equal(errorElement.hidden, true);
  assert.equal(document.activeElement, passwordInput);
});

test('failed login attempts show the default error and refocus the password field', (t) => {
  const markup = `
    ${buildLoginMarkup()}
    <button id="reset-visibility-button" type="button"></button>
    <button id="preset-save-button" type="button"></button>
    <button id="preset-update-button" type="button"></button>
    <button id="preset-delete-button" type="button"></button>
    <button id="section-detail-select-all" type="button"></button>
    <button id="section-detail-clear" type="button"></button>
    <form id="section-select-form"></form>
    <div id="section-detail-panel" hidden></div>
    <h4 id="section-detail-title"></h4>
    <form id="section-detail-form"></form>
    <select id="preset-select"></select>
  `;
  const { window, document, cleanup } = createDom(markup);
  t.after(cleanup);
  const hooks = window.__ADMIN_TEST_HOOKS;
  hooks.setAdminPassword('secret');
  hooks.initAdminPanel();

  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password');
  const errorElement = document.getElementById('admin-login-error');

  passwordInput.value = 'wrong';
  const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
  loginForm.dispatchEvent(submitEvent);

  assert.equal(errorElement.hidden, false);
  assert.equal(errorElement.textContent, DEFAULT_ERROR_MESSAGE);
  assert.equal(document.activeElement, passwordInput);
});

test('typing after an error hides the feedback message', (t) => {
  const markup = `
    ${buildLoginMarkup()}
    <button id="reset-visibility-button" type="button"></button>
    <button id="preset-save-button" type="button"></button>
    <button id="preset-update-button" type="button"></button>
    <button id="preset-delete-button" type="button"></button>
    <button id="section-detail-select-all" type="button"></button>
    <button id="section-detail-clear" type="button"></button>
    <form id="section-select-form"></form>
    <div id="section-detail-panel" hidden></div>
    <h4 id="section-detail-title"></h4>
    <form id="section-detail-form"></form>
    <select id="preset-select"></select>
  `;
  const { window, document, cleanup } = createDom(markup);
  t.after(cleanup);
  const hooks = window.__ADMIN_TEST_HOOKS;
  hooks.setAdminPassword('secret');
  hooks.initAdminPanel();

  const loginForm = document.getElementById('admin-login-form');
  const passwordInput = document.getElementById('admin-password');
  const errorElement = document.getElementById('admin-login-error');

  passwordInput.value = 'wrong';
  loginForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.equal(errorElement.hidden, false);

  passwordInput.value = 'new-value';
  passwordInput.dispatchEvent(new window.Event('input', { bubbles: true }));

  assert.equal(errorElement.hidden, true);
  assert.equal(errorElement.textContent, DEFAULT_ERROR_MESSAGE);
});

test('focusFirstAdminControl prefers section radios', (t) => {
  const markup = `
    <form id="section-select-form">
      <label>
        <input type="radio" name="admin-section" value="experience" />
        Experience
      </label>
    </form>
    <select id="preset-select"></select>
    <div id="admin-panel"></div>
  `;
  const { window, document, cleanup } = createDom(markup);
  t.after(cleanup);
  const hooks = window.__ADMIN_TEST_HOOKS;

  hooks.focusFirstAdminControl();

  const expected = document.querySelector('input[name="admin-section"]');
  assert.equal(document.activeElement, expected);
});

test('focusFirstAdminControl falls back to preset select when no radios exist', (t) => {
  const markup = `
    <form id="section-select-form"></form>
    <select id="preset-select"></select>
    <div id="admin-panel"></div>
  `;
  const { window, document, cleanup } = createDom(markup);
  t.after(cleanup);
  const hooks = window.__ADMIN_TEST_HOOKS;

  hooks.focusFirstAdminControl();

  const select = document.getElementById('preset-select');
  assert.equal(document.activeElement, select);
});