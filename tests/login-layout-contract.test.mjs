import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const stylesPath = path.join(process.cwd(), "app", "globals.css");

function readStyles() {
  return fs.readFileSync(stylesPath, "utf8");
}

function extractRule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m"));
  return match?.[1] || "";
}

test("login access container uses a stable responsive width", () => {
  const styles = readStyles();
  const rule = extractRule(styles, ".app-main .auth-access");

  assert.equal(rule.includes("width: fit-content"), false);
  assert.equal(rule.includes("left: 50%"), false);
  assert.equal(rule.includes("translateX(-50%)"), false);
  assert.equal(rule.includes("width: min(460px, 100%)"), true);
  assert.equal(rule.includes("margin-inline: auto"), true);
});

test("login card fills the access container instead of shrinking to content", () => {
  const styles = readStyles();
  const cardRule = styles.match(/\.auth-access__card\s*\{([^}]*)\}/m)?.[1] || "";

  assert.equal(cardRule.includes("min-width: 0"), true);
  assert.equal(cardRule.includes("width: 100%"), true);
  assert.equal(styles.includes(".auth-access {\n    grid-template-columns: minmax(0, 1.05fr)"), false);
});
