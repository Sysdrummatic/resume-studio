import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(root, "app/globals.css"), "utf8");
const primitives = readFileSync(resolve(root, "app/components/design-system/primitives.css"), "utf8");
const shell = readFileSync(resolve(root, "app/components/app-shell.css"), "utf8");

function coarseBlock(source) {
  const start = source.indexOf("@media (pointer: coarse) {");
  assert.notEqual(start, -1, "missing touch block");
  return source.slice(start, source.indexOf("\n}\n", start));
}

test("header icon buttons (theme, navigation menu) reach 44px on touch", () => {
  assert.match(coarseBlock(primitives), /\.ocv-icon-btn \{\s*width: var\(--ocv-hit\);\s*height: var\(--ocv-hit\);/);
});

test("language options, the account avatar and menu entries reach 44px on touch", () => {
  assert.match(coarseBlock(primitives), /\.ocv-seg__option \{\s*min-height: var\(--ocv-hit\);/);
  assert.match(coarseBlock(shell), /\.ocv-avatar \{\s*width: var\(--ocv-hit\);\s*height: var\(--ocv-hit\);/);
  assert.match(primitives, /\.ocv-menu__item \{[^}]*min-height: var\(--ocv-hit\);/);
  assert.match(shell, /\.ocv-topbar__link \{[^}]*min-height: var\(--ocv-hit\);/);
  assert.match(shell, /\.ocv-footer__links a \{[^}]*min-height: var\(--ocv-hit\);/);
});

test("language labels and badges keep text at or above 12px", () => {
  assert.match(shell, /\.ocv-topbar__language \.ocv-seg__option \{[^}]*font: 500 0\.75rem/);
  assert.match(css, /font-size: max\(0\.75rem, calc\(var\(--chip-font-size\) - 2px\)\);/);
});
