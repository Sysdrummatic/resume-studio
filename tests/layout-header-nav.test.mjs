import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const layoutPath = path.join(process.cwd(), "app", "layout.tsx");

function readLayoutSource() {
  return fs.readFileSync(layoutPath, "utf8");
}

test("header renders sign-up and sign-in actions for guests", () => {
  const source = readLayoutSource();

  assert.equal(source.includes('href: "/login?mode=signup"'), true);
  assert.equal(source.includes('label: "Sign up"'), true);
  assert.equal(source.includes('emphasis: "primary" as const'), true);
  assert.equal(source.includes('href: "/login?mode=signin"'), true);
  assert.equal(source.includes('label: "Sign in"'), true);
  assert.equal(source.includes('emphasis: "secondary" as const'), true);
  assert.equal(source.includes('{ href: "/login", label: "Login" }'), false);
});

test("header keeps guest auth actions separate from authenticated navigation items", () => {
  const source = readLayoutSource();
  const signUpIndex = source.indexOf('href: "/login?mode=signup"');
  const sampleCvIndex = source.indexOf('{ href: "/resume", label: "Sample CV" }');

  assert.notEqual(signUpIndex, -1);
  assert.notEqual(sampleCvIndex, -1);
  assert.equal(signUpIndex > sampleCvIndex, true);
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
  assert.equal(source.includes("leadingAccessory={actor ? null : <AppThemeSwitch initialTheme={initialTheme} />}"), true);
  assert.equal(source.includes("accessory={actor ? <AppThemeSwitch initialTheme={initialTheme} /> : null}"), true);
});
