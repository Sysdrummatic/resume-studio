import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.join(process.cwd(), "app", "components", "account-menu.tsx");

function readComponentSource() {
  return fs.readFileSync(componentPath, "utf8");
}

test("account menu schedules auto-close after blur/loss of hover", () => {
  const source = readComponentSource();

  assert.equal(source.includes("const MENU_AUTO_CLOSE_DELAY_MS = 1000;"), true);
  assert.equal(source.includes("window.setTimeout"), true);
  assert.equal(source.includes("menuRef.current.open = false;"), true);
});

test("account menu cancels close timer when hover/focus returns", () => {
  const source = readComponentSource();

  assert.equal(source.includes("onMouseLeave={scheduleMenuAutoClose}"), true);
  assert.equal(source.includes("onMouseEnter={cancelMenuAutoClose}"), true);
  assert.equal(source.includes("onFocus={cancelMenuAutoClose}"), true);
  assert.equal(source.includes("onBlur={handleMenuBlur}"), true);
});

test("account menu closes on click outside", () => {
  const source = readComponentSource();

  assert.equal(source.includes('document.addEventListener("pointerdown", handlePointerDown, true);'), true);
  assert.equal(source.includes('document.removeEventListener("pointerdown", handlePointerDown, true);'), true);
  assert.equal(source.includes("menuRef.current?.contains(target)"), true);
});

test("account menu closes when another header menu opens", () => {
  const source = readComponentSource();

  assert.equal(source.includes('const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";'), true);
  assert.equal(source.includes('const ACCOUNT_MENU_NAME = "account";'), true);
  assert.equal(source.includes("announceHeaderMenuOpen(ACCOUNT_MENU_NAME);"), true);
  assert.equal(source.includes("event.detail !== ACCOUNT_MENU_NAME"), true);
});
