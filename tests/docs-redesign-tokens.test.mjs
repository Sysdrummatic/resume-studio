import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const styles = read("app/docs/docs.css");
const rules = styles.replace(/\/\*[\s\S]*?\*\//g, "");

test("docs site (#295) consumes LiveCV design-system tokens only", () => {
  assert.equal(styles.includes("var(--ocv-"), true);
  assert.equal(rules.includes("--ed-"), false, "no editor-theme tokens");
  assert.equal(rules.includes("--portal-"), false, "no portal tokens");
  assert.equal(rules.includes("--font-body"), false);
  assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(rules), false, "no hardcoded colours");
});

test("docs pages sit on the shared page frame, not the editor workspace shell", () => {
  const layout = read("app/components/docs-layout.tsx");

  assert.equal(layout.includes("ocv-page"), true);
  assert.equal(layout.includes("editor-theme"), false);
  assert.equal(layout.includes("wide-shell-page"), false);
});

test("docs hub keeps the start guide, learning path and a search field", () => {
  const hub = read("app/components/docs-hub.tsx");

  assert.equal(hub.includes("docs-intro"), true);
  assert.equal(hub.includes("docs-steps"), true);
  assert.equal(hub.includes('type="search"'), true);
  assert.equal(hub.includes("ocv-title"), true, "page heading uses the shared title style");
});

test("docs collapse on the portal breakpoint ladder, display type for headings", () => {
  assert.equal(rules.includes("@media (max-width: 979px)"), true);
  assert.equal(rules.includes("--ocv-font-display"), true);
});
