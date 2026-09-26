import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { normalizeResumeDocument, getDefaultSummary, singleDefaultSummaryInRawYaml, hasMultipleDefaultSummaries } =
  await import("../app/lib/resume-schema.ts");
const { upgradeLegacyResumeYamlContent } = await import("../app/lib/resume-server.ts");
const { default: yaml } = await import("js-yaml");

const twoDefaults = [
  { position: "Technical Writer", description: "A", default: true },
  { position: "Founder", description: "B", default: true },
  { position: "PLM", description: "C", default: false },
];

test("normalization keeps the first default only, so the summary never disappears", () => {
  const doc = normalizeResumeDocument({ first_name: "Jane", summary: twoDefaults }, "Jane");
  assert.deepEqual(doc.summary.map((item) => item.default), [true, false, false]);
  assert.equal(getDefaultSummary(doc.summary)?.position, "Technical Writer");
});

test("string booleans count as defaults too", () => {
  const doc = normalizeResumeDocument({ summary: [{ description: "A", default: "true" }, { description: "B", default: "TRUE" }] });
  assert.deepEqual(doc.summary.map((item) => item.default), [true, false]);
});

test("raw repair keeps the first default, preserves unknown fields, and is a no-op when already valid", () => {
  const fixed = singleDefaultSummaryInRawYaml({ extension: 1, summary: [{ ...twoDefaults[0], extra: "x" }, twoDefaults[1]] });
  assert.deepEqual(fixed.summary.map((item) => item.default), [true, false]);
  assert.equal(fixed.summary[0].extra, "x");
  assert.equal(fixed.extension, 1);

  const valid = { summary: [twoDefaults[0], twoDefaults[2]] };
  assert.equal(singleDefaultSummaryInRawYaml(valid), valid);
});

test("hasMultipleDefaultSummaries only flags more than one", () => {
  assert.equal(hasMultipleDefaultSummaries({ summary: twoDefaults }), true);
  assert.equal(hasMultipleDefaultSummaries({ summary: [twoDefaults[0], twoDefaults[2]] }), false);
  assert.equal(hasMultipleDefaultSummaries({ summary: "legacy text" }), false);
  assert.equal(hasMultipleDefaultSummaries(null), false);
});

test("the write path (draft/publish/import) stores a document with a single default", () => {
  const stored = yaml.load(upgradeLegacyResumeYamlContent(yaml.dump({ first_name: "Jane", family_name: "Doe", summary: twoDefaults })));
  assert.deepEqual(stored.summary.map((item) => item.default), [true, false, false]);
});
