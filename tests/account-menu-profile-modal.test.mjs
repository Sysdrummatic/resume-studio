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

test("profile modal exposes editable first and last name fields", () => {
  const source = read(componentPath);

  assert.equal(source.includes("profileFirstName"), true);
  assert.equal(source.includes("profileLastName"), true);
  assert.equal(source.includes('autoComplete="given-name"'), true);
  assert.equal(source.includes('autoComplete="family-name"'), true);
  assert.equal(source.includes('fetch("/api/user/profile"'), true);
});

test("profile modal styles center the modal and blur the background", () => {
  const styles = read(stylesPath);

  // Scoped to the .profile-modal-overlay rule itself — these four
  // properties each appear elsewhere in globals.css too, so matching
  // against the whole file would still pass if this specific rule lost
  // centering/blur.
  const rule = styles.match(/\.profile-modal-overlay\s*\{[^}]*\}/)?.[0] ?? "";
  assert.notEqual(rule, "", "the .profile-modal-overlay rule must exist");
  assert.equal(rule.includes("position: fixed;"), true);
  assert.equal(rule.includes("inset: 0;"), true);
  assert.equal(rule.includes("place-items: center;"), true);
  assert.equal(rule.includes("backdrop-filter: blur("), true);
});
