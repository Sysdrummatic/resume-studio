import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const USER = "11111111-1111-1111-1111-111111111111";
const GLOBAL_LANGUAGES = ["en", "pl", "de"].map((code, index) => ({
  code,
  label: code,
  short_label: code.toUpperCase(),
  labels: {},
  is_enabled: true,
  sort_order: (index + 1) * 10,
}));

// Mirrors public.validate_resume_document_yaml as deployed (regexes over the
// YAML *text*, run by the resume_documents_validate_yaml trigger on every write).
const REQUIRED_KEYS = ["brand_initials", "summary", "contact", "qr_codes", "skills", "tech_stack", "languages", "interests", "experience", "education", "courses", "gdpr_clause"];
function databaseAcceptsYaml(text) {
  if (typeof text !== "string" || !text.trim() || text.length > 250000) return false;
  if (!REQUIRED_KEYS.every((key) => new RegExp(`^${key}\s*:`, "m").test(text))) return false;
  const first = /^first_names*:/m.test(text);
  const family = /^family_names*:/m.test(text);
  return (first && family) || (!first && !family && /^names*:/m.test(text));
}
const DATABASE_TRIGGERS = {
  resume_documents: (row) => (databaseAcceptsYaml(row.yaml_content) ? null : "Invalid resume YAML content. Required keys are missing or payload is malformed."),
};

const legacyEnglishDocument = yaml.dump({
  brand_initials: "OA",
  first_name: "Old",
  family_name: "Admin",
  summary: [{ position: "Old role", description: "Old summary", default: true }],
  contact: [],
  qr_codes: [],
  skills: [],
  tech_stack: [],
  languages: [],
  interests: [],
  experience: [{ period: "2010 - 2011", company: "Old Co", role: "Old", highlights: ["Old highlight"] }],
  education: [],
  courses: [],
  gdpr_clause: "",
});

function seedBundle() {
  return fs.readFileSync(path.join(process.cwd(), "docs/guides/test-scenarios/ADMIN_MASTER_RESUME_SEED.yaml"), "utf8");
}

async function runImport(seed) {
  const fake = installFakePostgrest(seed, { triggers: DATABASE_TRIGGERS });
  const { parseUserDataBundle } = await import("../app/lib/user-data-transfer.ts");
  const { importLanguagesAndDocuments, upgradeLegacyResumeYamlContent } = await import("../app/lib/resume-server.ts");
  const parsed = parseUserDataBundle(seedBundle());
  assert.ok(parsed.bundle, parsed.error);
  const bundle = {
    ...parsed.bundle,
    documents: parsed.bundle.documents.map((document) => ({ ...document, yaml_content: upgradeLegacyResumeYamlContent(document.yaml_content) })),
  };
  const result = await importLanguagesAndDocuments("token", USER, bundle);
  return { fake, result, bundle };
}

const documentFor = (fake, locale) => fake.rows("resume_documents").find((row) => row.locale === locale);
const defaultLocaleOf = (fake) => fake.rows("resume_user_locales").filter((row) => row.is_default).map((row) => row.locale);

test("import switches the default language of an existing account without losing the imported content", async (t) => {
  // An account that already has a different default language and no document
  // in the imported default language used to fail with:
  // Import failed while saving the "pl" language version.
  const { fake, result, bundle } = await runImport({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [{ user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 }],
    resume_documents: [{ id: "doc-en", user_id: USER, locale: "en", title: "Old", yaml_content: legacyEnglishDocument, schema_version: 1 }],
  });
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  assert.deepEqual(fake.rows("resume_user_locales").map((row) => row.locale).sort(), ["de", "en", "pl"]);

  const { validateResumeLanguagePair } = await import("../app/lib/resume-language-linkage.ts");
  const stored = Object.fromEntries(["pl", "en", "de"].map((locale) => [locale, yaml.load(documentFor(fake, locale).yaml_content)]));

  for (const locale of ["pl", "en", "de"]) {
    const imported = yaml.load(bundle.documents.find((document) => document.locale === locale).yaml_content);
    assert.equal(stored[locale].experience.length, 5, `${locale}: five experience entries`);
    assert.deepEqual(
      stored[locale].experience.map((row) => row.highlights),
      imported.experience.map((row) => row.highlights),
      `${locale}: translated highlights are kept, not blanked by reconciliation`,
    );
    assert.equal(stored[locale].summary.filter((row) => row.default).length, 1, `${locale}: exactly one default summary`);
  }
  assert.deepEqual(validateResumeLanguagePair(stored.pl, stored.en), []);
  assert.deepEqual(validateResumeLanguagePair(stored.pl, stored.de), []);
});

test("import into an account with no languages yet makes the imported default language the default", async (t) => {
  const { fake, result } = await runImport({ resume_languages: GLOBAL_LANGUAGES });
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  assert.equal(fake.rows("resume_documents").length, 3);
});

test("import is repeatable on an account that already holds the same data", async (t) => {
  const first = await runImport({ resume_languages: GLOBAL_LANGUAGES });
  const seeded = {
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: first.fake.rows("resume_user_locales"),
    resume_documents: first.fake.rows("resume_documents"),
  };
  first.fake.restore();

  const second = await runImport(seeded);
  t.after(() => second.fake.restore());

  assert.deepEqual(second.result, { ok: true });
  assert.deepEqual(defaultLocaleOf(second.fake), ["pl"]);
  assert.equal(second.fake.rows("resume_documents").length, 3);
});

test("import over an account whose linked en and pl documents were created in the app", async (t) => {
  const { ensureResumeEntryIds, buildResumeLanguageTemplate } = await import("../app/lib/resume-language-linkage.ts");
  const english = ensureResumeEntryIds(yaml.load(legacyEnglishDocument));
  const polishTemplate = buildResumeLanguageTemplate(english);

  const { fake, result } = await runImport({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [
      { user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 },
      { user_id: USER, locale: "pl", label_override: null, short_label_override: null, is_default: false, sort_order: 20 },
    ],
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(english), schema_version: 1 },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: yaml.dump(polishTemplate), schema_version: 1 },
    ],
  });
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  assert.equal(yaml.load(documentFor(fake, "pl").yaml_content).experience.length, 5);
  assert.equal(yaml.load(documentFor(fake, "en").yaml_content).experience.length, 5);
});

test("import rewrites stored documents that predate required keys instead of being rejected by the database", async (t) => {
  // Real test-project state: an older `de` document without `gdpr_clause` no
  // longer passes the resume_documents trigger, and switching the default
  // language rewrites every other document of the account.
  const withoutClause = yaml.load(legacyEnglishDocument);
  delete withoutClause.gdpr_clause;
  const legacyGerman = yaml.dump(withoutClause);
  assert.equal(databaseAcceptsYaml(legacyGerman), false, "fixture must be rejected by the database validator");

  const { fake, result } = await runImport({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [
      { user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 },
      { user_id: USER, locale: "de", label_override: null, short_label_override: null, is_default: false, sort_order: 20 },
      { user_id: USER, locale: "pl", label_override: null, short_label_override: null, is_default: false, sort_order: 30 },
    ],
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: legacyEnglishDocument, schema_version: 1 },
      { id: "doc-de", user_id: USER, locale: "de", title: "de", yaml_content: legacyGerman, schema_version: 1 },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: legacyEnglishDocument, schema_version: 1 },
    ],
  });
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  for (const locale of ["pl", "en", "de"]) {
    assert.equal(databaseAcceptsYaml(documentFor(fake, locale).yaml_content), true, `${locale} stays valid for the database`);
  }
});

test("fillMissingRequiredKeysInRawYaml adds only what is missing and leaves complete documents alone", async () => {
  const { fillMissingRequiredKeysInRawYaml } = await import("../app/lib/resume-schema.ts");
  const complete = yaml.load(legacyEnglishDocument);
  assert.equal(fillMissingRequiredKeysInRawYaml(complete), complete);

  const filled = fillMissingRequiredKeysInRawYaml({ name: "Jan Kowalski", custom_field: "keep me", summary: [] });
  assert.equal(filled.custom_field, "keep me");
  assert.equal(filled.gdpr_clause, "");
  assert.equal(filled.brand_initials, "");
  assert.deepEqual(filled.experience, []);
  assert.equal("first_name" in filled, false, "a legacy name-only document stays valid without name keys");
});

// Re-maps every linkage ID of a bundle consistently, like a bundle exported from
// another account (or after the account's IDs changed): same content, new IDs.
function withRegeneratedIds(bundle) {
  const ids = new Map();
  const next = (id) => {
    if (!ids.has(id)) ids.set(id, `re-${ids.size}-${id}`);
    return ids.get(id);
  };
  return {
    ...bundle,
    documents: bundle.documents.map((document) => {
      const parsed = yaml.load(document.yaml_content);
      for (const value of Object.values(parsed)) {
        if (Array.isArray(value)) value.forEach((row) => { if (row && typeof row === "object" && row.entry_id) row.entry_id = next(row.entry_id); });
      }
      for (const [key, list] of Object.entries(parsed.__ocv?.entries ?? {})) parsed.__ocv.entries[key] = list.map(next);
      return { ...document, yaml_content: yaml.dump(parsed) };
    }),
  };
}

async function importBundle(seed, bundle) {
  const fake = installFakePostgrest(seed, { triggers: DATABASE_TRIGGERS });
  const { importLanguagesAndDocuments } = await import("../app/lib/resume-server.ts");
  return { fake, result: await importLanguagesAndDocuments("token", USER, bundle) };
}

async function parsedSeedBundle() {
  const { parseUserDataBundle } = await import("../app/lib/user-data-transfer.ts");
  const { upgradeLegacyResumeYamlContent } = await import("../app/lib/resume-server.ts");
  const parsed = parseUserDataBundle(seedBundle());
  return { ...parsed.bundle, documents: parsed.bundle.documents.map((document) => ({ ...document, yaml_content: upgradeLegacyResumeYamlContent(document.yaml_content) })) };
}

const roles = (document) => yaml.load(document.yaml_content).experience.map((row) => [row.role, row.highlights]);

test("a re-import of a consistent bundle with different IDs replaces the stored default and keeps EN/PL roles", async (t) => {
  const bundle = await parsedSeedBundle();
  const first = await importBundle({ resume_languages: GLOBAL_LANGUAGES }, bundle);
  assert.deepEqual(first.result, { ok: true });
  const seeded = { resume_languages: GLOBAL_LANGUAGES, resume_user_locales: first.fake.rows("resume_user_locales"), resume_documents: first.fake.rows("resume_documents") };
  first.fake.restore();

  const reimport = withRegeneratedIds(bundle);
  const second = await importBundle(seeded, reimport);
  t.after(() => second.fake.restore());

  assert.deepEqual(second.result, { ok: true }, "a consistent bundle is not blocked by the edit-time ID stability check");
  const { validateResumeLanguagePair } = await import("../app/lib/resume-language-linkage.ts");
  const stored = Object.fromEntries(["pl", "en", "de"].map((locale) => [locale, documentFor(second.fake, locale)]));
  for (const locale of ["pl", "en", "de"]) {
    assert.deepEqual(roles(stored[locale]), roles(reimport.documents.find((document) => document.locale === locale)), `${locale}: translated roles and highlights are kept`);
  }
  assert.deepEqual(validateResumeLanguagePair(yaml.load(stored.pl.yaml_content), yaml.load(stored.en.yaml_content)), []);
});

test("an import whose translation IDs do not match its default is refused before anything is blanked", async (t) => {
  const bundle = await parsedSeedBundle();
  const foreign = withRegeneratedIds(bundle);
  const mixed = { ...bundle, documents: bundle.documents.map((document) => (document.locale === "en" ? foreign.documents.find((entry) => entry.locale === "en") : document)) };
  const { fake, result } = await importBundle({ resume_languages: GLOBAL_LANGUAGES }, mixed);
  t.after(() => fake.restore());

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.match(result.error, /"en"/);
  assert.ok(result.linkageIssues?.length, "the conflict lists the mismatched IDs");
  const en = documentFor(fake, "en");
  assert.ok(!en || roles(en).some(([role]) => role), "no English document is stored with blanked translations");
});

test("creating a translation with its own complete IDs that do not match the default is refused", async (t) => {
  const { ensureResumeEntryIds } = await import("../app/lib/resume-language-linkage.ts");
  const english = ensureResumeEntryIds(yaml.load(legacyEnglishDocument));
  const foreignPolish = { ...english, experience: english.experience.map((row) => ({ ...row, entry_id: `foreign-${row.entry_id}`, role: "Stary" })) };
  const fake = installFakePostgrest({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [
      { user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 },
      { user_id: USER, locale: "pl", label_override: null, short_label_override: null, is_default: false, sort_order: 20 },
    ],
    resume_documents: [{ id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(english), schema_version: 1 }],
    profiles: [{ id: USER, display_name: "Old Admin", person_slug: "old-admin", name_sync_mode: "manual" }],
  }, { triggers: DATABASE_TRIGGERS });
  t.after(() => fake.restore());
  const { publishResumeDocument, ResumeLanguageLinkageError } = await import("../app/lib/resume-server.ts");

  await assert.rejects(
    publishResumeDocument("token", USER, "pl", { yamlContent: yaml.dump(foreignPolish), title: "pl", changeNote: "create" }),
    ResumeLanguageLinkageError,
  );
  assert.equal(documentFor(fake, "pl"), undefined, "nothing is written");
});

test("a normal save still cannot change the IDs of the stored default", async (t) => {
  const { ensureResumeEntryIds } = await import("../app/lib/resume-language-linkage.ts");
  const english = ensureResumeEntryIds(yaml.load(legacyEnglishDocument));
  const fake = installFakePostgrest({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [{ user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 }],
    resume_documents: [{ id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(english), schema_version: 1 }],
    profiles: [{ id: USER, display_name: "Old Admin", person_slug: "old-admin", name_sync_mode: "manual" }],
  }, { triggers: DATABASE_TRIGGERS });
  t.after(() => fake.restore());
  const { publishResumeDocument, saveResumeDraftDocument, ResumeLanguageLinkageError } = await import("../app/lib/resume-server.ts");
  const changedIds = { ...english, experience: english.experience.map((row) => ({ ...row, entry_id: `changed-${row.entry_id}` })) };

  await assert.rejects(publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(changedIds), title: "en", changeNote: "edit" }), ResumeLanguageLinkageError);
  await assert.rejects(saveResumeDraftDocument("token", USER, "en", { yamlContent: yaml.dump(changedIds), title: "en" }), ResumeLanguageLinkageError);
  assert.equal(documentFor(fake, "en").yaml_content, yaml.dump(english));
});

// A bundle whose default reuses one entry_id for two different entries. Pairing
// by that ID would copy one translated entry over the other, silently.
async function importBundleYaml(seed, input) {
  const { buildUserDataBundleYaml, parseUserDataBundle } = await import("../app/lib/user-data-transfer.ts");
  const { importLanguagesAndDocuments, upgradeLegacyResumeYamlContent } = await import("../app/lib/resume-server.ts");
  const parsed = parseUserDataBundle(buildUserDataBundleYaml({ cv_versions: [], ...input }));
  assert.ok(parsed.bundle, parsed.error);
  const bundle = { ...parsed.bundle, documents: parsed.bundle.documents.map((document) => ({ ...document, yaml_content: upgradeLegacyResumeYamlContent(document.yaml_content) })) };
  const fake = installFakePostgrest(seed, { triggers: DATABASE_TRIGGERS });
  const result = await importLanguagesAndDocuments("token", USER, bundle);
  return { fake, result };
}

const duplicateBase = { ...yaml.load(legacyEnglishDocument), tech_stack: ["TypeScript", "React"] };
const duplicateEnglish = {
  ...duplicateBase,
  experience: [
    { entry_id: "dup-1", period: "2020 - 2021", company: "Alpha", role: "Engineer A", highlights: ["Alpha work"] },
    { entry_id: "dup-1", period: "2021 - 2022", company: "Beta", role: "Engineer B", highlights: ["Beta work"] },
  ],
  summary: [{ ...duplicateBase.summary[0], entry_id: "summary-1" }],
  __ocv: { entries: { tech_stack: ["tech-1", "tech-2"], interests: [] } },
};
// No summary, so pairing by company + year succeeds and the silent copy is reachable.
const legacyPolishTranslation = {
  ...duplicateBase,
  summary: [],
  experience: [
    { period: "2020 - 2021", company: "Alpha", role: "Rola A", highlights: ["Praca w Alpha"] },
    { period: "2021 - 2022", company: "Beta", role: "Rola B", highlights: ["Praca w Beta"] },
  ],
};
const bundleLanguages = [
  { code: "en", label: "English", short_label: "EN", is_default: true, sort_order: 0 },
  { code: "pl", label: "Polski", short_label: "PL", is_default: false, sort_order: 1 },
];
const existingAccount = () => ({
  resume_languages: GLOBAL_LANGUAGES,
  resume_user_locales: [
    { user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 },
    { user_id: USER, locale: "pl", label_override: null, short_label_override: null, is_default: false, sort_order: 20 },
  ],
  resume_documents: [
    { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: legacyEnglishDocument, schema_version: 1 },
    { id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: legacyEnglishDocument, schema_version: 1 },
  ],
});
const writes = (fake) => fake.calls.filter((call) => call.method !== "GET");

for (const [label, input] of [
  ["EN/PL with a legacy translation", { languages: bundleLanguages, documents: [
    { locale: "en", title: "Master resume", yaml_content: yaml.dump(duplicateEnglish) },
    { locale: "pl", title: "Master resume PL", yaml_content: yaml.dump(legacyPolishTranslation) },
  ] }],
  ["only the default language", { languages: [bundleLanguages[0]], documents: [
    { locale: "en", title: "Master resume", yaml_content: yaml.dump(duplicateEnglish) },
  ] }],
  ["a duplicate text-list ID in __ocv.entries", { languages: [bundleLanguages[0]], documents: [
    { locale: "en", title: "Master resume", yaml_content: yaml.dump({
      ...duplicateEnglish,
      experience: duplicateEnglish.experience.map((row, index) => ({ ...row, entry_id: `exp-${index}` })),
      __ocv: { entries: { tech_stack: ["tech-1", "tech-1"], interests: [] } },
    }) },
  ] }],
]) {
  test(`an import whose default reuses an entry ID is refused before any write (${label})`, async (t) => {
    const seed = existingAccount();
    const before = structuredClone(seed);
    const { fake, result } = await importBundleYaml(seed, input);
    t.after(() => fake.restore());

    assert.equal(result.ok, false);
    assert.equal(result.status, 409);
    assert.match(result.error, /"en"/);
    assert.ok(result.linkageIssues.every((issue) => issue.kind === "duplicate-id"), JSON.stringify(result.linkageIssues));
    assert.deepEqual(writes(fake), [], "no language, document or revision is written");
    assert.deepEqual(fake.rows("resume_documents"), before.resume_documents, "no content is overwritten");
    assert.deepEqual(fake.rows("resume_user_locales"), before.resume_user_locales);
  });
}

// A stored default that reuses an ID (possible after older code). A complete,
// consistent bundle that replaces it repairs it; a stored document the import
// would still synchronize is refused before anything is written.
const brokenEnglishDefault = yaml.dump({
  ...yaml.load(legacyEnglishDocument),
  experience: [
    { entry_id: "dup-1", period: "2010 - 2011", company: "Old Co", role: "Old A", highlights: [] },
    { entry_id: "dup-1", period: "2012 - 2013", company: "Other Co", role: "Old B", highlights: [] },
  ],
  __ocv: { entries: { tech_stack: [], interests: [] } },
});

test("a complete, consistent bundle repairs a stored default that reuses an ID", async (t) => {
  const bundle = await parsedSeedBundle();
  const { fake, result } = await importBundle({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [{ user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 }],
    resume_documents: [{ id: "doc-en", user_id: USER, locale: "en", title: "Old", yaml_content: brokenEnglishDefault, schema_version: 1 }],
  }, bundle);
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true }, "the replaced broken default does not block the import");
  const { findDuplicateResumeEntryIds, validateResumeLanguagePair } = await import("../app/lib/resume-language-linkage.ts");
  for (const locale of ["pl", "en", "de"]) {
    assert.deepEqual(roles(documentFor(fake, locale)), roles(bundle.documents.find((document) => document.locale === locale)), `${locale}: roles kept`);
    assert.deepEqual(findDuplicateResumeEntryIds(yaml.load(documentFor(fake, locale).yaml_content)), [], `${locale}: unique IDs`);
  }
  assert.deepEqual(validateResumeLanguagePair(yaml.load(documentFor(fake, "pl").yaml_content), yaml.load(documentFor(fake, "en").yaml_content)), []);
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
});

test("an import that would synchronize a stored translation reusing an ID is refused before any write", async (t) => {
  const bundle = await parsedSeedBundle();
  // German is not in the bundle, so switching the default to PL would synchronize it.
  const withoutGerman = { ...bundle, languages: bundle.languages.filter((language) => language.code !== "de"), documents: bundle.documents.filter((document) => document.locale !== "de") };
  const seed = {
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [
      { user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 },
      { user_id: USER, locale: "de", label_override: null, short_label_override: null, is_default: false, sort_order: 30 },
    ],
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: legacyEnglishDocument, schema_version: 1 },
      { id: "doc-de", user_id: USER, locale: "de", title: "de", yaml_content: brokenEnglishDefault, schema_version: 1 },
    ],
  };
  const before = structuredClone(seed);
  const { fake, result } = await importBundle(seed, withoutGerman);
  t.after(() => fake.restore());

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.code, "duplicate-ids");
  assert.match(result.error, /"de"/);
  // The broken document is the stored one, not the import file: the message
  // must send the user to fix it in the app, not in the file.
  assert.match(result.error, /stored/);
  assert.doesNotMatch(result.error, /import file/);
  assert.ok(result.linkageIssues.every((issue) => issue.kind === "duplicate-id"));
  assert.deepEqual(fake.calls.filter((call) => call.method !== "GET"), [], "no language, document or revision is written");
  assert.deepEqual(fake.rows("resume_documents"), before.resume_documents);
  assert.deepEqual(fake.rows("resume_user_locales"), before.resume_user_locales);
});
