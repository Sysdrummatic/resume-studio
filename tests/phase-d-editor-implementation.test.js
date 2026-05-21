const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("phase D editor page loads canvas client and YAML runtime", () => {
  const source = read("app/master-resume/page.tsx");
  assert.equal(source.includes("EditorCanvasClient"), true);
  assert.equal(source.includes('/vendor/js-yaml.min.js'), true);
});

test("phase D API endpoints exist for document load, publish and rollback", () => {
  const documentRoute = read("app/api/resume/document/route.ts");
  const publishRoute = read("app/api/resume/publish/route.ts");
  const rollbackRoute = read("app/api/resume/rollback/route.ts");

  assert.equal(documentRoute.includes("ensureResumeDocument"), true);
  assert.equal(publishRoute.includes("publishResumeDocument"), true);
  assert.equal(rollbackRoute.includes("rollbackResumeDocument"), true);
});

test("phase D client includes YAML export, publish and revision rollback actions", () => {
  const source = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(source.includes("exportYamlFile"), true);
  assert.equal(source.includes("Download YAML"), true);
  assert.equal(source.includes("publishResume"), true);
  assert.equal(source.includes("rollbackToRevision"), true);
});

test("phase D client exposes YAML and human-friendly editor tabs backed by one resume state", () => {
  const source = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(source.includes('type EditorTab = "yaml" | "human";'), true);
  assert.equal(source.includes("Human-friendly Editor"), true);
  assert.equal(source.includes("YAML Editor"), true);
  assert.equal(source.includes("updateResumeFromHuman"), true);
  assert.equal(source.includes("addArrayItem"), true);
  assert.equal(source.includes("removeArrayItem"), true);
});

test("phase D client supports summary list defaults in HFE and preview", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const preview = read("app/master-resume/resume-live-preview.tsx");
  const basicResume = read("app/components/resume-renderer/BasicResumeDocument.tsx");
  const renderer = read("app/components/resume-renderer/ResumeRenderer.tsx");
  const schema = read("app/lib/resume-schema.ts");
  const template = read("public/data/private/resume-en-template.yaml");

  assert.equal(schema.includes("export type ResumeSummaryItem"), true);
  assert.equal(schema.includes("getDefaultSummary"), true);
  assert.equal(template.includes("summary:"), true);
  assert.equal(template.includes("position:"), true);
  assert.equal(template.includes("default: true"), true);
  assert.equal(editor.includes("updateSummary"), true);
  assert.equal(editor.includes("setDefaultSummary"), true);
  assert.equal(basicResume.includes("ResumeRenderer"), true);
  assert.equal(basicResume.includes("allowDraftPdf?: boolean;"), true);
  assert.equal(editor.includes("allowDraftPdf=") && editor.includes("canAccessDraftPdf"), true);
  assert.equal(renderer.includes("getDefaultSummary(resume.summary)"), true);
});

test("phase D client migrates legacy YAML summary while loading editor drafts", () => {
  const source = read("app/master-resume/editor-canvas-client.tsx");
  const schema = read("app/lib/resume-schema.ts");

  assert.equal(source.includes("normalizeYamlForEditor"), true);
  assert.equal(source.includes("Legacy summary migrated to list format."), true);
  assert.equal(schema.includes("row.default"), true);
});

test("phase D client keeps loaded YAML in panel and preserves publish status", () => {
  const source = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(source.includes("let nextYamlPanel = payload.document?.yaml_content ||"), true);
  assert.equal(source.includes("setYamlPanel(nextYamlPanel)"), true);
  assert.equal(source.includes("setAllowIndexing(payload.document.allow_indexing)"), true);
  assert.equal(source.includes("setAiGenerated(payload.document.ai_generated)"), true);
});

test("phase D server rejects publish/rollback success when RPC calls fail", () => {
  const source = read("app/lib/resume-server.ts");

  assert.equal(source.includes("const revisionResult = await callRpc<number>"), true);
  assert.equal(source.includes("if (revisionResult.error || !revisionResult.data)"), true);
  assert.equal(source.includes("const rollbackResult = await callRpc<string>"), true);
  assert.equal(source.includes("if (rollbackResult.error || !rollbackResult.data)"), true);
});
