import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { buildLlmsTxt, LLMS_TXT_PATHS } from "../app/lib/llms-txt.ts";

const BASE = "https://example.test";

test("llms.txt defines LiveCV unambiguously", () => {
  const text = buildLlmsTxt(`${BASE}/`);
  assert.match(text, /^# OpenCiVera/);
  assert.match(text, /LiveCV is a published, tailored CV/);
  assert.match(text, /nothing to do with computer vision or the OpenCV/);
});

test("every llms.txt link is absolute, listed and resolves to an existing page", () => {
  const text = buildLlmsTxt(BASE);
  const urls = [...text.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
  assert.equal(urls.length, LLMS_TXT_PATHS.length);
  for (const url of urls) {
    assert.ok(url.startsWith(BASE));
    const route = new URL(url).pathname;
    const dir = route === "/" ? "app" : `app${route}`;
    const exists = ["page.tsx", "page.ts"].some((f) => fs.existsSync(path.join(process.cwd(), dir, f)));
    assert.ok(exists, `${url} has no page`);
  }
  assert.ok(fs.readFileSync("app/page.tsx", "utf8").includes('id="faq"'));
});

test("llms.txt route exists and proxy matcher skips dotted paths", () => {
  assert.ok(fs.existsSync("app/llms.txt/route.ts"));
  assert.ok(fs.readFileSync("proxy.ts", "utf8").includes(".*\\\\."));
});
