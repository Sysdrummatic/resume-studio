import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("legacy /r/[slug] route behaves as compatibility path and redirects to canonical public url", () => {
  const route = read("app/r/[slug]/page.tsx");
  const server = read("app/lib/resume-server.ts");

  assert.equal(route.includes("permanentRedirect"), true);
  assert.equal(route.includes("fetchCanonicalPublicPathBySlug"), true);
  assert.equal(route.includes("trackLegacyPublicRouteEvent"), true);
  assert.equal(route.includes("outcome: \"redirected\""), true);
  assert.equal(route.includes("outcome: \"resolved_legacy\""), true);
  assert.equal(route.includes("outcome: \"not_found\""), true);
  assert.equal(server.includes("fetchCanonicalPublicPathBySlug"), true);
  assert.equal(server.includes("[public-route-compat]"), true);
});

test("legacy /r/[slug] compatibility route is server-rendered and snapshot-backed", () => {
  const route = read("app/r/[slug]/page.tsx");

  assert.equal(route.includes('export const dynamic = "force-dynamic";'), true);
  assert.equal(route.includes("export async function generateMetadata"), true);
  assert.equal(route.includes("fetchPublishedResumePresetBySlug"), true);
  assert.equal(route.includes("BasicResumeDocument"), true);
  assert.equal(route.includes("status=\"public\""), true);
});
