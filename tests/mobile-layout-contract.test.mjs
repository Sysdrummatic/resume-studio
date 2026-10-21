import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

// SEO plan T16. The browser audit is `npm run qa:mobile -- <url>`; this keeps its fixes from regressing.
const SHELL_CSS = ["app/globals.css", "app/docs/docs.css", "app/landing.module.css"];

test("the smallest type token is 12px and the public shell never goes below it", () => {
  assert.match(read("app/globals.css"), /--font-size-xs: 0\.75rem;/);
  for (const file of SHELL_CSS) {
    const sizes = [...read(file).matchAll(/font-size:\s*([\d.]+)(px|rem)\s*;/g)].map(([, value, unit]) =>
      unit === "rem" ? Number(value) * 16 : Number(value),
    );
    assert.deepEqual(sizes.filter((size) => size < 12), [], `${file} has text below 12px`);
  }
});

test("shell controls get a 44px target on narrow or touch viewports", () => {
  const css = read("app/globals.css");
  assert.match(css, /--tap-target: 44px;/);
  const block = css.slice(css.indexOf("@media (max-width: 768px), (pointer: coarse)"));
  for (const selector of [
    ".app-nav-menu__trigger",
    ".app-theme-switch",
    ".app-language-menu__option",
    ".workspace-breadcrumbs a",
    ".auth-card__link",
    ".lp-footer__links a",
  ]) {
    assert.ok(block.includes(selector), `${selector} missing from the touch-target block`);
  }
});

test("docs and CV chrome have their own touch-target blocks", () => {
  assert.match(read("app/docs/docs.css"), /\(pointer: coarse\) \{[^}]*\.docs-button/);
  assert.match(read("app/resume/resume.css"), /\(pointer: coarse\) \{[^}]*\.hero__export-button/);
});
