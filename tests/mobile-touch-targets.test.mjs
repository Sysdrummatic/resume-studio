import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(root, "app/globals.css"), "utf8");

function ruleBody(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `missing rule ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

test("header theme switch and navigation trigger meet the 44px touch target", () => {
  assert.match(ruleBody(".app-theme-switch"), /height: 2\.75rem;/);
  const trigger = ruleBody(".app-nav-menu__trigger");
  assert.match(trigger, /width: 2\.75rem;/);
  assert.match(trigger, /height: 2\.75rem;/);
});

test("language menu options meet the 44px touch target", () => {
  assert.match(ruleBody(".app-language-menu__option"), /min-height: 2\.75rem;/);
});

test("badge and language labels keep text at or above 12px", () => {
  assert.match(ruleBody(".app-language-menu__label"), /font-size: 0\.75rem;/);
  assert.match(css, /font-size: max\(0\.75rem, calc\(var\(--chip-font-size\) - 2px\)\);/);
});
