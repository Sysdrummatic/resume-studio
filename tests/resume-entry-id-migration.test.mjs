import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { planAccountMigration, rewriteStoredYaml } = await import("../app/lib/resume-entry-id-migration.ts");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const empty = { qr_codes: [], languages: [], education: [], courses: [], contact: [], gdpr_clause: "" };

function legacyEnglish(extra = {}) {
  return yaml.dump({
    first_name: "Jan", family_name: "Kowalski", brand_initials: "JK", ...empty,
    summary: [{ position: "Engineer", description: "Builds", default: true }],
    skills: [{ name: "Writing", level: 4 }],
    tech_stack: ["TypeScript", "React"],
    interests: ["Music"],
    experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["A"] }, { period: "2018", company: "Beta", role: "Dev", highlights: ["B"] }],
    ...extra,
  });
}

function legacyPolish(extra = {}) {
  return yaml.dump({
    first_name: "Jan", family_name: "Kowalski", brand_initials: "JK", ...empty,
    summary: [{ position: "Inżynier", description: "Buduje", default: true }],
    skills: [{ name: "Pisanie", level: 4 }],
    tech_stack: ["TypeScript", "React"],
    interests: ["Muzyka"],
    experience: [{ period: "2020 - now", company: "Acme", role: "Inżynier", highlights: ["A"] }, { period: "2018", company: "Beta", role: "Programista", highlights: ["B"] }],
    ...extra,
  });
}

const rowsOf = (document, collection) => document[collection];
const idsOf = (document, collection) => rowsOf(document, collection).map((row) => row.entry_id);
const load = (migration, locale) => yaml.load(migration.documents.find((document) => document.locale === locale).yamlContent);

function allIds(document) {
  return ["summary", "skills", "tech_stack", "interests", "experience"].flatMap((collection) => idsOf(document, collection));
}

test("a single-language legacy account ends up with UUIDs only, in the entry-object shape", () => {
  const result = planAccountMigration([{ locale: "en", yamlContent: legacyEnglish() }], "en");

  assert.equal(result.status, "migrated");
  const english = load(result, "en");
  assert.ok(allIds(english).every((id) => UUID.test(id)), "no legacy-* ID remains");
  assert.deepEqual(rowsOf(english, "tech_stack").map((row) => row.name), ["TypeScript", "React"]);
  assert.equal("__ocv" in english, false);
  assert.equal(new Set(allIds(english)).size, allIds(english).length, "IDs are unique");
});

test("EN and PL legacy documents with the same shape share one UUID per position", () => {
  const result = planAccountMigration([
    { locale: "en", yamlContent: legacyEnglish() },
    { locale: "pl", yamlContent: legacyPolish() },
  ], "en");

  const english = load(result, "en");
  const polish = load(result, "pl");
  for (const collection of ["summary", "skills", "tech_stack", "interests", "experience"]) {
    assert.deepEqual(idsOf(polish, collection), idsOf(english, collection), `${collection} is paired`);
  }
  assert.deepEqual(rowsOf(polish, "interests").map((row) => row.name), ["Muzyka"], "translated text is untouched");
  assert.ok(result.guessed.some((guess) => guess.locale === "pl" && guess.collection === "interests" && guess.reason === "ambiguous"), "the guessed pairing is reported");
});

test("a translation with extra rows keeps every row; only the shared prefix is paired", () => {
  const polish = legacyPolish({ tech_stack: ["TypeScript", "React", "Redux"] });
  const result = planAccountMigration([
    { locale: "en", yamlContent: legacyEnglish() },
    { locale: "pl", yamlContent: polish },
  ], "en");

  const english = load(result, "en");
  const migratedPolish = load(result, "pl");
  assert.deepEqual(idsOf(migratedPolish, "tech_stack").slice(0, 2), idsOf(english, "tech_stack"));
  assert.deepEqual(rowsOf(migratedPolish, "tech_stack").map((row) => row.name), ["TypeScript", "React", "Redux"], "nothing is dropped");
  assert.match(idsOf(migratedPolish, "tech_stack")[2], UUID);
  assert.equal(new Set(idsOf(migratedPolish, "tech_stack")).size, 3);
  assert.ok(result.guessed.some((guess) => guess.collection === "tech_stack" && guess.reason === "count"));
});

test("a document that is already linked with UUIDs and the new shape is left alone", () => {
  const first = planAccountMigration([{ locale: "en", yamlContent: legacyEnglish() }], "en");
  const migratedYaml = first.documents[0].yamlContent;
  const second = planAccountMigration([{ locale: "en", yamlContent: migratedYaml }], "en");

  assert.equal(second.status, "unchanged");
  assert.equal(second.documents[0].yamlContent, migratedYaml);
});

test("only legacy-* IDs are replaced in a mixed document", () => {
  const mixed = yaml.dump({
    ...yaml.load(legacyEnglish()),
    experience: [
      { entry_id: "11111111-1111-4111-8111-111111111111", period: "2020", company: "Acme", role: "Engineer", highlights: [] },
      { entry_id: "legacy-experience-1", period: "2018", company: "Beta", role: "Dev", highlights: [] },
    ],
  });
  const result = planAccountMigration([{ locale: "en", yamlContent: mixed }], "en");

  const ids = idsOf(load(result, "en"), "experience");
  assert.equal(ids[0], "11111111-1111-4111-8111-111111111111");
  assert.match(ids[1], UUID);
});

test("a default that reuses an ID is skipped, not renumbered", () => {
  const duplicated = yaml.dump({
    ...yaml.load(legacyEnglish()),
    experience: [
      { entry_id: "dup", period: "2020", company: "Acme", role: "A", highlights: [] },
      { entry_id: "dup", period: "2018", company: "Beta", role: "B", highlights: [] },
    ],
  });

  assert.deepEqual(planAccountMigration([{ locale: "en", yamlContent: duplicated }], "en"), { status: "skipped", reason: "duplicate-ids", locale: "en" });
});

test("revisions use the same ID map as the live document, and unknown legacy IDs get one stable UUID", () => {
  const result = planAccountMigration([{ locale: "en", yamlContent: legacyEnglish() }], "en");
  const live = load(result, "en");
  const idMap = result.idMaps.en;

  const oldRevision = yaml.load(rewriteStoredYaml(legacyEnglish(), idMap));
  assert.deepEqual(idsOf(oldRevision, "experience"), idsOf(live, "experience"));
  assert.deepEqual(idsOf(oldRevision, "tech_stack"), idsOf(live, "tech_stack"));

  const longerRevision = legacyEnglish({ tech_stack: ["TypeScript", "React", "Vue"] });
  const first = yaml.load(rewriteStoredYaml(longerRevision, idMap));
  const second = yaml.load(rewriteStoredYaml(longerRevision, idMap));
  assert.match(idsOf(first, "tech_stack")[2], UUID);
  assert.equal(idsOf(first, "tech_stack")[2], idsOf(second, "tech_stack")[2]);
});

test("list order and length are preserved, so stored selection indexes stay valid", () => {
  const result = planAccountMigration([{ locale: "en", yamlContent: legacyEnglish({ tech_stack: ["", "Git", ""] }) }], "en");

  assert.deepEqual(rowsOf(load(result, "en"), "tech_stack").map((row) => row.name), ["", "Git", ""]);
});

test("a document whose summary is still a plain string is skipped instead of losing it", () => {
  const stringSummary = yaml.dump({ ...yaml.load(legacyEnglish()), summary: "A one-line summary" });

  assert.deepEqual(planAccountMigration([{ locale: "en", yamlContent: stringSummary }], "en"), { status: "skipped", reason: "unsupported-shape", locale: "en" });
  assert.equal(rewriteStoredYaml(stringSummary, new Map()), stringSummary, "a revision in that shape is left as it is");
});

test("a snapshot rewrite changes only the text lists: no IDs, no filled-in keys, same public export", async () => {
  const { rewriteSnapshotYaml } = await import("../app/lib/resume-entry-id-migration.ts");
  const { buildPublishedExportContent } = await import("../app/lib/published-export.ts");
  const snapshot = yaml.dump({
    first_name: "Jan", family_name: "Kowalski", brand_initials: "JK",
    summary: [{ position: "Engineer", description: "Builds", default: true }],
    tech_stack: ["TypeScript", "React"], interests: ["Music"],
    __ocv: { entries: { tech_stack: ["t-1", "t-2"], interests: ["i-1"] } },
  });
  const selection = { summary: [0], tech_stack: [0, 1], interests: [0] };

  const rewritten = rewriteSnapshotYaml(snapshot);
  const parsed = yaml.load(rewritten);

  assert.equal("__ocv" in parsed, false);
  assert.equal("gdpr_clause" in parsed, false, "missing keys are not filled in");
  assert.equal("entry_id" in parsed.summary[0], false, "other collections are untouched");
  assert.deepEqual(parsed.tech_stack, [{ entry_id: "t-1", name: "TypeScript" }, { entry_id: "t-2", name: "React" }]);
  assert.deepEqual(buildPublishedExportContent(rewritten, selection), buildPublishedExportContent(snapshot, selection));
  assert.equal(rewriteSnapshotYaml(rewritten), rewritten, "idempotent");
});

test("a legacy snapshot with a string summary is left byte-for-byte alone", async () => {
  const { rewriteSnapshotYaml } = await import("../app/lib/resume-entry-id-migration.ts");
  const legacy = yaml.dump({ first_name: "Jan", family_name: "Kowalski", summary: "Plain summary", skills: [] });

  assert.equal(rewriteSnapshotYaml(legacy), legacy);
});
