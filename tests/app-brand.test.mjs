import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(readFileSync("app/components/app-brand.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
const module = { exports: {} };
new Function("require", "module", "exports", outputText)(require, module, module.exports);
const AppBrand = module.exports.default;

test("the onboarding brand has no navigation while the default brand still links home", () => {
  assert.doesNotMatch(renderToStaticMarkup(createElement(AppBrand, { href: null })), /<a\b/);
  assert.match(renderToStaticMarkup(createElement(AppBrand)), /href="\/"/);
});

test("multiple brands have independent SVG gradients, including when one is hidden", () => {
  const html = renderToStaticMarkup(createElement(Fragment, null,
    createElement(AppBrand), createElement(AppBrand, { href: null }),
  ));
  const ids = [...html.matchAll(/<linearGradient id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 2);
  assert.equal(new Set(ids).size, 2, "A hidden header must not hide the onboarding logo gradient");
  for (const id of ids) assert.ok(html.includes(`url(#${id})`));
});
