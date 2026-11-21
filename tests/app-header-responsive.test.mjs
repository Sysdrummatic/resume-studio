import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const navigationPath = path.join(process.cwd(), "app", "components", "app-header-navigation.tsx");
const shellStylesPath = path.join(process.cwd(), "app", "components", "app-shell.css");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("app header uses the menu button below the shared desktop breakpoint", () => {
  const source = read(navigationPath);

  assert.equal(
    source.includes('export const DESKTOP_NAVIGATION_BREAKPOINT_QUERY = "(min-width: 980px)";'),
    true
  );
  assert.equal(source.includes("window.matchMedia(DESKTOP_NAVIGATION_BREAKPOINT_QUERY)"), true);
  assert.equal(source.includes("const navigationMenu = isCompact ?"), true);
  assert.equal(source.includes('aria-controls="primary-mobile-menu"'), true);
  assert.equal(source.includes("aria-label={dictionary.navigation.open_primary_aria}"), true);
});

test("navigation menu closes on hover leave, outside click and Escape, returning focus to its button", () => {
  const source = read(navigationPath);

  assert.equal(source.includes("const MENU_AUTO_CLOSE_DELAY_MS = 1000;"), true);
  assert.equal(source.includes("onMouseLeave={scheduleMenuAutoClose}"), true);
  assert.equal(source.includes("onMouseEnter={cancelMenuAutoClose}"), true);
  assert.equal(source.includes('document.addEventListener("pointerdown", handlePointerDown, true);'), true);
  assert.equal(source.includes("menuRef.current?.contains(target)"), true);
  assert.match(source, /event\.key === "Escape" && isOpen\) \{\s*event\.stopPropagation\(\);\s*setIsOpen\(false\);\s*triggerRef\.current\?\.focus\(\);/);
});

test("navigation menu closes when another header menu opens", () => {
  const source = read(navigationPath);

  assert.equal(source.includes('const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";'), true);
  assert.equal(source.includes('const NAVIGATION_MENU_NAME = "navigation";'), true);
  assert.equal(source.includes("announceHeaderMenuOpen(NAVIGATION_MENU_NAME);"), true);
  assert.equal(source.includes("event.detail !== NAVIGATION_MENU_NAME"), true);
});

test("the current route's link is marked for assistive technology and drawn with the teal underline", () => {
  const source = read(navigationPath);
  const styles = read(shellStylesPath);

  assert.equal(source.includes('aria-current={isCurrentPath(item.href, pathname, searchParams) ? "page" : undefined}'), true);
  assert.equal(source.includes('const [path, query = ""] = href.split("?");'), true);
  // Sign in and Sign up share /login: the mode decides, with the login page's own fallback for a missing or unknown mode.
  assert.equal(source.includes('import { resolveAuthMode } from "../lib/auth-mode";'), true);
  assert.equal(
    source.includes('resolveAuthMode(new URLSearchParams(query).get("mode")) === resolveAuthMode(searchParams.get("mode"))'),
    true,
  );
  assert.equal(read("app/login/page.tsx").includes('import { resolveAuthMode } from "../lib/auth-mode";'), true);
  assert.match(styles, /\.ocv-topbar__link\[aria-current="page"\] \{[^}]*box-shadow: inset 0 -2px var\(--ocv-teal\);/);
});

test("top bar follows the mockup order: page links, language, theme, then guest actions or account", () => {
  const source = read(navigationPath);
  const order = [
    "{forceInlineItems ? null : inlineNavigation}",
    "{language}",
    "{theme}",
    "{forceInlineItems ? inlineNavigation : null}",
    "{account}",
    "{navigationMenu}",
  ].map((marker) => source.indexOf(marker));

  assert.equal(order.includes(-1), false, "every slot is rendered");
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test("guest actions are design-system buttons; menu entries use the menu primitive", () => {
  const source = read(navigationPath);

  assert.equal(source.includes('return "ocv-menu__item";'), true);
  assert.equal(source.includes('buttonClassName(item.emphasis, "small")'), true);
  assert.equal(source.includes('className="ocv-menu ocv-popover__panel"'), true);
});

test("top bar is sticky, keeps its place during route transitions and uses LiveCV tokens", () => {
  const styles = read(shellStylesPath);

  assert.match(styles, /\.ocv-topbar \{[^}]*position: sticky;[^}]*background: var\(--ocv-bg\);[^}]*view-transition-name: ocv-site-header;/);
  assert.match(styles, /::view-transition-old\(ocv-site-header\) \{\s*display: none;/);
  const declarations = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(declarations), false, "no hardcoded colours in the shell");
});
