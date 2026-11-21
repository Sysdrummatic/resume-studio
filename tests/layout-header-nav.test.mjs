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

test("layout reads the stored theme from the cookie and passes the language and theme switches", () => {
  const source = readLayoutSource();

  assert.equal(source.includes("await cookies()"), true);
  assert.equal(source.includes("readStoredAppTheme(cookieStore.get(APP_THEME_COOKIE_NAME)?.value)"), true);
  assert.equal(source.includes("data-app-theme={initialTheme ?? undefined}"), true);
  assert.equal(source.includes("language={<AppLanguageMenu />}"), true);
  assert.equal(source.includes("theme={<AppThemeSwitch initialTheme={initialTheme} />}"), true);
});
