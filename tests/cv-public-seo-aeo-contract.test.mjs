import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("canonical public route emits SEO/AEO metadata contract", () => {
  const route = read("app/[personSlug]/[publicId]/page.tsx");

  assert.equal(route.includes("robots"), true);
  assert.equal(route.includes("alternates"), true);
  assert.equal(route.includes("canonical"), true);
  assert.equal(route.includes("languages"), true);
  assert.equal(route.includes("openGraph"), true);
  assert.equal(route.includes("index: false"), true);
  assert.equal(route.includes("follow: false"), true);
  assert.equal(route.includes("index: allowIndexing"), true);
  assert.equal(route.includes("follow: allowIndexing"), true);
  assert.equal(route.includes("application/ld+json"), true);
  assert.equal(route.includes("\"@type\": \"ProfilePage\""), true);
  assert.equal(route.includes("buildPublicResumeJsonLd"), true);
  assert.equal(route.includes("mainEntityOfPage"), true);
  assert.equal(route.includes("allowIndexing ? ("), true);
  assert.equal(route.includes("private"), false);
  assert.equal(route.includes("draft"), false);
  assert.equal(route.includes("admin"), false);
});

