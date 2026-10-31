import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(resolve(root, "app/globals.css"), "utf8");

const DARK_BLOCK_START = ":root {";
const LIGHT_BLOCK_START = ':root[data-app-theme="light"] {';
const TOKEN = "--portal-badge-tint-bg:";

function blockAfter(start) {
  const index = css.indexOf(start);
  assert.notEqual(index, -1, `missing block ${start}`);
  const end = css.indexOf("\n}", index);
  return css.slice(index, end);
}

test("portal badge tint tokens are defined in both dark and light themes", () => {
  assert.equal(blockAfter(DARK_BLOCK_START).includes(TOKEN), true);
  assert.equal(blockAfter(LIGHT_BLOCK_START).includes(TOKEN), true);
});

test("badge rule falls back to portal tokens when CV-domain tokens are not loaded", () => {
  const rule = css.slice(css.indexOf(".resume-badge,\n.public-view-badge {"));
  const body = rule.slice(0, rule.indexOf("}"));
  assert.match(body, /background: var\(--accent-light, var\(--portal-badge-tint-bg\)\);/);
  assert.match(body, /color: var\(--accent-dark, var\(--portal-badge-tint-text\)\);/);
});
