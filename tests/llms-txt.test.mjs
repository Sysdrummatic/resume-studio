import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { buildLlmsFullTxt, buildLlmsTxt, LLMS_TXT_PATHS } from "../app/lib/llms-txt.ts";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

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
    const exists = ["page.tsx", "page.ts", "route.ts"].some((f) => fs.existsSync(path.join(process.cwd(), dir, f)));
    assert.ok(exists, `${url} has no page`);
  }
  assert.ok(fs.readFileSync("app/page.tsx", "utf8").includes('id="faq"'));
});

test("llms.txt route exists and proxy matcher skips dotted paths", () => {
  assert.ok(fs.existsSync("app/llms.txt/route.ts"));
  assert.ok(fs.readFileSync("proxy.ts", "utf8").includes(".*\\\\."));
});

test("llms-full.txt carries every FAQ question and feature of every enabled locale", () => {
  const config = yaml.load(fs.readFileSync("app/i18n/config.yaml", "utf8"));
  const locales = config.locales
    .filter((entry) => entry.enabled)
    .map(({ code, name }) => ({ code, name, landing: readAppDictionary(code).landing }));
  assert.ok(locales.length >= 2);
  const text = buildLlmsFullTxt(locales);
  for (const { code, name, landing } of locales) {
    assert.ok(text.includes(`## ${name} (${code})`));
    for (const { question, answer } of landing.faq.items) {
      assert.ok(text.includes(`**${question}**\n${answer}`), `${code}: missing "${question}"`);
    }
    for (const { title } of landing.features.items) {
      assert.ok(text.includes(`**${title}**`), `${code}: missing feature "${title}"`);
    }
  }
  assert.ok(fs.existsSync("app/llms-full.txt/route.ts"));
});
