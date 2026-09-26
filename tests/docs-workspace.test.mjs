import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "js-yaml";
import { register } from "node:module";
register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { listDocNavGroups, getDoc } = await import("../app/lib/docs/content.ts");
const { renderMarkdownWithOutline } = await import("../app/lib/docs/markdown.ts");
const { canViewTestScenarios } = await import("../app/lib/docs/access.ts");
const { buildDocsTopics, buildDocsSections, filterDocs, docsHref } =
  await import("../app/lib/docs/presentation.ts");
const dictionaries = ["en", "pl"].map((locale) =>
  yaml.load(fs.readFileSync(`app/i18n/locales/${locale}.yaml`, "utf8"))
);

test("workflow steps resolve to current tutorial routes in both languages", () => {
  const topicSlugs = [
    "master-resume-basics",
    "create-cv-version",
    "publish-and-share-cv",
    "export-pdf-and-ats"
  ];
  for (const [index, dictionary] of dictionaries.entries()) {
    const locale = index === 0 ? "en" : "pl";
    const topics = buildDocsTopics(listDocNavGroups(false, locale), dictionary.docs);
    assert.equal(topics.length, 4);
    for (const [topicIndex, topic] of topics.entries()) {
      const url = new URL(topic.href, "https://example.test");
      const [, , category, slug] = url.pathname.split("/");
      const doc = getDoc(category, slug, locale);
      assert.ok(doc);
      assert.equal(slug, topicSlugs[topicIndex]);
      assert.equal(url.hash, "");
      assert.equal(renderMarkdownWithOutline(doc.markdown).headings.length > 0, true);
    }
  }
  assert.deepEqual(buildDocsTopics([], dictionaries[0].docs), []);
});

test("tutorial workflow links resolve to existing articles in each locale", () => {
  for (const locale of ["en", "pl"]) {
    for (const item of listDocNavGroups(false, locale).flatMap((group) => group.items)) {
      const slug = item.href.split("/").at(-1);
      const doc = getDoc("tutorials", slug, locale);
      for (const match of doc.markdown.matchAll(/\]\(\/docs\/(tutorials|test-scenarios)\/([^\s)#]+)(?:#[^)]*)?\)/g)) {
        assert.ok(getDoc(match[1], match[2], locale), `${locale}: ${slug} links to ${match[2]}`);
      }
    }
  }
});

test("workflow and supporting sections expose each authorized article exactly once", () => {
  for (const [index, dictionary] of dictionaries.entries()) {
    for (const eligible of [false, true]) {
      const groups = listDocNavGroups(eligible, index === 0 ? "en" : "pl");
      const sections = buildDocsSections(groups, dictionary.docs);
      const links = sections.flatMap((section) => section.items.map((item) => item.href));
      assert.equal(links.length, new Set(links).size);
      assert.deepEqual(
        [...links].sort(),
        groups.flatMap((group) => group.items.map((item) => item.href)).sort()
      );
      assert.equal(sections.find((section) => section.key === "workflow").items.length, 4);
      assert.equal(
        sections.some((section) => section.key === "test-scenarios"),
        eligible
      );
    }
  }
  assert.deepEqual(buildDocsSections([], dictionaries[0].docs), []);
});

test("search handles whitespace, case and accents without changing order or input", () => {
  const entries = [
    { title: "Wersje językowe", description: "Polski i English", href: "/one" },
    { title: "CV", description: "Publishing", href: "/two" }
  ];
  assert.deepEqual(filterDocs(entries, "  JEZYKOWE "), [entries[0]]);
  assert.deepEqual(filterDocs(entries, "publISH"), [entries[1]]);
  assert.deepEqual(filterDocs(entries, " "), entries);
  assert.deepEqual(filterDocs(entries, "no match"), []);
  assert.equal(entries.length, 2);
});

test("documentation links preserve article anchors without a separate locale query", () => {
  assert.equal(docsHref("/docs/tutorials/example#steps"), "/docs/tutorials/example#steps");
});

test("search and navigation contain test scenarios only for the existing four-role access matrix", async () => {
  for (const role of ["admin", "manager", "user", "recruiter"]) {
    for (const isTestUser of [false, true])
      for (const flag of [false, true]) {
        const visible = await canViewTestScenarios({ role, isTestUser }, async () => flag);
        const entries = listDocNavGroups(visible).flatMap((group) => group.items);
        const result = filterDocs(entries, "sign-up");
        assert.equal(
          result.some((entry) => entry.href.includes("test-scenarios")),
          role === "admin" || (isTestUser && flag)
        );
      }
  }
});
