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

  assert.equal(source.includes("const MENU_AUTO_CLOSE_DELAY_MS = 2500;"), true);
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
