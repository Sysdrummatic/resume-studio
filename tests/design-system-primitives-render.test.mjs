import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const DIR = "app/components/design-system/primitives";
const cache = new Map();

function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const file = [".tsx", ".ts"].map((ext) => path.join(DIR, `${name}${ext}`)).find((candidate) => {
    try {
      readFileSync(candidate);
      return true;
    } catch {
      return false;
    }
  });
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  cache.set(name, module);
  const localRequire = (specifier) => (specifier.startsWith("./") ? load(specifier.slice(2)) : require(specifier));
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

const read = (file) => readFileSync(path.join(DIR, file), "utf8");
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const attr = (html, name) => html.match(new RegExp(`${name}="([^"]*)"`))?.[1];

test("index exports every primitive as a runtime value", () => {
  const index = load("index");
  for (const name of [
    "Button", "IconButton", "SegmentedControl", "Field", "TextInput", "Select", "Textarea", "Checkbox",
    "SearchField", "StatePill", "Panel", "Modal", "Menu", "MenuItem", "Toast", "EmptyState", "Paper",
  ]) {
    assert.equal(typeof index[name], "function", `${name} must be exported`);
  }
});

test("TextInput links its label, hint and error to the control", () => {
  const { TextInput } = load("TextInput");
  const html = render(TextInput, { label: "Email", id: "email", hint: "Work address", error: "Enter a full address" });
  assert.match(html, /<label[^>]*for="email"/);
  assert.equal(attr(html, "id"), "email");
  assert.equal(attr(html, "aria-describedby"), "email-hint email-error");
  assert.equal(attr(html, "aria-invalid"), "true");
  assert.match(html, /id="email-error"[^>]*>Enter a full address</);
});

test("a caller's own aria-describedby is merged, never replaces the error link", () => {
  const { TextInput, Select, Textarea } = load("TextInput");
  for (const component of [TextInput, Select, Textarea]) {
    const html = render(component, { label: "Field", id: "f", error: "Required", "aria-describedby": "extra", "aria-invalid": false });
    assert.equal(attr(html, "aria-describedby"), "f-error extra");
    assert.equal(attr(html, "aria-invalid"), "true", "an error always marks the control invalid");
  }
});

test("SegmentedControl marks exactly the selected option as pressed", () => {
  const { SegmentedControl } = load("SegmentedControl");
  const html = render(SegmentedControl, {
    label: "Language", value: "pl", onChange() {},
    options: [{ value: "en", label: "EN" }, { value: "pl", label: "PL" }],
  });
  assert.match(html, /role="group" aria-label="Language"/);
  assert.equal([...html.matchAll(/aria-pressed="true"/g)].length, 1);
  assert.match(html, /aria-pressed="true"[^>]*>PL</);
});

test("a busy Button stays focusable and announces that it is busy", () => {
  const { Button } = load("Button");
  const html = render(Button, { busy: true, variant: "primary", children: "Saving" });
  assert.doesNotMatch(html, /disabled=""/, "disabling a busy button drops keyboard focus");
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /type="button"/);
  assert.match(html, /class="ocv-btn ocv-btn--primary"/);
});

test("icon-only controls carry an accessible name", () => {
  const { IconButton } = load("IconButton");
  const { SearchField } = load("SearchField");
  assert.match(render(IconButton, { label: "Close", children: "x" }), /aria-label="Close"/);
  assert.match(render(SearchField, { label: "Search entries" }), /type="search"[^>]*aria-label="Search entries"/);
});

test("the visible Toast is not itself a live region (persistent regions announce it)", () => {
  const { Toast } = load("Toast");
  assert.doesNotMatch(render(Toast, { children: "Saved" }), /role=|aria-live/);
  assert.match(render(Toast, { tone: "danger", children: "Failed" }), /data-tone="danger"/);
  assert.match(read("Toast.tsx"), /const role = tone === "danger" \? "alert" : "status";/);
});

test("App Router boundaries: interactive primitives are client modules, buttonClassName is not", () => {
  for (const file of ["Button.tsx", "TextInput.tsx", "Field.tsx", "Modal.tsx", "Toast.tsx"]) {
    assert.match(read(file), /^"use client";/, `${file} must start with "use client"`);
  }
  assert.doesNotMatch(read("buttonClassName.ts"), /use client/, "a server component must be able to call buttonClassName");
  assert.match(read("index.ts"), /export \{ buttonClassName \} from "\.\/buttonClassName";/);
});

test("Field keeps its error region mounted and links it only while there is an error", () => {
  const { TextInput } = load("TextInput");
  const valid = render(TextInput, { label: "Email", id: "e" });
  assert.match(valid, /<span id="e-error" class="ocv-field__error" aria-live="polite"><\/span>/);
  assert.doesNotMatch(valid, /aria-describedby|aria-invalid/);
});

test("a busy Button wins over the caller's ARIA; an idle one keeps it", () => {
  const { Button } = load("Button");
  const busy = render(Button, { busy: true, "aria-disabled": false, "aria-busy": false, children: "Save" });
  assert.match(busy, /aria-disabled="true"/);
  assert.match(busy, /aria-busy="true"/);
  const idle = render(Button, { "aria-disabled": false, disabled: true, children: "Save" });
  assert.match(idle, /aria-disabled="false"/);
  assert.match(idle, /disabled=""/);
});

test("MenuItem renders a link for href and a button otherwise", () => {
  const { MenuItem } = load("Menu");
  assert.match(render(MenuItem, { href: "/user", children: "Hub" }), /^<a class="ocv-menu__item" href="\/user">Hub<\/a>$/);
  assert.match(render(MenuItem, { tone: "danger", children: "Sign out" }), /^<button type="button" class="ocv-menu__item ocv-menu__item--danger">/);
});

test("StatePill and Panel expose the state the CSS colours by", () => {
  const { StatePill } = load("StatePill");
  const { Panel } = load("Panel");
  assert.match(render(StatePill, { state: "changes", children: "Unsaved" }), /data-state="changes"/);
  assert.match(render(Panel, { traced: "private", children: "x" }), /class="ocv-panel ocv-traced" data-trace="private"/);
  assert.doesNotMatch(render(Panel, { children: "x" }), /ocv-traced|data-trace/);
});

test("Modal renders a labelled native dialog with a named close button", () => {
  const { Modal } = load("Modal");
  const html = render(Modal, { open: false, onClose() {}, title: "Publish?", description: "Visible at its link.", closeLabel: "Close", children: "Body" });
  const labelledBy = attr(html, "aria-labelledby");
  assert.match(html, /^<dialog class="ocv-modal"/);
  assert.match(html, new RegExp(`<h2 id="${labelledBy}"[^>]*tabindex="-1"`));
  assert.match(html, /aria-describedby="[^"]+"/);
  assert.match(html, /aria-label="Close"/);
});
