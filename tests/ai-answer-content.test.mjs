import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { getDoc, listDocs } from "../app/lib/docs/content.ts";

// SEO plan T18: explainer pages that answer category questions directly (AEO/GEO).
const SLUGS = ["what-is-a-livecv", "one-master-cv-many-versions", "cv-as-code-yaml", "opencivera-vs-other-cv-tools"];
const LOCALES = ["en", "pl"];

for (const locale of LOCALES) {
  for (const slug of SLUGS) {
    test(`${locale}/${slug} is a public tutorial with a direct answer first`, () => {
      const doc = getDoc("tutorials", slug, locale);
      assert.ok(doc, "page exists");
      assert.equal(doc.locale, locale);
      assert.equal(doc.isPublic, true);
      assert.ok(doc.title.length >= 20 && doc.title.length <= 75, `title length ${doc.title.length}`);
      assert.ok(doc.description.length >= 80 && doc.description.length <= 200, `description length ${doc.description.length}`);
      // The first paragraph after the H1 is a bold, self-contained answer.
      const firstParagraph = doc.markdown.split("\n").find((line) => line.trim() && !line.startsWith("#"));
      assert.match(firstParagraph, /^\*\*.+\*\*/);
      assert.match(doc.markdown, /LiveCV/);
    });

    test(`${locale}/${slug} links only to existing tutorials`, () => {
      const doc = getDoc("tutorials", slug, locale);
      for (const [, target] of doc.markdown.matchAll(/\]\(\/docs\/tutorials\/([a-z0-9-]+)\)/g)) {
        assert.ok(getDoc("tutorials", target, locale), `${target} does not exist`);
      }
    });
  }
}

test("titles are unique across the public tutorials of a locale", () => {
  for (const locale of LOCALES) {
    const titles = listDocs("tutorials", locale).map((doc) => doc.title);
    assert.equal(new Set(titles).size, titles.length, `duplicate title in ${locale}`);
  }
});

test("the pages disambiguate LiveCV from OpenCV and are explicit that OpenCiVera is a CV builder", () => {
  assert.match(getDoc("tutorials", "what-is-a-livecv", "en").markdown, /nothing to do with computer vision or the OpenCV/);
  assert.match(getDoc("tutorials", "what-is-a-livecv", "pl").markdown, /nie ma nic wspólnego z computer vision ani biblioteką OpenCV/);
  assert.match(getDoc("tutorials", "what-is-a-livecv", "en").markdown, /CV builder/);
});

test("the external presence plan has dated actions", () => {
  assert.ok(existsSync("docs/seo/external-presence-plan.md"));
  const plan = readFileSync("docs/seo/external-presence-plan.md", "utf8");
  assert.ok((plan.match(/\d{4}-\d{2}-\d{2}/g) ?? []).length >= 6);
});
