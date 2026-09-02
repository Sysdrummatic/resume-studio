import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const editor = read("app/master-resume/editor-canvas-client.tsx");

test("the local-draft write effect skips a false-positive save on initial load", () => {
  // Regression: yamlPanel also changes once when the buffer is first
  // populated from the server, which isn't an edit — writing (and showing
  // "Draft saved") must only happen once the panel actually diverges from
  // what's saved, and the stale local copy must be cleared once it no
  // longer diverges (e.g. right after Save MasterCV).
  assert.match(editor, /if \(yamlPanel === activeBuffer\.savedYamlContent\) \{\s*clearLocalDraft\(locale\);/);
});

test("discarding the local draft reverts the open editor to the last saved version", () => {
  assert.match(editor, /function discardLocalDraft\(\)[\s\S]*?updateActiveYaml\(activeBuffer\.savedYamlContent\)/);
});

test("the unsaved-draft entry is surfaced in the History list, styled as unsaved, with Delete always offered", () => {
  assert.match(editor, /data-unsaved="true"/);
  assert.match(editor, /revision-list__tag--unsaved/);
  // Restore only makes sense once there's a stale draft distinct from what's
  // currently on screen (restorableDraft); Delete must always be available
  // whenever there's something unsaved to discard.
  const historySection = editor.slice(editor.indexOf('data-unsaved="true"'), editor.indexOf("revisions.map"));
  assert.match(historySection, /restorableDraft \?[\s\S]*?onClick=\{restoreLocalDraft\}/);
  assert.match(historySection, /onClick=\{discardLocalDraft\}/);
});

test("the restore banner's second action deletes the draft, not just hides the banner", () => {
  const bannerSection = editor.slice(editor.indexOf("resume-editor-restore-banner"), editor.indexOf("<ImportCvBanner"));
  assert.match(bannerSection, /onClick=\{discardLocalDraft\}/);
  assert.equal(/onClick=\{\(\) => setRestorableDraft\(null\)\}/.test(bannerSection), false);
});

test("clearLocalDraft removes the stored key instead of leaving a stale entry behind", () => {
  assert.match(editor, /function clearLocalDraft\(locale: string\): void \{[\s\S]*?window\.localStorage\.removeItem\(localDraftStorageKey\(locale\)\)/);
});
