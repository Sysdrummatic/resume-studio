import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("text export route is snapshot-only and rejects preset fallback", () => {
  const route = read("app/api/resume/export/text/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("fetchResumeExportByPresetId"), false);
  assert.equal(route.includes("personSlug and publicId are required"), true);
  assert.equal(route.includes("presetId"), false);
});

test("pdf export route is snapshot-only and returns application/pdf", () => {
  const route = read("app/api/resume/export/pdf/route.ts");
  const pdfDocument = read("app/lib/CvPdfTemplate.tsx");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("\"Content-Type\": \"application/pdf\""), true);
  assert.equal(route.includes("personSlug and publicId are required"), true);
  assert.equal(route.includes("renderToBuffer"), true);
  assert.equal(pdfDocument.includes("from \"@react-pdf/renderer\""), true);
  assert.equal(pdfDocument.includes("export const CvPdfTemplate"), true);
});

test("public export helper keeps canonical person slug and public id parsing local to the snapshot path", () => {
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("export function parseCanonicalPublicPath"), true);
  assert.equal(exportLib.includes("export function buildPublishedResumeExportUrls"), true);
  assert.equal(exportLib.includes("publicId"), true);
  assert.equal(exportLib.includes("personSlug"), true);
});
