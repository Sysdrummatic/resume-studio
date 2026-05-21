import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeResumeDocument,
  validateResumeDocument,
  defaultResumeDocument,
  normalizeLocale,
  getDefaultSummary,
} from "../app/lib/resume-schema.ts";

test("normalizeResumeDocument handles valid structure", () => {
  const input = {
    name: "John Doe",
    contact: [],
    summary: [{ position: "Engineer" }],
    experience: [],
    education: [],
    skills: [],
    interests: [],
    languages: [],
    courses: [],
    tech_stack: [],
  };

  const result = normalizeResumeDocument(input);
  assert.equal(result.name, "John Doe");
  assert.equal(result.summary[0]?.position, "Engineer");
});

test("normalizeResumeDocument coerces missing fields to defaults", () => {
  const result = normalizeResumeDocument({ name: "Test" });
  assert.equal(result.name, "Test");
  assert.deepEqual(result.contact, []);
  assert.deepEqual(result.summary, []);
  assert.deepEqual(result.experience, []);
});

test("normalizeResumeDocument uses fallbackName when name is missing", () => {
  const result = normalizeResumeDocument({}, "Fallback Name");
  assert.equal(result.name, "Fallback Name");
});

test("validateResumeDocument accepts valid documents", () => {
  const doc = defaultResumeDocument("Test");
  const result = validateResumeDocument(doc);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateResumeDocument rejects invalid summary items (non-string fields)", () => {
  const doc = {
    ...defaultResumeDocument("Test"),
    summary: [{ position: 123 }], // position should be string
  };

  const result = validateResumeDocument(doc);
  assert.equal(result.valid, false);
  assert(result.errors.length > 0);
});

test("validateResumeDocument rejects non-object input", () => {
  const result = validateResumeDocument("not an object");
  assert.equal(result.valid, false);
  assert(result.errors.length > 0);
});

test("normalizeLocale handles standard codes", () => {
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("pl"), "pl");
  assert.equal(normalizeLocale("de"), "de");
});

test("normalizeLocale normalizes case and variants", () => {
  assert.equal(normalizeLocale("EN"), "en");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("pl-PL"), "pl");
});

test("normalizeLocale accepts any 2-letter code, defaults non-match to en", () => {
  assert.equal(normalizeLocale("xx"), "xx"); // valid 2-letter code
  assert.equal(normalizeLocale(""), "en"); // empty defaults to en
  assert.equal(normalizeLocale(null), "en"); // null defaults to en
  assert.equal(normalizeLocale("abc"), "en"); // 3+ letters don't match pattern
});

test("getDefaultSummary finds item with exactly one default: true", () => {
  const summary = [
    { position: "First" },
    { position: "Second", default: true },
    { position: "Third" },
  ];

  const result = getDefaultSummary(summary);
  assert.equal(result?.position, "Second");
});

test("getDefaultSummary returns null if no default item", () => {
  const summary = [{ position: "First" }, { position: "Second" }];

  const result = getDefaultSummary(summary);
  assert.equal(result, null);
});

test("getDefaultSummary returns null if multiple defaults set", () => {
  const summary = [
    { position: "First", default: true },
    { position: "Second", default: true },
  ];

  const result = getDefaultSummary(summary);
  assert.equal(result, null);
});

test("defaultResumeDocument creates template with required fields", () => {
  const doc = defaultResumeDocument("Alice");
  assert.equal(doc.name, "Alice");
  assert.equal(typeof doc.brand_initials, "string");
  assert(Array.isArray(doc.contact));
  assert(Array.isArray(doc.summary));
  assert(Array.isArray(doc.experience));
  assert(Array.isArray(doc.skills));
});
