import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const componentPath = path.join(process.cwd(), "app", "components", "account-menu.tsx");
const stylesPath = path.join(process.cwd(), "app", "globals.css");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

test("profile modal is the shared Modal primitive with a localized close label", () => {
  const source = read(componentPath);

  assert.equal(source.includes("<Modal"), true);
  assert.equal(source.includes("open={isProfileOpen}"), true);
  assert.equal(source.includes("onClose={() => closeProfileModal()}"), true);
  assert.equal(source.includes("closeLabel={profileLabels.close}"), true);
  assert.equal(source.includes('className="profile-modal-overlay"'), false);
});

test("profile modal exposes editable first and last name fields", () => {
  const source = read(componentPath);

  assert.equal(source.includes("profileFirstName"), true);
  assert.equal(source.includes("profileLastName"), true);
  assert.equal(source.includes('autoComplete="given-name"'), true);
  assert.equal(source.includes('autoComplete="family-name"'), true);
  assert.equal(source.includes('fetch("/api/user/profile"'), true);
});

test("the hand-rolled profile modal styles are gone; the Modal primitive owns centring and blur", () => {
  const styles = read(stylesPath);

  assert.equal(styles.includes(".profile-modal"), false);
});
