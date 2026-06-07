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
  const previewRoute = read("app/api/resume/export/pdf/preview/route.ts");
  const pdfDocument = read("app/lib/CvPdfTemplate.tsx");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("\"Content-Type\": \"application/pdf\""), true);
  assert.equal(route.includes("personSlug and publicId are required"), true);
  assert.equal(route.includes("renderToBuffer"), true);
  assert.equal(route.includes("locale: exportData.locale"), true);
  assert.equal(previewRoute.includes('requireRequestActor(["admin"])'), true);
  assert.equal(pdfDocument.includes("from \"@react-pdf/renderer\""), true);
  assert.equal(pdfDocument.includes("export const CvPdfTemplate"), true);
  assert.equal(pdfDocument.includes("buildResumeRendererLabels"), true);
  assert.equal(pdfDocument.includes("getResumeHeroRole"), true);
});

test("public export helper keeps canonical person slug and public id parsing local to the snapshot path", () => {
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("export function parseCanonicalPublicPath"), true);
  assert.equal(exportLib.includes("export function buildPublishedResumeExportUrls"), true);
  assert.equal(exportLib.includes("publicId"), true);
  assert.equal(exportLib.includes("personSlug"), true);
});

test("export helper exposes ats yaml and cvac urls", () => {
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("export function convertResumeToAtsYaml"), true);
  assert.equal(exportLib.includes("yamlUrl:"), true);
  assert.equal(exportLib.includes("cvacUrl:"), true);
  assert.equal(exportLib.includes("/api/resume/export/yaml"), true);
  assert.equal(exportLib.includes("/api/resume/export/cvac"), true);
});

test("plain text export drops non-ats decorations and uses clean section labels", () => {
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("--- "), false);
  assert.equal(exportLib.includes("/5)"), false);
  assert.equal(exportLib.includes("WORK EXPERIENCE"), true);
  assert.equal(exportLib.includes("CERTIFICATIONS"), true);
  assert.equal(/lines\.push\(`\(\$\{doc\.brand_initials\}\)`\)/.test(exportLib), false);
});

test("ats yaml export route is snapshot-only, rate limited, and returns text/yaml", () => {
  const route = read("app/api/resume/export/yaml/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("convertResumeToAtsYaml"), true);
  assert.equal(route.includes("rateLimit"), true);
  assert.equal(route.includes("\"Content-Type\": \"text/yaml; charset=utf-8\""), true);
  assert.equal(route.includes("personSlug and publicId are required"), true);
});

test("cvac export route returns raw published yaml untransformed and is rate limited", () => {
  const route = read("app/api/resume/export/cvac/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("exportData.yamlContent"), true);
  assert.equal(route.includes("normalizeResumeDocument"), false);
  assert.equal(route.includes("rateLimit"), true);
  assert.equal(route.includes("\"Content-Type\": \"text/yaml; charset=utf-8\""), true);
});
