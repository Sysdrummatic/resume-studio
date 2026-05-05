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

test("phase D client includes draft, YAML import/export and revision rollback actions", () => {
  const source = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(source.includes("saveDraft"), true);
  assert.equal(source.includes("restoreDraft"), true);
  assert.equal(source.includes("Import YAML to form"), true);
  assert.equal(source.includes("Export YAML file"), true);
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

test("phase D client keeps draft-restored YAML in panel and preserves publish status", () => {
  const source = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(source.includes("nextYamlPanel = draftPayload.yamlContent"), true);
  assert.equal(source.includes("setYamlPanel(nextYamlPanel)"), true);
  assert.equal(source.includes("clearDraft({ skipStatusUpdate: true })"), true);
});

test("phase D server rejects publish/rollback success when RPC calls fail", () => {
  const source = read("app/lib/resume-server.ts");

  assert.equal(source.includes("const revisionResult = await callRpc<number>"), true);
  assert.equal(source.includes("if (revisionResult.error || !revisionResult.data)"), true);
  assert.equal(source.includes("const rollbackResult = await callRpc<string>"), true);
  assert.equal(source.includes("if (rollbackResult.error || !rollbackResult.data)"), true);
});
