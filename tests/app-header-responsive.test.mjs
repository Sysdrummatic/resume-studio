import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const navigationPath = path.join(process.cwd(), "app", "components", "app-header-navigation.tsx");
const stylesPath = path.join(process.cwd(), "app", "globals.css");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("app header uses hamburger navigation below desktop width", () => {
  const source = read(navigationPath);

  assert.equal(source.includes('window.matchMedia("(min-width: 1024px)")'), true);
  assert.equal(source.includes('className="app-nav-menu__trigger"'), true);
  assert.equal(source.includes('className="app-nav"'), true);
});

test("hamburger menu auto-closes after hover leave and outside click", () => {
  const source = read(navigationPath);

  assert.equal(source.includes("const MENU_AUTO_CLOSE_DELAY_MS = 1000;"), true);
  assert.equal(source.includes("onMouseLeave={scheduleMenuAutoClose}"), true);
  assert.equal(source.includes("onMouseEnter={cancelMenuAutoClose}"), true);
  assert.equal(source.includes('document.addEventListener("pointerdown", handlePointerDown, true);'), true);
  assert.equal(source.includes("menuRef.current?.contains(target)"), true);
});

test("hamburger menu closes when another header menu opens", () => {
  const source = read(navigationPath);

  assert.equal(source.includes('const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";'), true);
  assert.equal(source.includes('const NAVIGATION_MENU_NAME = "navigation";'), true);
  assert.equal(source.includes("announceHeaderMenuOpen(NAVIGATION_MENU_NAME);"), true);
  assert.equal(source.includes("event.detail !== NAVIGATION_MENU_NAME"), true);
});

test("account menu shows identity only on desktop width", () => {
  const styles = read(stylesPath);

  assert.equal(styles.includes("@media (max-width: 1023px)"), true);
  assert.equal(styles.includes(".app-header__controls--compact .account-menu__identity"), true);
  assert.equal(styles.includes(".app-header__controls--compact .account-menu__trigger"), true);
  assert.equal(styles.includes(".account-menu__identity {\n    display: none;"), true);
  assert.equal(styles.includes(".account-menu__trigger {\n    padding: 0.35rem;"), true);
});
