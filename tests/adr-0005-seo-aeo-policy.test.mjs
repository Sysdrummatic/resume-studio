import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0005 is accepted and implementation checklist is complete", () => {
  const adr = read("docs/adr/0005-seo-aeo-structured-data-policy.md");
  assert.equal(adr.includes("Status: Accepted"), true);
  assert.equal(adr.includes("- [x] Define final robots policy matrix for active/revoked/missing links."), true);
  assert.equal(adr.includes("- [x] Define canonical and hreflang generation contract."), true);
  assert.equal(adr.includes("- [x] Implement sitemap inclusion rules for indexable links only."), true);
  assert.equal(adr.includes("- [x] Define JSON-LD payload scope for public CV pages."), true);
  assert.equal(adr.includes("- [x] Add SEO/AEO contract tests and preview QA checklist."), true);
});

test("SEO/AEO runtime exports robots and sitemap routes", () => {
  const robots = read("app/robots.ts");
  const sitemap = read("app/sitemap.ts");
  const server = read("app/lib/resume-server.ts");
  assert.equal(robots.includes("MetadataRoute.Robots"), true);
  assert.equal(robots.includes("sitemap"), true);
  assert.equal(sitemap.includes("MetadataRoute.Sitemap"), true);
  assert.equal(sitemap.includes("fetchIndexablePublicLinksForSitemap"), true);
  assert.equal(server.includes("allow_indexing=eq.true"), true);
});

test("SEO/AEO QA checklist exists", () => {
  const guide = read("docs/guides/seo-aeo-preview-qa-checklist.md");
  assert.equal(guide.includes("Metadata Contract"), true);
  assert.equal(guide.includes("Sitemap Contract"), true);
  assert.equal(guide.includes("Structured Data Contract"), true);
});
