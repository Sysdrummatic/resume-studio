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
