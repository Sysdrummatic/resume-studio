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
const writes = (fake) => fake.calls.filter((call) => call.method !== "GET");
const account = (documents, defaultLocale = "en") => ({
  resume_languages: GLOBAL_LANGUAGES,
  resume_user_locales: documents.map(({ locale }, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === defaultLocale, sort_order: (index + 1) * 10 })),
  resume_documents: documents.map(({ locale, yamlContent }) => ({ id: `doc-${locale}`, user_id: USER, locale, title: locale, yaml_content: yamlContent, schema_version: 1 })),
});

test("import switches the default language of an existing account without losing the imported content", async (t) => {
  const { inspectParity } = await import("../app/lib/resume-language-parity.ts");
  const { fake, result, bundle } = await runImport({
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: [{ user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 }],
    resume_documents: [{ id: "doc-en", user_id: USER, locale: "en", title: "Old", yaml_content: legacyEnglishDocument, schema_version: 1 }],
  });
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  assert.deepEqual(fake.rows("resume_user_locales").map((row) => row.locale).sort(), ["de", "en", "pl"]);

  const stored = Object.fromEntries(["pl", "en", "de"].map((locale) => [locale, yaml.load(documentFor(fake, locale).yaml_content)]));
  for (const locale of ["pl", "en", "de"]) {
    const imported = yaml.load(bundle.documents.find((document) => document.locale === locale).yaml_content);
    assert.equal(stored[locale].experience.length, 5, `${locale}: five experience entries`);
    assert.deepEqual(stored[locale].experience.map((row) => row.highlights), imported.experience.map((row) => row.highlights), `${locale}: translated highlights are kept`);
    assert.equal(stored[locale].summary.filter((row) => row.default).length, 1, `${locale}: exactly one default summary`);
    assert.doesNotMatch(documentFor(fake, locale).yaml_content, /entry_id|__ocv/, `${locale}: no entry ID or __ocv block is stored`);
  }
  assert.deepEqual(inspectParity(stored, "pl"), [], "the stored versions are parallel lists");
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

test("import over an account whose en and pl documents were created in the app", async (t) => {
  const { buildLanguageTemplate } = await import("../app/lib/resume-language-parity.ts");
  const english = yaml.load(legacyEnglishDocument);

  const { fake, result } = await runImport(account([
    { locale: "en", yamlContent: yaml.dump(english) },
    { locale: "pl", yamlContent: yaml.dump(buildLanguageTemplate(english)) },
  ]));
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  assert.equal(yaml.load(documentFor(fake, "pl").yaml_content).experience.length, 5);
  assert.equal(yaml.load(documentFor(fake, "en").yaml_content).experience.length, 5);
});

test("import rewrites stored documents that predate required keys instead of being rejected by the database", async (t) => {
  const withoutClause = yaml.load(legacyEnglishDocument);
  delete withoutClause.gdpr_clause;
  const legacyGerman = yaml.dump(withoutClause);
  assert.equal(databaseAcceptsYaml(legacyGerman), false, "fixture must be rejected by the database validator");

  const { fake, result } = await runImport(account([
    { locale: "en", yamlContent: legacyEnglishDocument },
    { locale: "de", yamlContent: legacyGerman },
    { locale: "pl", yamlContent: legacyEnglishDocument },
  ]));
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(defaultLocaleOf(fake), ["pl"]);
  for (const locale of ["pl", "en", "de"]) {
    assert.equal(databaseAcceptsYaml(documentFor(fake, locale).yaml_content), true, `${locale} stays valid for the database`);
  }
});

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

const bundleLanguages = [
  { code: "en", label: "English", short_label: "EN", is_default: true, sort_order: 0 },
  { code: "pl", label: "Polski", short_label: "PL", is_default: false, sort_order: 1 },
];
const twoRoles = [
  { period: "2020 - 2021", company: "Alpha", role: "Engineer A", highlights: ["Alpha work"] },
  { period: "2021 - 2022", company: "Beta", role: "Engineer B", highlights: ["Beta work"] },
];

test("an import whose versions are not parallel lists is refused before any write", async (t) => {
  const english = { ...yaml.load(legacyEnglishDocument), experience: twoRoles };
  const polish = { ...english, experience: [twoRoles[0]] };
  const seed = account([{ locale: "en", yamlContent: legacyEnglishDocument }, { locale: "pl", yamlContent: legacyEnglishDocument }]);
  const before = structuredClone(seed);

  const { fake, result } = await importBundleYaml(seed, { languages: bundleLanguages, documents: [
    { locale: "en", title: "Master resume", yaml_content: yaml.dump(english) },
    { locale: "pl", title: "Master resume PL", yaml_content: yaml.dump(polish) },
  ] });
  t.after(() => fake.restore());

  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.code, "parity");
  assert.ok(result.parityIssues.some((issue) => issue.kind === "count" && issue.collection === "experience" && issue.locale === "pl"), JSON.stringify(result.parityIssues));
  assert.deepEqual(writes(fake), [], "no language, document or revision is written");
  assert.deepEqual(fake.rows("resume_documents"), before.resume_documents, "no content is overwritten");
});

test("an import that would leave a stored language version out of step with the new default is refused", async (t) => {
  const english = { ...yaml.load(legacyEnglishDocument), experience: twoRoles };
  const seed = account([
    { locale: "en", yamlContent: legacyEnglishDocument },
    { locale: "de", yamlContent: legacyEnglishDocument },
  ]);

  const { fake, result } = await importBundleYaml(seed, { languages: [bundleLanguages[0]], documents: [
    { locale: "en", title: "Master resume", yaml_content: yaml.dump(english) },
  ] });
  t.after(() => fake.restore());

  assert.equal(result.ok, false);
  assert.equal(result.code, "parity");
  assert.ok(result.parityIssues.every((issue) => issue.locale === "de"), JSON.stringify(result.parityIssues));
  assert.deepEqual(writes(fake), []);
});

test("an import bundle whose documents still carry entry IDs and __ocv is stored clean", async (t) => {
  const english = {
    ...yaml.load(legacyEnglishDocument),
    experience: twoRoles.map((row, index) => ({ entry_id: `exp-${index}`, ...row })),
    tech_stack: ["TypeScript"],
    __ocv: { entries: { tech_stack: ["tech-1"], interests: [] } },
  };

  const { fake, result } = await importBundleYaml({ resume_languages: GLOBAL_LANGUAGES }, { languages: [bundleLanguages[0]], documents: [
    { locale: "en", title: "Master resume", yaml_content: yaml.dump(english) },
  ] });
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  const stored = yaml.load(documentFor(fake, "en").yaml_content);
  assert.deepEqual(stored.experience.map((row) => row.company), ["Alpha", "Beta"]);
  assert.deepEqual(stored.tech_stack, ["TypeScript"]);
  assert.doesNotMatch(documentFor(fake, "en").yaml_content, /entry_id|__ocv/);
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
