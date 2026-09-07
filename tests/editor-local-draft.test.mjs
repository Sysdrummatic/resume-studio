import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { shouldClearLocalDraft } = await import("../app/master-resume/local-draft-policy.ts");

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const editor = read("app/master-resume/editor-canvas-client.tsx");

test("loading the saved document repeatedly preserves a distinct recovery draft", () => {
  let storedYamlContent = "unsaved experience";
  for (let reload = 0; reload < 2; reload += 1) {
    if (shouldClearLocalDraft({ yamlContent: "saved", savedYamlContent: "saved", storedYamlContent, wasDirty: false })) {
      storedYamlContent = undefined;
    }
  }
  assert.equal(storedYamlContent, "unsaved experience");
});

test("saving or reverting a dirty document clears its local draft", () => {
  assert.equal(shouldClearLocalDraft({
    yamlContent: "saved", savedYamlContent: "saved", storedYamlContent: "previous edits", wasDirty: true,
  }), true);
});

test("a redundant saved copy can be cleared on initial load", () => {
  assert.equal(shouldClearLocalDraft({
    yamlContent: "saved", savedYamlContent: "saved", storedYamlContent: "saved", wasDirty: false,
  }), true);
});

test("edits made during a save keep their recovery copy", () => {
  assert.equal(shouldClearLocalDraft({
    yamlContent: "new edits", savedYamlContent: "saved", storedYamlContent: "new edits", wasDirty: true,
  }), false);
});

test("switching to a clean locale preserves its recovery draft", () => {
  const previousDirtyByLocale = { en: true, pl: false };
  assert.equal(shouldClearLocalDraft({
    yamlContent: "saved PL", savedYamlContent: "saved PL", storedYamlContent: "unsaved PL", wasDirty: previousDirtyByLocale.pl,
  }), false);
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
