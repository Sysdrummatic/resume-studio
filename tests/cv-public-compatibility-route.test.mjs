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
  assert.equal(server.includes("fetchCanonicalPublicPathBySlug"), true);
});
