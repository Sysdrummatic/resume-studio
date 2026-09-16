import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(readFileSync("app/components/workspace-breadcrumbs.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
const module = { exports: {} };
new Function("require", "module", "exports", outputText)(require, module, module.exports);
const render = (props) => renderToStaticMarkup(createElement(module.exports.default, props));

test("existing Dashboard and Master Resume breadcrumbs retain destinations and current page", () => {
  const dashboard = render({ current: "Dashboard" });
  assert.match(dashboard, /href="\/"/);
  assert.doesNotMatch(dashboard, /href="\/dashboard"/);
  assert.match(dashboard, /aria-current="page">Dashboard/);
  const editor = render({ current: "Master Resume" });
  assert.match(editor, /href="\/dashboard"/);
  assert.match(editor, /aria-current="page">Master Resume/);
  assert.equal([...editor.matchAll(/aria-current="page"/g)].length, 1);
});

test("documentation breadcrumbs accept real ancestors without linking nonexistent category pages", () => {
  const html = render({ current: "Publishing your first CV", parents: [
    { label: "Home", href: "/" }, { label: "Docs", href: "/docs" }, { label: "Tutorials" },
  ] });
  assert.match(html, /href="\/docs"/);
  assert.match(html, /<span>Tutorials<\/span>/);
  assert.match(html, /aria-current="page">Publishing your first CV/);
  assert.doesNotMatch(html, /href="\/dashboard"|href="\/docs\/tutorials"/);
  assert.equal([...html.matchAll(/aria-current="page"/g)].length, 1);
});
