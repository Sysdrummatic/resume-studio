import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import yaml from "js-yaml";
import { register } from "node:module";
register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { listDocNavGroups, getDoc } = await import("../app/lib/docs/content.ts");
const { renderMarkdownWithOutline } = await import("../app/lib/docs/markdown.ts");
const { canViewTestScenarios } = await import("../app/lib/docs/access.ts");
const { buildDocsTopics, filterDocs, docsHref } =
  await import("../app/lib/docs/presentation.ts");
const dictionaries = ["en", "pl"].map((locale) => yaml.load(fs.readFileSync(`app/i18n/locales/${locale}.yaml`, "utf8")));

test("topic cards resolve to existing tutorials and heading anchors in both languages", () => {
  for (const dictionary of dictionaries) {
    const topics = buildDocsTopics(listDocNavGroups(false), dictionary.docs);
    assert.equal(topics.length, 3);
    for (const topic of topics) {
      const url = new URL(topic.href, "https://example.test");
      const [, , category, slug] = url.pathname.split("/");
      const doc = getDoc(category, slug);
      assert.ok(doc);
      assert.ok(
        renderMarkdownWithOutline(doc.markdown).headings.some((h) => `#${h.slug}` === url.hash)
      );
    }
  }
  assert.deepEqual(buildDocsTopics([], dictionaries[0].docs), []);
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
