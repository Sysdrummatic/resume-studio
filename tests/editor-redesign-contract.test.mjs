import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("editor restyle and motion live in one stylesheet with a reduced-motion fallback", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const css = read("app/master-resume/editor-redesign.css");

  assert.match(editor, /import "\.\/editor-redesign\.css"/);
  assert.match(css, /\.resume-human-editor\s*\{[^}]*animation:[^;]*120ms/);
  assert.match(css, /resume-editor-wash/);
  assert.match(css, /resume-editor-preview-flash|\.is-changed/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.equal(/\bstyle=\{\{[^}]*(transition|animation)/.test(editor), false);
});

test("editor bar shows save state and the completeness meter", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const toolbar = editor.slice(
    editor.indexOf('className="resume-editor-toolbar"'),
    editor.indexOf('className="resume-editor-workspace"')
  );
  assert.equal(toolbar.includes("resume-editor-save-state"), true);
  assert.equal(toolbar.includes("completion.percent"), true);
  assert.equal(editor.includes("Saving…"), true);
  assert.equal(editor.includes("Saved"), true);
});

test("editor dialogs use the Modal primitive and no browser confirm remains", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const save = read("app/master-resume/save-version-modal.tsx");
  const review = read("app/master-resume/import-review-modal.tsx");
  const confirm = read("app/master-resume/confirm-modal.tsx");

  assert.equal(editor.includes("window.confirm"), false);
  assert.equal(editor.includes("ConfirmModal") || editor.includes("useConfirm"), true);
  for (const source of [save, review, confirm]) {
    assert.match(source, /design-system\/primitives/);
    assert.equal(source.includes("dashboard-modal"), false);
  }
});

test("failed saves still block: the save modal stays open until publish resolves", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  assert.match(editor, /publishResume\(\)\.then\(\(\) => setIsSaveVersionModalOpen\(false\)\)/);
});

test("a double click on Remove cannot apply the same removal twice", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const css = read("app/master-resume/editor-redesign.css");
  const fn = editor.slice(editor.indexOf("async function removeArrayItem"), editor.indexOf("async function updateHighlights"));
  assert.match(fn, /if \(removingRef\.current\) return;/);
  assert.match(fn, /finally \{\s*removingRef\.current = false;/);
  assert.match(css, /\.is-removing \{[^}]*pointer-events: none/);
});
