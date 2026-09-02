import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const {
  normalizeResumeDocument,
  validateResumeDocument,
  defaultResumeDocument,
  normalizeLocale,
  getDefaultSummary,
  initialsFromNameParts,
  resumeFullName,
  migrateLegacyResumeYamlFields,
} = await import("../app/lib/resume-schema.ts");

test("normalizeResumeDocument handles valid structure", () => {
  const input = {
    first_name: "John",
    family_name: "Doe",
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
  assert.equal(result.first_name, "John");
  assert.equal(result.family_name, "Doe");
  assert.equal(result.summary[0]?.position, "Engineer");
});

test("normalizeResumeDocument coerces missing fields to defaults", () => {
  const result = normalizeResumeDocument({ first_name: "Test" });
  assert.equal(result.first_name, "Test");
  assert.deepEqual(result.contact, []);
  assert.deepEqual(result.summary, []);
  assert.deepEqual(result.experience, []);
});

test("normalizeResumeDocument uses fallbackName when first_name/family_name are missing", () => {
  const result = normalizeResumeDocument({}, "Fallback Name");
  assert.equal(result.first_name, "Fallback");
  assert.equal(result.family_name, "Name");
});

test("normalizeResumeDocument splits a legacy single `name` field on first read (no backfill migration needed)", () => {
  const result = normalizeResumeDocument({ name: "Jan Kowalski" });
  assert.equal(result.first_name, "Jan");
  assert.equal(result.family_name, "Kowalski");
});

test("normalizeResumeDocument prefers first_name/family_name over a stray legacy `name` field", () => {
  const result = normalizeResumeDocument({ name: "Legacy Name", first_name: "New", family_name: "Shape" });
  assert.equal(result.first_name, "New");
  assert.equal(result.family_name, "Shape");
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
  const doc = defaultResumeDocument("Alice Smith");
  assert.equal(doc.first_name, "Alice");
  assert.equal(doc.family_name, "Smith");
  assert.equal(typeof doc.brand_initials, "string");
  assert(Array.isArray(doc.contact));
  assert(Array.isArray(doc.summary));
  assert(Array.isArray(doc.experience));
  assert(Array.isArray(doc.skills));
  assert.equal(doc.gdpr_clause, "");
});

test("normalizeResumeDocument round-trips gdpr_clause without re-defaulting an explicit empty value", () => {
  const withClause = normalizeResumeDocument({ first_name: "Test", gdpr_clause: "Custom wording" });
  assert.equal(withClause.gdpr_clause, "Custom wording");

  // A user who deliberately cleared the clause must not have it resurrected.
  const cleared = normalizeResumeDocument({ first_name: "Test", gdpr_clause: "" });
  assert.equal(cleared.gdpr_clause, "");
});

test("initialsFromNameParts takes the first letter of the first name and the first term of the family name", () => {
  assert.equal(initialsFromNameParts("Jan", "Kowalski"), "JK");
  // A compound surname only contributes its first term.
  assert.equal(initialsFromNameParts("Anna", "Kowalska Nowak"), "AK");
  // Mononym: no family name to draw a second letter from.
  assert.equal(initialsFromNameParts("Cher", ""), "CH");
  assert.equal(initialsFromNameParts("", ""), "");
});

test("resumeFullName joins first and family name, trimming and skipping blanks", () => {
  assert.equal(resumeFullName({ first_name: "Jan", family_name: "Kowalski" }), "Jan Kowalski");
  assert.equal(resumeFullName({ first_name: "Cher", family_name: "" }), "Cher");
  assert.equal(resumeFullName({ first_name: "", family_name: "" }), "");
});

test("migrateLegacyResumeYamlFields upgrades a raw legacy `name` key, preserving every other field", () => {
  const migrated = migrateLegacyResumeYamlFields({
    brand_initials: "JK",
    name: "Jan Kowalski",
    custom_extension_field: "kept verbatim",
  });
  assert.equal(migrated.first_name, "Jan");
  assert.equal(migrated.family_name, "Kowalski");
  assert.equal("name" in migrated, false);
  assert.equal(migrated.brand_initials, "JK");
  assert.equal(migrated.custom_extension_field, "kept verbatim");
});

test("migrateLegacyResumeYamlFields is a no-op once first_name/family_name are already present", () => {
  const alreadyCurrent = { first_name: "Jan", family_name: "Kowalski", name: "Stale copy" };
  assert.equal(migrateLegacyResumeYamlFields(alreadyCurrent), alreadyCurrent);
});
