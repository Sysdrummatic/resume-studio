import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import yaml from "js-yaml";
import { loadDictionaryModules } from "../app/i18n/dictionary-loader.ts";
import {
  buildPublicCvDescription,
  buildPublicCvTitle,
  publicPageMetadata,
  truncateAtWord,
} from "../app/lib/seo-metadata.ts";

const root = process.cwd();
const TITLE_SUFFIX = " | OpenCiVera";
const PAGE_ROUTES = { resume: "/resume", docs: "/docs", login: "/login", privacy: "/privacy", terms: "/terms" };

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function dictionary(locale) {
  const files = yaml.load(read("app/i18n/config.yaml")).dictionary_files;
  return loadDictionaryModules(path.join(root, "app/i18n/locales", locale), files, locale);
}

for (const locale of ["en", "pl"]) {
  test(`[${locale}] default title and descriptions have SEO-friendly lengths`, () => {
    const { meta } = dictionary(locale);
    assert.ok(meta.default_title.length >= 50 && meta.default_title.length <= 60, `default_title ${meta.default_title.length}`);
    assert.match(meta.default_title, locale === "en" ? /free CV builder/i : /darmowy kreator CV/i);
    assert.ok(meta.description.length >= 150 && meta.description.length <= 160, `home description ${meta.description.length}`);

    for (const [key, page] of Object.entries(meta.pages)) {
      assert.ok((page.title + TITLE_SUFFIX).length <= 60, `${key} title too long`);
      assert.ok(page.description.length >= 150 && page.description.length <= 160, `${key} description ${page.description.length}`);
    }
  });

  test(`[${locale}] titles and descriptions are unique across public routes`, () => {
    const { meta } = dictionary(locale);
    const titles = [meta.default_title, ...Object.values(meta.pages).map((page) => page.title + TITLE_SUFFIX)];
    const descriptions = [meta.description, ...Object.values(meta.pages).map((page) => page.description)];
    assert.equal(new Set(titles).size, titles.length);
    assert.equal(new Set(descriptions).size, descriptions.length);
  });
}

test("publicPageMetadata sets index,follow and a relative canonical", () => {
  const meta = publicPageMetadata({ title: "T", description: "D", path: "/login" });
  assert.deepEqual(meta.robots, { index: true, follow: true });
  assert.equal(meta.alternates?.canonical, "/login");
  assert.equal(publicPageMetadata({ description: "D", path: "/" }).title, undefined);
});

test("every public page wires publicPageMetadata with its own canonical path", () => {
  const sources = { home: "app/page.tsx", ...Object.fromEntries(Object.keys(PAGE_ROUTES).map((key) => [key, `app/${key}/page.tsx`])) };
  for (const [key, file] of Object.entries(sources)) {
    const expected = key === "home" ? "/" : PAGE_ROUTES[key];
    assert.match(read(file), new RegExp(`publicPageMetadata\\([^)]*path: "${expected}"`), file);
  }
});

test("login canonical ignores the ?mode= variants", () => {
  const source = read("app/login/page.tsx");
  const metadataFn = source.slice(source.indexOf("generateMetadata"), source.indexOf("function resolveAuthMode"));
  assert.doesNotMatch(metadataFn, /searchParams|mode/);
});

test("layout uses a title template and a keyword default", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /template: "%s \| OpenCiVera"/);
  assert.match(layout, /default: dictionary\.meta\.default_title/);
});

test("pages that get the layout template do not append the brand suffix themselves", () => {
  for (const file of ["app/privacy/page.tsx", "app/terms/page.tsx", "app/docs/page.tsx", "app/resume/page.tsx", "app/login/page.tsx", "app/cv-templates/page.tsx"]) {
    assert.doesNotMatch(read(file), /\| OpenCiVera/, file);
  }
});

test("/cv-templates is noindex,nofollow", () => {
  assert.match(read("app/cv-templates/page.tsx"), /robots: \{ index: false, follow: false \}/);
});

test("public CV title is Name - Role and description comes from the summary at a word boundary", () => {
  assert.equal(buildPublicCvTitle("Jan Kowalski", "Senior Engineer"), "Jan Kowalski - Senior Engineer");
  assert.equal(buildPublicCvTitle("Jan Kowalski", ""), "Jan Kowalski");

  const summary = "Experienced engineer ".repeat(20);
  const description = buildPublicCvDescription(summary, "fallback");
  assert.ok(description.length <= 155);
  assert.ok(description.endsWith("…"));
  assert.ok(description.slice(0, -1).split(" ").every((word) => word === "Experienced" || word === "engineer"));
  assert.equal(buildPublicCvDescription("  ", "Fallback role"), "Fallback role");
  assert.equal(truncateAtWord("short text"), "short text");
});

test("route inventory documents every robots decision", () => {
  const inventory = read("docs/seo/robots-inventory.md");
  for (const route of ["/", "/resume", "/docs", "/login", "/privacy", "/terms", "/cv-templates", "/{personSlug}/{publicId}", "/dashboard"]) {
    assert.ok(inventory.includes(`\`${route}\``), route);
  }
});
