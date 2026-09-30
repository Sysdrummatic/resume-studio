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
  assert.equal(source.includes("label: appI18n.dictionary.navigation.sign_up"), true);
  assert.equal(source.includes('emphasis: "primary" as const'), true);
  assert.equal(source.includes('href: "/login?mode=signin"'), true);
  assert.equal(source.includes("label: appI18n.dictionary.navigation.sign_in"), true);
  assert.equal(source.includes('emphasis: "secondary" as const'), true);
  assert.equal(source.includes('{ href: "/login", label: "Login" }'), false);
});

test("header keeps guest auth actions separate from authenticated navigation items", () => {
  const source = readLayoutSource();
  const signUpIndex = source.indexOf('href: "/login?mode=signup"');
  const sampleCvIndex = source.indexOf('{ href: "/resume", label: appI18n.dictionary.navigation.sample_cv }');

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
  // Guest: theme switch sits in branding, next to the logo (left side).
  // Signed in: theme switch moves into accessory, alongside the language
  // menu, right before the account menu (right side).
  assert.equal(source.includes("<AppThemeSwitch initialTheme={initialTheme} />"), true);
  assert.equal(/accessory=\{\s*actor \? \(\s*<>\s*<AppThemeSwitch initialTheme=\{initialTheme\} \/>/.test(source), true);
});
