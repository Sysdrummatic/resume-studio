import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function read(filePath) {
  return fs.readFileSync(path.join(ROOT, filePath), "utf8");
}

test("PR3 public route by person slug and public id resolves via Public Link source of truth", () => {
  const route = read("app/[personSlug]/[publicId]/page.tsx");
  assert.equal(route.includes("fetchPublishedResumePresetByPublicLink"), true);
  assert.equal(route.includes("alternates"), true);
  assert.equal(route.includes("canonical"), true);
  assert.equal(route.includes("languages"), true);
  assert.equal(route.includes("robots"), true);
});

test("public route JSON-LD uses the context-safe serializer, not raw JSON.stringify, in dangerouslySetInnerHTML", () => {
  const route = read("app/[personSlug]/[publicId]/page.tsx");
  assert.equal(route.includes("safeJsonLdScript"), true);
  assert.equal(/__html:\s*JSON\.stringify/.test(route), false);
});

test("resume server exposes resolver for canonical public person-slug/public-id URLs", () => {
  const server = read("app/lib/resume-server.ts");
  assert.equal(server.includes("fetchPublishedResumePresetByPublicLink"), true);
  assert.equal(server.includes("fetchActivePublicLinkByPersonAndPublicId"), true);
  assert.equal(server.includes("buildCanonicalPublicLanguageHref"), true);
});
