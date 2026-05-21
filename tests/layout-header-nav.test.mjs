import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

function readLayoutSource() {
  return fs.readFileSync(layoutPath, "utf8");
}

test("header renders login link for guests in primary nav", () => {
  const source = readLayoutSource();

  assert.equal(source.includes('{ href: "/login", label: "Login" }'), true);
  assert.equal(source.includes('{ href: "/login", label: "Sign in" }'), false);
});

test("header keeps login link as rightmost item after Sample CV in primary nav", () => {
  const source = readLayoutSource();
  const loginIndex = source.indexOf('{ href: "/login", label: "Login" }');
  const sampleCvIndex = source.indexOf('{ href: "/resume", label: "Sample CV" }');

  assert.notEqual(loginIndex, -1);
  assert.notEqual(sampleCvIndex, -1);
  assert.equal(loginIndex > sampleCvIndex, true);
});

test("layout resolves the portal theme from cookie and passes an active switch", () => {
  const source = readLayoutSource();

  assert.equal(source.includes("DEFAULT_APP_THEME"), true);
  assert.equal(source.includes("await cookies()"), true);
  assert.equal(source.includes("APP_THEME_COOKIE_NAME"), true);
  assert.equal(source.includes("resolveAppTheme"), true);
  assert.equal(source.includes('data-app-theme={initialTheme}'), true);
  assert.equal(source.includes("AppThemeSwitch"), true);
  assert.equal(source.includes("initialTheme={initialTheme}"), true);
  assert.equal(source.includes("accessory={<AppThemeSwitch initialTheme={initialTheme} />}"), true);
});
