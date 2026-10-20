import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  absoluteOgImageUrl,
  buildCvOgContent,
  cvOgImagePath,
  OG_IMAGE_SIZE,
} from "../app/lib/og-image.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("og:image URLs are absolute for the configured base URL", () => {
  assert.equal(
    absoluteOgImageUrl("https://opencivera.example/", cvOgImagePath("/jan-kowalski/ab12")),
    "https://opencivera.example/jan-kowalski/ab12/opengraph-image",
  );
});

test("OG image is 1200x630", () => {
  assert.deepEqual({ ...OG_IMAGE_SIZE }, { width: 1200, height: 630 });
});

test("CV OG content carries only name and role", () => {
  const content = buildCvOgContent({ allowIndexing: true, name: "  Jan   Kowalski ", role: "Engineer", email: "x@y.z" });
  assert.deepEqual(content, { name: "Jan Kowalski", role: "Engineer" });
});

test("CV OG content is withheld for links hidden from search and for empty names", () => {
  assert.equal(buildCvOgContent({ allowIndexing: false, name: "Jan", role: "Engineer" }), null);
  assert.equal(buildCvOgContent({ allowIndexing: true, name: "  ", role: "Engineer" }), null);
});

test("CV OG content is length-capped", () => {
  const content = buildCvOgContent({ allowIndexing: true, name: "A".repeat(500), role: "B".repeat(500) });
  assert.ok(content.name.length <= 80);
  assert.ok(content.role.length <= 120);
});

test("landing exposes og and twitter images and layout sets metadataBase from the app base URL", () => {
  assert.equal(fs.existsSync("app/opengraph-image.tsx"), true);
  assert.equal(fs.existsSync("app/twitter-image.tsx"), true);
  const layout = read("app/layout.tsx");
  assert.match(layout, /metadataBase: new URL\(getAppBaseUrl\(\)\)/);
});

test("public CV metadata emits absolute og:image and summary_large_image", () => {
  const route = read("app/[personSlug]/[publicId]/page.tsx");
  assert.match(route, /absoluteOgImageUrl\(getAppBaseUrl\(\), cvOgImagePath\(canonicalPath\)\)/);
  assert.match(route, /images: \[ogImage\]/);
  assert.match(route, /card: "summary_large_image"/);
  assert.match(route, /images: \[ogImage\.url\]/);
});

test("CV OG image route uses only the published resolver and the selection-safe builder", () => {
  const image = read("app/[personSlug]/[publicId]/opengraph-image.tsx");
  assert.match(image, /getPublishedRoute/);
  assert.match(image, /notFound\(\)/);
  assert.match(image, /buildCvOgContent/);
  assert.equal(image.includes("fetchResumeDocumentsForUser"), false);
  assert.equal(image.includes("useServiceRole"), false);
});
