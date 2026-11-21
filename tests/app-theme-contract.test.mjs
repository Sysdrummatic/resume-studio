import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readStoredAppTheme } from "../app/lib/app-theme.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("app theme contract enables dark and light; the portal follows the system until a choice is stored", () => {
  const model = read("app/lib/app-theme.ts");

  assert.equal(model.includes("dark: {"), true);
  assert.equal(model.includes("light: {"), true);
  assert.equal(model.includes('export const APP_THEME_COOKIE_NAME = "OpenCiVera-theme";'), true);
  assert.equal(model.includes("getNextAppTheme"), true);

  assert.equal(readStoredAppTheme("light"), "light");
  assert.equal(readStoredAppTheme("dark"), "dark");
  assert.equal(readStoredAppTheme(undefined), null);
  assert.equal(readStoredAppTheme(""), null);
  assert.equal(readStoredAppTheme("sepia"), null);
  assert.equal(readStoredAppTheme("constructor"), null, "inherited object keys are not themes");
});

test("theme switch is interactive, persists the selected theme and mirrors the document", () => {
  const switchSource = read("app/components/app-theme-switch.tsx");
  const styles = read("app/globals.css");

  assert.equal(switchSource.includes("const APP_THEME_TRANSITION_MS = 200;"), true);
  assert.equal(switchSource.includes('role="switch"'), true);
  assert.equal(switchSource.includes('aria-checked={theme === "light"}'), true);
  assert.equal(switchSource.includes("dictionary.theme.aria_label"), true);
  assert.equal(switchSource.includes("document.cookie"), true);
  assert.equal(switchSource.includes('window.matchMedia("(prefers-reduced-motion: reduce)")'), true);
  assert.equal(switchSource.includes('root.dataset.themeTransition = "active";'), true);
  assert.equal(switchSource.includes("startViewTransition"), true);
  assert.equal(switchSource.includes('attributeFilter: ["data-app-theme"]'), true);
  assert.equal(switchSource.includes('className="ocv-icon-btn ocv-topbar__theme"'), true);
  // The cookie is written before the attribute, so the system-theme listener stops following the OS.
  assert.ok(switchSource.indexOf("persistTheme(nextResolvedTheme);") < switchSource.indexOf("applyTheme(nextResolvedTheme);"));
  assert.equal(styles.includes("::view-transition-old(root)"), true);
  assert.equal(styles.includes('body[data-theme-transition="active"]'), true);
  assert.equal(styles.includes("--app-theme-transition-duration: 200ms;"), true);
});

test("layout renders the stored theme on the server and otherwise follows the system before first paint", () => {
  const layout = read("app/layout.tsx");
  const script = read("app/components/app-theme-script.tsx");

  assert.equal(layout.includes("await cookies()"), true);
  assert.equal(layout.includes("readStoredAppTheme(cookieStore.get(APP_THEME_COOKIE_NAME)?.value)"), true);
  assert.equal(layout.includes("data-app-theme={initialTheme ?? undefined}"), true);
  assert.equal(layout.includes("<body data-app-theme={initialTheme ?? undefined} suppressHydrationWarning>"), true);
  assert.equal(layout.includes("{initialTheme ? null : <AppThemeScript nonce={cspNonce} />}"), true);
  // CSP: the inline script carries the request nonce, read from the policy proxy.ts sets.
  assert.equal(layout.includes(`.get("content-security-policy")?.match(/'nonce-([^']+)'/)?.[1]`), true);
  assert.equal(script.includes("<script nonce={nonce}"), true);
  assert.equal(script.includes('matchMedia("(prefers-color-scheme: light)")'), true);
  assert.equal(script.includes('m.addEventListener("change",a)'), true);
  assert.equal(script.includes("APP_THEME_COOKIE_NAME"), true);
});

test("the system-theme script sets the theme from the system and stops once a choice is stored", () => {
  // The .tsx module is not importable under the plain Node runner: rebuild the emitted string from its template.
  const template = read("app/components/app-theme-script.tsx").match(/const FOLLOW_SYSTEM_THEME = `([\s\S]*?)`;/)[1];
  const code = Function(
    `const APP_THEME_COOKIE_NAME = "OpenCiVera-theme", ENABLED_APP_THEMES = ["dark", "light"]; return \`${template}\`;`,
  )();

  function run({ prefersLight, cookie }) {
    const listeners = [];
    const media = { matches: prefersLight, addEventListener: (_type, fn) => listeners.push(fn) };
    const element = () => ({ dataset: {}, style: {} });
    const document = { cookie, documentElement: element(), body: element() };
    Function("document", "matchMedia", code)(document, () => media);
    return { document, media, listeners };
  }

  const light = run({ prefersLight: true, cookie: "" });
  assert.equal(light.document.documentElement.dataset.appTheme, "light");
  assert.equal(light.document.body.dataset.appTheme, "light");
  assert.equal(light.document.documentElement.style.colorScheme, "light");

  light.media.matches = false;
  light.listeners.forEach((listener) => listener());
  assert.equal(light.document.documentElement.dataset.appTheme, "dark", "follows a live OS change");

  light.document.cookie = "other=1; OpenCiVera-theme=light";
  light.media.matches = true;
  light.listeners.forEach((listener) => listener());
  assert.equal(light.document.documentElement.dataset.appTheme, "dark", "a stored choice wins over the OS");

  // Same rule as readStoredAppTheme on the server: an invalid cookie means "follow the system".
  for (const cookie of ["OpenCiVera-theme=constructor", "OpenCiVera-theme=sepia", "OpenCiVera-theme="]) {
    const invalid = run({ prefersLight: true, cookie });
    assert.equal(invalid.document.documentElement.dataset.appTheme, "light", cookie);
    invalid.media.matches = false;
    invalid.listeners.forEach((listener) => listener());
    assert.equal(invalid.document.documentElement.dataset.appTheme, "dark", `${cookie} still follows the OS`);
  }
  assert.equal(run({ prefersLight: true, cookie: "OpenCiVera-theme=dark" }).document.documentElement.dataset.appTheme, undefined);
  assert.equal(read("app/components/app-theme-script.tsx").includes("ENABLED_APP_THEMES"), true, "same theme list as the server");
});
