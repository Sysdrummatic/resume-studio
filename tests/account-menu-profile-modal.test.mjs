import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.join(process.cwd(), "app", "components", "account-menu.tsx");
const stylesPath = path.join(process.cwd(), "app", "globals.css");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("profile modal renders overlay container with close button label Zamknij", () => {
  const source = read(componentPath);

  assert.equal(source.includes('className="profile-modal-overlay"'), true);
  assert.equal(source.includes("onClick={closeProfileModal}"), true);
  assert.equal(source.includes("Zamknij"), true);
  assert.equal(source.includes("<dialog"), false);
});

test("profile modal styles center the modal and blur the background", () => {
  const styles = read(stylesPath);

  assert.equal(styles.includes(".profile-modal-overlay"), true);
  assert.equal(styles.includes("position: fixed;"), true);
  assert.equal(styles.includes("inset: 0;"), true);
  assert.equal(styles.includes("place-items: center;"), true);
  assert.equal(styles.includes("backdrop-filter: blur("), true);
});
