import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { isPageFooterLine } = await import("../app/lib/resume-import/text-blocks.ts");

// pdf-parse/mammoth concatenate every page's text with no page-break marker,
// so a page footer can land between any two sections of a multi-page CV —
// see extract-text.ts, which strips a matching whole line wherever it falls.
test("recognises common page-footer shapes", () => {
  assert.equal(isPageFooterLine("Page 1 of 2"), true);
  assert.equal(isPageFooterLine("-- 2 of 2 --"), true);
  assert.equal(isPageFooterLine("1 of 2"), true);
  assert.equal(isPageFooterLine("1/2"), true);
  assert.equal(isPageFooterLine("  page 3 of 10  "), true);
});

test("does not flag a bare number alone — some CVs use one as real content", () => {
  assert.equal(isPageFooterLine("1"), false);
  assert.equal(isPageFooterLine("2020"), false);
  assert.equal(isPageFooterLine("-- 2020 --"), false);
});

test("does not flag ordinary content that happens to contain digits", () => {
  assert.equal(isPageFooterLine("Excel 2021"), false);
  assert.equal(isPageFooterLine("2020 - Present"), false);
  assert.equal(isPageFooterLine("iOS 17"), false);
});
