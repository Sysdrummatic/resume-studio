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
