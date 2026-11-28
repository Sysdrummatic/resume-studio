import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("personal hub (#294) is a profile card beside the LiveCV preview, with no drawer", () => {
  const source = read("app/user/user-client.tsx");

  assert.equal(source.includes("ocv-page"), true, "the hub sits on the shared page frame");
  assert.equal(source.includes("hub-grid"), true);
  assert.equal(source.includes("hub-card"), true);
  assert.equal(source.includes("isSidebarDrawerOpen"), false, "the mobile drawer is replaced by one column");
  assert.equal(source.includes('role="dialog"'), false);
  assert.equal(source.includes("DESKTOP_NAVIGATION_BREAKPOINT_QUERY"), false);
  assert.equal(source.includes('aria-label={userText("Resume preview")}'), true);
  assert.equal(source.includes("isPreviewUnavailable"), true);
  assert.equal(source.includes("Preview unavailable"), true);
});

test("personal hub collapses to one column on the portal breakpoint ladder", () => {
  const styles = read("app/user/user.css");

  assert.equal(styles.includes("@media (max-width: 979px)"), true);
});

test("personal hub consumes design-system tokens, not portal tokens or local dark-only utilities", () => {
  const source = read("app/user/user-client.tsx");
  const styles = read("app/user/user.css");

  assert.equal(styles.includes("--portal-"), false);
  assert.equal(styles.includes("var(--ocv-"), true);
  const rules = styles.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(rules), false, "no hardcoded colours");
  assert.equal(source.includes("bg-black/40"), false);
  assert.equal(source.includes("text-white/80"), false);
  assert.equal(source.includes("border-white/10"), false);
});

test("profile modal (#294) is the shared Modal primitive and keeps its labelled controls", () => {
  const source = read("app/components/account-menu.tsx");

  assert.equal(source.includes("<Modal"), true);
  assert.equal(source.includes("profile-modal-overlay"), false);
  assert.equal(source.includes("closeLabel={profileLabels.close}"), true);
  assert.equal(source.includes("profileFirstName"), true);
  assert.equal(source.includes('autoComplete="given-name"'), true);
  assert.equal(source.includes('autoComplete="family-name"'), true);
  assert.equal(source.includes('fetch("/api/user/profile"'), true);
});
