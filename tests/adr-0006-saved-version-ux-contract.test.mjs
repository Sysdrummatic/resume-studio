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
  assert.equal(client.includes("PublishSavedVersionModal"), true);
  assert.equal(client.includes("selectedLocales"), true);
  assert.equal(client.includes("defaultLocale"), true);
  assert.equal(client.includes("Allow indexing for this Published CV"), true);
  assert.equal(client.includes("Canonical URL is primary"), true);
});

test("editor exposes read-only Saved Version/public-link state with canonical-first guidance", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const canonicalIndex = editor.indexOf("Canonical URL");
  const compatibilityIndex = editor.indexOf("Compatibility URL");
  assert.equal(editor.includes("Saved Versions and public links"), true);
  assert.equal(editor.includes("Canonical URL is primary"), true);
  assert.equal(editor.includes("/api/resume/presets"), true);
  assert.equal(editor.includes("Loading Saved Versions..."), true);
  assert.equal(editor.includes("Retry Saved Version list"), true);
  assert.equal(editor.includes("preset.canonical_public_path"), true);
  assert.equal(editor.includes("preset.compatibility_public_path"), true);
  assert.equal(editor.includes("Canonical URL"), true);
  assert.equal(editor.includes("Compatibility URL"), true);
  assert.equal(editor.includes("Open public CV"), true);
  assert.equal(editor.includes("Copy public URL"), true);
  assert.equal(editor.includes("hasPublishedCanonicalLink"), true);
  assert.equal(editor.includes("const hasPublishedCanonicalLink = preset.is_public && Boolean(preset.canonical_public_path);"), true);
  assert.equal(canonicalIndex >= 0 && compatibilityIndex > canonicalIndex, true);
  assert.equal(editor.includes("resume_public_links"), false);
});

test("editor publish controls keep Saved Version language selection and public-link wording separate from master resume publishing", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  assert.equal(editor.includes("PublishSavedVersionModal"), true);
  assert.equal(editor.includes("openPublishSavedVersion"), true);
  assert.equal(editor.includes("publishSavedVersion"), true);
  assert.equal(editor.includes("unpublishSavedVersion"), true);
  assert.equal(editor.includes("selectedLocales"), true);
  assert.equal(editor.includes("defaultLocale"), true);
  assert.equal(editor.includes("Allow indexing for this Published CV"), true);
  assert.equal(editor.includes("Link state after publish"), true);
  assert.equal(editor.includes("Publish CV Version"), true);
  assert.equal(editor.includes("Unpublish"), true);
  assert.equal(editor.includes("Publish and create revision"), true);
});
