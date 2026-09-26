import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// ADR 0023 §7: documents saved before linkage IDs existed are paired by
// position during their first reconciliation. These flows run the real
// resume-server code against an in-memory PostgREST, so they prove the
// application's call order, not Supabase behavior (no RLS, no triggers).

const USER = "22222222-2222-2222-2222-222222222222";
const LANGUAGES = ["en", "pl"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));

const base = {
  brand_initials: "JK",
  first_name: "Jan",
  family_name: "Kowalski",
  contact: [],
  qr_codes: [],
  skills: [],
  languages: [],
  education: [],
  courses: [],
  gdpr_clause: "",
};
const legacyEnglish = {
  ...base,
  summary: [{ position: "Engineer", description: "Builds tools", default: true }],
  tech_stack: ["TypeScript", "React"],
  interests: ["Music", "Chess"],
  experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["Built the editor"] }],
};
const legacyPolish = {
  ...base,
  summary: [{ position: "Inżynier", description: "Buduje narzędzia", default: true }],
  tech_stack: ["TypeScript (PL)", "React (PL)"],
  interests: ["Muzyka", "Szachy"],
  experience: [{ period: "2020 - now", company: "Acme", role: "Inżynier", highlights: ["Zbudował edytor"] }],
};

function install(defaultLocale = "en", onRequest) {
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === defaultLocale, sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(legacyEnglish), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: yaml.dump(legacyPolish), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
    ],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  }, { onRequest });
}

const stored = (fake, locale) => yaml.load(fake.rows("resume_documents").find((row) => row.locale === locale).yaml_content);

function assertTranslationKept(document, expected, label) {
  assert.deepEqual(document.tech_stack, expected.tech_stack, `${label}: tech_stack`);
  assert.deepEqual(document.interests, expected.interests, `${label}: interests`);
  assert.equal(document.experience[0].role, expected.experience[0].role, `${label}: experience role`);
  assert.deepEqual(document.experience[0].highlights, expected.experience[0].highlights, `${label}: highlights`);
  assert.equal(document.summary[0].position, expected.summary[0].position, `${label}: summary`);
}

async function load() {
  const server = await import("../app/lib/resume-server.ts");
  const linkage = await import("../app/lib/resume-language-linkage.ts");
  return { ...server, ...linkage };
}

test("saving the default language links a legacy translation without blanking it", async (t) => {
  const fake = install();
  t.after(() => fake.restore());
  const { publishResumeDocument, validateResumeLanguagePair } = await load();

  const saved = await publishResumeDocument("token", USER, "en", {
    yamlContent: yaml.dump({ ...legacyEnglish, interests: ["Music", "Chess"] }),
    title: "Jan Kowalski",
    changeNote: "First save after linkage",
  });

  assert.ok(saved);
  assertTranslationKept(stored(fake, "pl"), legacyPolish, "pl after first linking");
  assert.deepEqual(validateResumeLanguagePair(stored(fake, "en"), stored(fake, "pl")), []);
});

test("saving a legacy translation first and the default second keeps the translation", async (t) => {
  const fake = install();
  t.after(() => fake.restore());
  const { publishResumeDocument, validateResumeLanguagePair } = await load();

  assert.ok(await publishResumeDocument("token", USER, "pl", { yamlContent: yaml.dump(legacyPolish), title: "Jan Kowalski", changeNote: "pl" }));
  assertTranslationKept(stored(fake, "pl"), legacyPolish, "pl after its own save");

  assert.ok(await publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(legacyEnglish), title: "Jan Kowalski", changeNote: "en" }));
  assertTranslationKept(stored(fake, "pl"), legacyPolish, "pl after the default save");
  assert.deepEqual(validateResumeLanguagePair(stored(fake, "en"), stored(fake, "pl")), []);
});

test("switching the default language of legacy documents keeps both languages' content", async (t) => {
  const fake = install();
  t.after(() => fake.restore());
  const { setDefaultResumeLocaleForUser, validateResumeLanguagePair } = await load();

  assert.equal(await setDefaultResumeLocaleForUser("token", USER, "pl"), true);

  assertTranslationKept(stored(fake, "pl"), legacyPolish, "pl as the new default");
  assertTranslationKept(stored(fake, "en"), legacyEnglish, "en as the new translation");
  assert.deepEqual(validateResumeLanguagePair(stored(fake, "pl"), stored(fake, "en")), []);
});

test("switching the default after the first linking keeps both languages' content", async (t) => {
  const fake = install();
  t.after(() => fake.restore());
  const { publishResumeDocument, setDefaultResumeLocaleForUser } = await load();

  assert.ok(await publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(legacyEnglish), title: "Jan Kowalski", changeNote: "en" }));
  assert.equal(await setDefaultResumeLocaleForUser("token", USER, "pl"), true);

  assertTranslationKept(stored(fake, "pl"), legacyPolish, "pl as the new default");
  assertTranslationKept(stored(fake, "en"), legacyEnglish, "en as the new translation");
});
