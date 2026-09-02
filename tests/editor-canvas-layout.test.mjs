import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("editor canvas is a three-column grid with a full-height sidebar", () => {
  const styles = read("app/globals.css");

  assert.equal(styles.includes(".resume-editor-layout"), true);
  assert.match(styles, /\.resume-editor-sidebar\s*\{[\s\S]*?grid-row:\s*1\s*\/\s*3/);
  assert.match(styles, /\.resume-editor-toolbar\s*\{[\s\S]*?grid-column:\s*2\s*\/\s*4/);
  // Breakpoint ladder from the mockup:
  //   761px+  sidebar returns as a column (two columns)
  //   1021px+ preview joins the grid as a third column
  //   1241px+ preview column widens
  // and below 1021px the preview is a slide-over instead.
  assert.equal(styles.includes("@media (min-width: 761px)"), true);
  assert.equal(styles.includes("@media (min-width: 1021px)"), true);
  assert.equal(styles.includes("@media (min-width: 1241px)"), true);
  assert.equal(styles.includes("@media (max-width: 1020px)"), true);
  assert.equal(styles.includes("@media (max-width: 760px)"), true);

  const layout = styles.slice(styles.indexOf("@media (min-width: 761px)"));
  // Two columns before the preview column appears, three after.
  assert.match(layout, /grid-template-columns:\s*246px minmax\(0, 1fr\);/);
  assert.match(layout, /grid-template-columns:\s*246px minmax\(0, 1fr\) 540px;/);
  assert.match(layout, /grid-template-columns:\s*246px minmax\(0, 1fr\) 630px;/);
});

test("section navigation groups sections and numbers only the basics", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const nav = read("app/master-resume/editor-section-nav.tsx");

  assert.equal(editor.includes('label: "Basics"'), true);
  assert.equal(editor.includes('label: "Optional"'), true);
  assert.equal(editor.includes('label: "Document"'), true);
  assert.equal(editor.includes("numbered: true"), true);
  // One source of truth drives the sidebar, the workspace heading and the YAML jumps.
  assert.equal(editor.includes("const EDITOR_SECTIONS: EditorSection[] = EDITOR_SECTION_GROUPS.flatMap"), true);
  assert.equal(nav.includes("SECTION_ICON_PATHS"), true);
  assert.equal(nav.includes("resume-editor-nav__indicator"), true);
});

test("toolbar carries language, mode toggle and the primary save action", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  const toolbar = editor.slice(editor.indexOf('className="resume-editor-toolbar"'), editor.indexOf('className="resume-editor-workspace"'));
  assert.equal(toolbar.includes("LocaleTabStrip"), true);
  assert.equal(toolbar.includes("resume-editor-draft-indicator"), true);
  assert.equal(toolbar.includes("Human-friendly Editor"), true);
  assert.equal(toolbar.includes("YAML Editor"), true);
  assert.equal(toolbar.includes("Save MasterCV"), true);
  // Publishing toggles moved into their own nav section; the toolbar keeps only
  // the deliberate commit action.
  assert.equal(toolbar.includes("Allow indexing"), false);
});

test("only one entry card is open at a time", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(editor.includes("function isEntryOpen"), true);
  assert.equal(editor.includes("function handleEntryToggle"), true);
  for (const field of ["summary", "experience", "education"]) {
    assert.equal(editor.includes(`open={isEntryOpen("${field}", index)}`), true);
    assert.equal(editor.includes(`handleEntryToggle("${field}", index, event.currentTarget.open)`), true);
  }
  // The close echo React fires on the previously-open sibling must not clear the
  // freshly opened card, so the reset has to be a functional update.
  assert.match(editor, /setOpenEntryKey\(\(current\) =>/);
});

test("preview zoom cannot feed back into its own measurement", () => {
  const preview = read("app/master-resume/resume-live-preview.tsx");
  const styles = read("app/globals.css");

  // The zoom is derived from the frame's clientWidth, which excludes the
  // scrollbar. Both guards below must stay: a reserved scrollbar gutter so the
  // width never flips, and a no-op guard so any residual delta cannot turn into
  // a render loop that visibly shakes the preview.
  assert.match(preview, /setScale\(\(current\) =>[\s\S]*?Math\.abs\(current - next\) < 0\.001/);

  const frameRule = styles.slice(styles.indexOf(".resume-editor-preview-frame {"));
  assert.match(frameRule.slice(0, frameRule.indexOf("}")), /scrollbar-gutter:\s*stable/);
});

test("add actions sit at the end of each list", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  for (const label of ["+ Add summary", "+ Add position", "+ Add education", "+ Add skill", "+ Add language", "+ Add course"]) {
    assert.equal(editor.includes(label), true, `missing add action: ${label}`);
  }
  assert.equal(editor.includes('className="resume-human-editor__add"'), true);
});
