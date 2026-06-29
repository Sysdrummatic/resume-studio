import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0006 is accepted and checklist is complete", () => {
  const adr = read("docs/adr/0006-saved-version-language-ux-contract.md");
  assert.equal(adr.includes("Status: Accepted"), true);
  assert.equal(adr.includes("- [x] Replace remaining user-facing \"preset\" copy with \"Saved Version\"."), true);
  assert.equal(adr.includes("- [x] Define publish modal contract for locale selection and default locale."), true);
  assert.equal(adr.includes("- [x] Define link management UX states (active/revoked/indexable)."), true);
  assert.equal(adr.includes("- [x] Ensure dashboard/editor show canonical first, compatibility second."), true);
  assert.equal(adr.includes("- [x] Add UX regression tests for publish/unpublish language flows."), true);
});

test("dashboard publish modal supports language selection and default locale contract", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const modal = read("app/components/PublishSavedVersionModal.tsx");
  assert.equal(client.includes("PublishSavedVersionModal"), true);
  assert.equal(client.includes("selectedLocales"), true);
  assert.equal(client.includes("defaultLocale"), true);
  assert.equal(modal.includes("Allow indexing for this Published CV"), true);
  assert.equal(modal.includes("Canonical URL is the permanent public link"), true);
});

test("Saved Version management is delegated to Dashboard; editor shows only Publish and Revision history", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const dashboard = read("app/dashboard/dashboard-client.tsx");

  assert.equal(editor.includes("Saved Versions and public links"), false);
  assert.equal(editor.includes("PublishSavedVersionModal"), false);
  assert.equal(editor.includes("openPublishSavedVersion"), false);
  assert.equal(editor.includes("unpublishSavedVersion"), false);
  assert.equal(editor.includes("Open public CV"), false);
  assert.equal(editor.includes("Copy public URL"), false);

  assert.equal(editor.includes("Publish"), true);
  assert.equal(editor.includes("Revision history"), true);
  assert.equal(editor.includes("Save MasterCV"), true);
  assert.equal(editor.includes("Rollback"), true);

  assert.equal(dashboard.includes("PublishSavedVersionModal"), true);
  assert.equal(dashboard.includes("canonical_public_path"), true);
  assert.equal(dashboard.includes("copyPublicLink"), true);
  assert.equal(dashboard.includes("Open CV"), true);
  assert.equal(editor.includes("resume_public_links"), false);
});
