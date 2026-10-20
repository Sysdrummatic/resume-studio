import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the CV typeface is served as WOFF2 and preloaded on CV pages", () => {
  assert.match(read("app/globals.css"), /SpaceGrotesk-VariableFont_wght\.woff2"\) format\("woff2-variations"\)/);
  assert.ok(statSync("public/fonts/SpaceGrotesk-VariableFont_wght.woff2").size < 80_000);
  assert.equal(existsSync("public/fonts/SpaceGrotesk-VariableFont_wght.ttf"), false);
  assert.match(read("app/lib/cv-font-preload.ts"), /as: "font", type: "font\/woff2", crossOrigin: "anonymous"/);
  for (const file of ["app/[personSlug]/[publicId]/page.tsx", "app/resume/page.tsx"]) {
    assert.match(read(file), /preloadCvFont\(\);/, file);
  }
});

test("docs screenshots are WebP, referenced as WebP, and lazy-loaded", () => {
  const dir = "content/docs/locales/en/tutorials/publishing-your-first-cv/resources";
  const files = readdirSync(dir);
  assert.ok(files.length > 0 && files.every((name) => name.endsWith(".webp")), "no PNG screenshots remain");
  const total = files.reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
  assert.ok(total < 1_000_000, `screenshots weigh ${total} bytes`);
  assert.match(read("app/lib/docs/markdown.ts"), /loading="lazy" decoding="async"/);
});
