import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("revision content route is auth-gated, validated, and RLS-scoped to the caller", () => {
  const route = read("app/api/resume/revisions/route.ts");
  const server = read("app/lib/resume-server.ts");

  assert.equal(route.includes('requireRequestActor({ anyCapability: "resume.document.read_own" })'), true);
  assert.equal(route.includes("fetchResumeRevisionYaml"), true);
  assert.equal(route.includes("revisionNumber must be a positive integer."), true);
  assert.equal(route.includes('{ status: 404 }'), true);

  // The read must go through the caller's own token so the
  // resume_revisions_select_owner RLS policy applies; a service-role read here
  // would expose any user's revision by id.
  assert.equal(server.includes("export async function fetchResumeRevisionYaml"), true);

  const snapshotRead = server.slice(server.indexOf("export async function fetchResumeRevisionYaml"));
  const snapshotBody = snapshotRead.slice(0, snapshotRead.indexOf("\n}") + 2);
  assert.match(snapshotBody, /table:\s*"resume_revisions"/);
  assert.match(snapshotBody, /select:\s*"yaml_content"/);
  assert.equal(snapshotBody.includes("useServiceRole"), false);
  assert.equal(snapshotBody.includes("accessToken"), true);
});

test("revision list yaml_content stays out of the document payload", () => {
  const server = read("app/lib/resume-server.ts");

  // fetchRevisions backs the history list (up to 40 rows); embedding each
  // snapshot's YAML there would bloat every document load.
  const listSelect = server.slice(server.indexOf("async function fetchRevisions"));
  assert.equal(listSelect.slice(0, 400).includes("yaml_content"), false);
});

test("editor previews a revision without touching the active buffer", () => {
  const hook = read("app/master-resume/use-multi-locale-resume-documents.ts");
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(hook.includes("const loadRevisionSnapshot = useCallback"), true);
  assert.equal(hook.includes("/api/resume/revisions?"), true);
  assert.equal(hook.includes("loadRevisionSnapshot,"), true);
  // Preview must not write to the buffer — only rollback changes the document.
  const snapshotFn = hook.slice(hook.indexOf("const loadRevisionSnapshot"), hook.indexOf("const saveLanguageVersion"));
  assert.equal(snapshotFn.includes("patchBuffer"), false);
  assert.equal(snapshotFn.includes("setBuffers"), false);

  assert.equal(editor.includes("previewedRevision"), true);
  assert.equal(editor.includes("async function previewRevision"), true);
  assert.equal(editor.includes("resume-editor-revision-ribbon"), true);
  assert.equal(editor.includes("previewedRevision ? previewedRevision.resume : resume"), true);
  assert.equal(editor.includes("previewedRevision ? previewedRevision.yamlContent : yamlPanel"), true);
});

test("previewing a revision is cleared by locale switch and by rollback", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  const localeSwitch = editor.slice(editor.indexOf("function handleLocaleSwitch"), editor.indexOf("function handleSectionNavSelect"));
  assert.equal(localeSwitch.includes("setPreviewedRevision(null)"), true);

  const rollback = editor.slice(editor.indexOf("async function rollbackToRevision"), editor.indexOf("async function previewRevision"));
  assert.equal(rollback.includes("setPreviewedRevision(null)"), true);
});

test("current revision offers no preview or rollback action", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(editor.includes("const isCurrent = index === 0;"), true);
  assert.equal(editor.includes("{isCurrent ? null : ("), true);
  assert.equal(editor.includes("revision-list__tag"), true);
});
