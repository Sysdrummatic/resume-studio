import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const stylesPath = path.join(process.cwd(), "app", "globals.css");
const loginPagePath = path.join(process.cwd(), "app", "login", "page.tsx");
const loginClientPath = path.join(process.cwd(), "app", "login", "account-access-client.tsx");

function readStyles() {
  return fs.readFileSync(stylesPath, "utf8");
}

function readSource(filePath) {
  return fs.readFileSync(filePath, "utf8");
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

test("login flow uses separate modes for sign in, sign up, and reset", () => {
  const page = readSource(loginPagePath);
  const client = readSource(loginClientPath);

  assert.equal(page.includes("mode?: string;"), true);
  assert.equal(page.includes("function resolveAuthMode"), true);
  assert.equal(page.includes("mode={resolveAuthMode(params.mode)}"), true);
  assert.equal(client.includes('type InitialAuthMode = "signin" | "signup" | "reset";'), true);
  assert.equal(client.includes('type AuthMode = InitialAuthMode | "new-password";'), true);
  assert.equal(client.includes("auth-card__tabs"), false);
  assert.equal(client.includes("Forgot password?"), true);
  assert.equal(client.includes('router.replace(`/login?mode=${nextMode}`, { scroll: false });'), true);
  assert.equal(client.includes('setMode("signin");'), true);
});
