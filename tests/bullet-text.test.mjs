import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { stripBulletMarker, parseBulletLines, splitTextBlocks, continueBulletList } = await import("../app/lib/bullet-text.ts");
const { normalizeResumeDocument, defaultResumeDocument } = await import("../app/lib/resume-schema.ts");
const { default: BulletText } = await import("../app/components/resume-renderer/BulletText.tsx");
const { convertResumeToPlainText } = await import("../app/lib/resume-export.ts");

test("stripBulletMarker removes a marker but leaves dashes that belong to the text", () => {
  assert.equal(stripBulletMarker("- Led a team"), "Led a team");
  assert.equal(stripBulletMarker("  • Led a team"), "Led a team");
  assert.equal(stripBulletMarker("*  Led"), "Led");
  assert.equal(stripBulletMarker("-"), "");
  assert.equal(stripBulletMarker("-5% cost"), "-5% cost");
  assert.equal(stripBulletMarker("*.ts files"), "*.ts files");
});

test("parseBulletLines gives one clean item per non-empty line", () => {
  assert.deepEqual(parseBulletLines("- one\n\n- two\n-\nthree"), ["one", "two", "three"]);
});

test("splitTextBlocks leaves prose alone and groups consecutive bullets", () => {
  assert.deepEqual(splitTextBlocks("Just prose.\nSecond line."), [{ kind: "paragraph", text: "Just prose.\nSecond line." }]);
  assert.deepEqual(splitTextBlocks("Intro\n- a\n- b\nOutro"), [
    { kind: "paragraph", text: "Intro" },
    { kind: "list", items: ["a", "b"] },
    { kind: "paragraph", text: "Outro" },
  ]);
});

test("continueBulletList starts the next bullet, ends the list on an empty one, ignores prose", () => {
  assert.deepEqual(continueBulletList("- one", 5, 5), { value: "- one\n- ", caret: 8 });
  assert.deepEqual(continueBulletList("- one\n- two\n- three", 11, 11), { value: "- one\n- two\n- \n- three", caret: 14 });
  assert.deepEqual(continueBulletList("- one\n- ", 8, 8), { value: "- one\n", caret: 6 });
  assert.equal(continueBulletList("plain text", 10, 10), null);
});

test("highlights typed with a dash are stored without it, so the render draws one marker", () => {
  const doc = normalizeResumeDocument(
    { experience: [{ company: "Acme", highlights: ["- Led a team", "• Shipped", "-5% cost", "-"] }] },
    "Jane Doe",
  );
  assert.deepEqual(doc.experience[0].highlights, ["Led a team", "Shipped", "-5% cost"]);
});

test("BulletText renders bullet lines as an item-list and keeps prose as one paragraph", () => {
  const prose = renderToStaticMarkup(createElement(BulletText, { className: "summary-text", text: "Plain summary." }));
  assert.equal(prose, '<p class="summary-text">Plain summary.</p>');

  const mixed = renderToStaticMarkup(createElement(BulletText, { className: "timeline-item__detail", text: "Thesis on X\n- Grade A\n- Honours" }));
  assert.match(mixed, /^<div class="timeline-item__detail bullet-text"><p>Thesis on X<\/p><ul class="item-list"><li>Grade A<\/li><li>Honours<\/li><\/ul><\/div>$/);
});

test("ATS text keeps summary bullets on their own lines", () => {
  const doc = defaultResumeDocument("Jane Doe");
  doc.summary = [{ position: "Default", description: "Engineer.\n- Built X\n- Ran Y", default: true }];
  const text = convertResumeToPlainText(doc);
  assert.match(text, /Engineer\.\n- Built X\n- Ran Y/);
});
