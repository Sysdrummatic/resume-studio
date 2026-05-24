import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("app theme contract enables dark and light with dark as default", () => {
  const model = read("app/lib/app-theme.ts");

  assert.equal(model.includes("dark: {"), true);
  assert.equal(model.includes("light: {"), true);
  assert.equal(model.includes('export const DEFAULT_APP_THEME: AppTheme = "dark";'), true);
  assert.equal(model.includes('export const APP_THEME_COOKIE_NAME = "OpenCiVera-theme";'), true);
  assert.equal(model.includes("getNextAppTheme"), true);
  assert.equal(model.includes("resolveAppTheme"), true);
});

test("theme switch is interactive and persists the selected theme", () => {
  const switchSource = read("app/components/app-theme-switch.tsx");
  const styles = read("app/globals.css");

  assert.equal(switchSource.includes("const APP_THEME_TRANSITION_MS = 1500;"), true);
  assert.equal(switchSource.includes('role="switch"'), true);
  assert.equal(switchSource.includes('aria-checked={theme === "light"}'), true);
  assert.equal(switchSource.includes("Switch to ${nextTheme} theme."), true);
  assert.equal(switchSource.includes("document.cookie"), true);
  assert.equal(switchSource.includes('window.matchMedia("(prefers-reduced-motion: reduce)")'), true);
  assert.equal(switchSource.includes('root.dataset.themeTransition = "active";'), true);
  assert.equal(switchSource.includes("startViewTransition"), true);
  assert.equal(switchSource.includes("MoonIcon"), true);
  assert.equal(switchSource.includes("SunIcon"), true);
  assert.equal(styles.includes(".app-theme-switch__thumb"), true);
  assert.equal(styles.includes(".app-theme-switch--light .app-theme-switch__thumb"), true);
  assert.equal(styles.includes("color: var(--portal-on-accent);"), true);
  assert.equal(styles.includes("::view-transition-old(root)"), true);
  assert.equal(styles.includes('body[data-theme-transition="active"]'), true);
  assert.equal(styles.includes("--app-theme-transition-duration: 1500ms;"), true);
});

test("layout resolves the initial theme on the server", () => {
  const layout = read("app/layout.tsx");

  assert.equal(layout.includes("await cookies()"), true);
  assert.equal(layout.includes("APP_THEME_COOKIE_NAME"), true);
  assert.equal(layout.includes("resolveAppTheme"), true);
  assert.equal(layout.includes('data-app-theme={initialTheme}'), true);
  assert.equal(layout.includes("<body data-app-theme={initialTheme}>"), true);
});

test("language menu badge and active states are tokenized for both themes", () => {
  const styles = read("app/globals.css");

  assert.equal(styles.includes(".app-language-menu__label"), true);
  assert.equal(styles.includes("background: var(--portal-tab-active-bg);"), true);
  assert.equal(styles.includes("color: var(--accent);"), true);
  assert.equal(styles.includes(".app-language-menu[open] summary"), true);
  assert.equal(styles.includes("background: var(--portal-control-bg-hover);"), true);
  assert.equal(styles.includes(".app-language-menu__option--active"), true);
  assert.equal(styles.includes("background: var(--portal-surface-ghost-strong);"), true);
});

test("user avatar consumes portal theme variables instead of hardcoded dark colors", () => {
  const avatar = read("app/components/design-system/atoms/UserAvatar.tsx");

  assert.equal(avatar.includes("var(--portal-on-accent)"), true);
  assert.equal(avatar.includes("var(--portal-button-primary-bg)"), true);
  assert.equal(avatar.includes("var(--portal-control-border)"), true);
  assert.equal(avatar.includes("var(--portal-button-primary-shadow)"), true);
  assert.equal(avatar.includes("#5d7cff"), false);
  assert.equal(avatar.includes("#ffffff"), false);
});
