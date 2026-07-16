import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0008 is accepted and checklist is complete", () => {
  const adr = read("docs/adr/0008-opencv-public-api-and-export-surface.md");
  assert.equal(adr.includes("Status: Accepted"), true);
  assert.equal(adr.includes("- [x] Define public export/API endpoint surface and versioning."), true);
  assert.equal(adr.includes("- [x] Ensure export reads only Published CV snapshots."), true);
  assert.equal(adr.includes("- [x] Define locale selection and fallback behavior for export."), true);
  assert.equal(adr.includes("- [x] Add rate limiting, caching, and abuse protections."), true);
  assert.equal(adr.includes("- [x] Add contract tests for backward compatibility and access control."), true);
});

test("public OpenCV export route uses snapshot-only resolver and contract headers", () => {
  const route = read("app/api/public/opencv/v1/[personSlug]/[publicId]/route.ts");
  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("X-OpenCV-Contract-Version"), true);
  assert.equal(route.includes("X-OpenCV-Schema-Version"), true);
  assert.equal(route.includes("X-OpenCV-Locale"), true);
  assert.equal(route.includes("format") && route.includes("yaml") && route.includes("json"), true);
  assert.equal(route.includes("Cache-Control"), true);
  assert.equal(route.includes("no-store"), true);
});

test("resume server exposes public export resolver with locale fallback", () => {
  const server = read("app/lib/resume-server.ts");
  assert.equal(server.includes("export async function fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(server.includes("fetchActivePublicLinkByPersonAndPublicId"), true);
  assert.equal(server.includes("allowedLocales"), true);
  assert.equal(server.includes("activeLocaleRow"), true);
});

test("public export resolver never serves unselected master content (ADR 0008: master data is never exposed)", () => {
  const server = read("app/lib/resume-server.ts");
  assert.equal(server.includes("yamlContent: activeLocaleRow.yaml_content"), false);
  assert.equal(server.includes("buildPublishedExportContent"), true);

  const publishedExport = read("app/lib/published-export.ts");
  assert.equal(publishedExport.includes("export function buildPublishedExportContent"), true);
  assert.equal(publishedExport.includes("applyResumeSelectionToRawDocument"), true);
});
