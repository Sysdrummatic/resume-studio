import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// ADR 0023 §7: a legacy translation (saved before linkage IDs existed) is linked
// by position only when that is proven, otherwise after the user confirms the
// order. Isolated: the real resume-server code runs against an in-memory
// PostgREST (no RLS, no triggers), so this proves the app's calls, not Supabase.

const USER = "22222222-2222-2222-2222-222222222222";
const LANGUAGES = ["en", "pl"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));
const empty = { contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], gdpr_clause: "" };
const person = { brand_initials: "JK", first_name: "Jan", family_name: "Kowalski" };

const english = {
  ...person, ...empty,
  summary: [{ position: "Engineer", description: "Builds tools", default: true }],
  tech_stack: ["TypeScript", "React"],
  interests: ["Music"],
  experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["Built the editor"] }],
};
const polish = {
  ...person, ...empty,
  summary: [{ position: "Inżynier", description: "Buduje narzędzia", default: true }],
  tech_stack: ["TypeScript", "React"],
  interests: ["Muzyka"],
  experience: [{ period: "2020 - obecnie", company: "Acme", role: "Inżynier", highlights: ["Zbudował edytor"] }],
};

/** A default the app has already linked with random UUIDs. */
async function withUuids(document) {
  const { ensureResumeEntryIds, RESUME_LINKAGE_KEY } = await load();
  const linked = ensureResumeEntryIds(document);
  for (const [key, value] of Object.entries(linked)) {
    if (Array.isArray(value) && value.every((row) => row && typeof row === "object")) linked[key] = value.map((row) => ({ ...row, entry_id: randomUUID() }));
  }
  const entries = linked[RESUME_LINKAGE_KEY].entries;
  for (const key of Object.keys(entries)) entries[key] = entries[key].map(() => randomUUID());
  return linked;
}

function install(en, pl, defaultLocale = "en") {
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === defaultLocale, sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "Jan Kowalski", yaml_content: yaml.dump(en), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "Jan Kowalski", yaml_content: yaml.dump(pl), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
    ],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  });
}

async function load() {
  return { ...(await import("../app/lib/resume-server.ts")), ...(await import("../app/lib/resume-language-linkage.ts")) };
}
const storedYaml = (fake, locale) => fake.rows("resume_documents").find((row) => row.locale === locale).yaml_content;
const stored = (fake, locale) => yaml.load(storedYaml(fake, locale));
const save = async (locale, document, extra = {}) =>
  (await load()).publishResumeDocument("token", USER, locale, { yamlContent: yaml.dump(document), title: "Jan Kowalski", changeNote: locale, ...extra });
// The editor gives a legacy translation position-derived "legacy-..." IDs.
const asEditorSends = async (document) => (await load()).ensureResumeEntryIds(document);
const conflictsOf = (reason) => (error) => {
  assert.equal(error.name, "ResumeLegacyPairingError");
  assert.deepEqual(error.conflicts, reason);
  return true;
};

function assertTranslationKept(document, label) {
  assert.equal(document.summary[0].position, "Inżynier", `${label}: summary role`);
  assert.equal(document.summary[0].description, "Buduje narzędzia", `${label}: summary description`);
  assert.equal(document.experience[0].role, "Inżynier", `${label}: experience role`);
  assert.deepEqual(document.experience[0].highlights, ["Zbudował edytor"], `${label}: highlights`);
  assert.deepEqual(document.tech_stack, ["TypeScript", "React"], `${label}: tech_stack`);
  assert.deepEqual(document.interests, ["Muzyka"], `${label}: interests`);
}

test("first linking leaves an unconfirmed legacy translation unchanged and asks for confirmation", async (t) => {
  const fake = install(english, polish);
  t.after(() => fake.restore());
  const before = storedYaml(fake, "pl");

  const saved = await save("en", english);

  assert.ok(saved, "the default language itself is saved");
  assert.equal(storedYaml(fake, "pl"), before, "a single summary or a translated interest is not proof");
  assert.deepEqual(saved.synchronizationFailed, [{ locale: "pl", reason: "legacy-pairing", conflicts: [
    { collection: "summary", reason: "ambiguous" },
    { collection: "interests", reason: "ambiguous" },
  ] }]);
});

test("a confirmed save keeps role, description and text lists: UUID default, legacy translation sent with editor IDs", async (t) => {
  const englishLinked = await withUuids(english);
  const fake = install(englishLinked, polish);
  t.after(() => fake.restore());
  const before = storedYaml(fake, "pl");
  const { validateResumeLanguagePair } = await load();
  const editorPolish = await asEditorSends(polish);

  await assert.rejects(save("pl", editorPolish), conflictsOf([{ collection: "summary", reason: "ambiguous" }, { collection: "interests", reason: "ambiguous" }]));
  assert.equal(storedYaml(fake, "pl"), before, "refused without changing anything");

  assert.ok(await save("pl", editorPolish, { confirmLegacyPairing: true }));
  assertTranslationKept(stored(fake, "pl"), "pl after the confirmed save");
  assert.deepEqual(stored(fake, "pl").experience.map((row) => row.entry_id), englishLinked.experience.map((row) => row.entry_id), "linked to the default's UUIDs, not the editor's legacy- IDs");
  assert.deepEqual(validateResumeLanguagePair(englishLinked, stored(fake, "pl")), []);

  assert.ok(await save("en", englishLinked));
  assertTranslationKept(stored(fake, "pl"), "pl after the default save");
});

test("a legacy translation with a different number of entries is refused, even when confirmed", async (t) => {
  const extra = { ...polish, experience: [...polish.experience, { period: "2016 - 2019", company: "Earlier Co", role: "Stażysta", highlights: ["Tylko po polsku"] }] };
  const fake = install(await withUuids(english), extra);
  t.after(() => fake.restore());
  const before = storedYaml(fake, "pl");

  for (const confirmLegacyPairing of [false, true]) {
    await assert.rejects(save("pl", await asEditorSends(extra), { confirmLegacyPairing }), (error) =>
      error.conflicts.some((conflict) => conflict.collection === "experience" && conflict.reason === "count"));
  }
  assert.equal(storedYaml(fake, "pl"), before);
});

test("Alpha/Beta and a contradicting entry are refused on save and on first linking, even when confirmed", async (t) => {
  const englishAB = { ...english, experience: [
    { period: "2020 - 2021", company: "Alpha", role: "Engineer A", highlights: [] },
    { period: "2020 - 2022", company: "Beta", role: "Engineer B", highlights: [] },
  ] };
  const cases = [
    ["Alpha/Beta swapped", [englishAB.experience[1], englishAB.experience[0]].map((row) => ({ ...row, role: `PL ${row.company}` })), { reason: "order", index: 0 }],
    ["one matching, one contradicting", [{ ...englishAB.experience[0], role: "PL Alpha" }, { period: "2019 - 2020", company: "Gamma", role: "PL Gamma", highlights: [] }], { reason: "mismatch", index: 1 }],
  ];
  for (const [label, rows, conflict] of cases) {
    const polishCase = { ...polish, experience: rows };
    const fake = install(englishAB, polishCase);
    const before = { en: storedYaml(fake, "en"), pl: storedYaml(fake, "pl") };
    for (const confirmLegacyPairing of [false, true]) {
      await assert.rejects(save("pl", await asEditorSends(polishCase), { confirmLegacyPairing }), (error) =>
        error.conflicts.some((entry) => entry.collection === "experience" && entry.reason === conflict.reason && entry.index === conflict.index));
    }
    assert.deepEqual({ en: storedYaml(fake, "en"), pl: storedYaml(fake, "pl") }, before, `${label}: both documents unchanged`);
    const saved = await save("en", englishAB);
    assert.equal(storedYaml(fake, "pl"), before.pl, `${label}: the sync leaves it unchanged too`);
    assert.ok(saved.synchronizationFailed[0].conflicts.some((entry) => entry.reason === conflict.reason), label);
    fake.restore();
  }
});

test("linked versions are never remapped by position", async (t) => {
  const { buildResumeLanguageTemplate } = await load();
  const englishLinked = await withUuids({ ...english, experience: [
    { period: "2020 - 2021", company: "Alpha", role: "Engineer A", highlights: [] },
    { period: "2020 - 2022", company: "Beta", role: "Engineer B", highlights: [] },
  ] });
  const polishLinked = buildResumeLanguageTemplate(englishLinked);
  polishLinked.experience = polishLinked.experience.map((row) => ({ ...row, role: `PL ${row.company}` }));
  const ids = polishLinked.experience.map((row) => row.entry_id);
  const fake = install(englishLinked, polishLinked);
  t.after(() => fake.restore());

  assert.ok(await save("pl", polishLinked), "no legacy check and no confirmation for a linked translation");
  assert.ok(await save("en", englishLinked));
  assert.deepEqual(stored(fake, "pl").experience.map((row) => [row.entry_id, row.role]), [[ids[0], "PL Alpha"], [ids[1], "PL Beta"]]);
});

test("replacing a linked default with ID-less content does not attach old translations to new entries", async (t) => {
  const { ensureResumeEntryIds, buildResumeLanguageTemplate } = await load();
  // A default the app created from a legacy document carries position-derived IDs.
  const englishLinked = ensureResumeEntryIds(english);
  const polishLinked = buildResumeLanguageTemplate(englishLinked);
  polishLinked.experience[0].role = "Inżynier w Acme";
  const fake = install(englishLinked, polishLinked);
  t.after(() => fake.restore());

  const replacement = { ...person, ...empty, tech_stack: [], interests: [],
    summary: [{ position: "Template role", description: "Template", default: true }],
    experience: [{ period: "2010 - 2012", company: "Totally Different Co", role: "Intern", highlights: [] }] };
  assert.ok(await save("en", replacement));

  const en = stored(fake, "en");
  const pl = stored(fake, "pl");
  assert.notEqual(en.experience[0].entry_id, englishLinked.experience[0].entry_id, "a new entry gets a new ID");
  assert.equal(pl.experience[0].entry_id, en.experience[0].entry_id);
  assert.equal(pl.experience[0].role, "", "the old translation is not shown under a different entry");
});

test("switching the default to an unconfirmed legacy translation is refused; after a confirmed save it keeps both", async (t) => {
  const englishLinked = await withUuids(english);
  const fake = install(englishLinked, polish);
  t.after(() => fake.restore());
  const before = { en: storedYaml(fake, "en"), pl: storedYaml(fake, "pl") };
  const { switchDefaultResumeLocale } = await load();

  const refused = await switchDefaultResumeLocale("token", USER, "pl");
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.conflicts, [{ collection: "summary", reason: "ambiguous" }, { collection: "interests", reason: "ambiguous" }]);
  assert.deepEqual({ en: storedYaml(fake, "en"), pl: storedYaml(fake, "pl") }, before);

  assert.ok(await save("pl", await asEditorSends(polish), { confirmLegacyPairing: true }));
  assert.equal((await switchDefaultResumeLocale("token", USER, "pl")).ok, true);
  assertTranslationKept(stored(fake, "pl"), "pl as the new default");
  assert.equal(stored(fake, "en").experience[0].role, "Engineer", "the old default is kept as a translation");
  assert.equal(stored(fake, "en").summary[0].description, "Builds tools");
});

test("a confirmed legacy save whose revision fails is finished by a plain retry, without a conflict or a second revision", async (t) => {
  const englishLinked = await withUuids(english);
  let failRevision = true;
  const fake = installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === "en", sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "Jan Kowalski", yaml_content: yaml.dump(englishLinked), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "Jan Kowalski", yaml_content: yaml.dump(polish), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
    ],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  }, {
    onRequest: (request) => {
      if (failRevision && request.path === "rpc/create_resume_revision" && JSON.parse(request.body).input_document_id === "doc-pl") {
        failRevision = false;
        return new Response(JSON.stringify({ message: "temporary" }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
    },
  });
  t.after(() => fake.restore());

  const first = await save("pl", await asEditorSends(polish), { confirmLegacyPairing: true, baseUpdatedAt: "2025-01-01T00:00:00.000Z" });
  assert.deepEqual(first.incomplete, ["revision"]);
  assertTranslationKept(stored(fake, "pl"), "pl after the partial save");
  const writtenAt = fake.rows("resume_documents").find((row) => row.id === "doc-pl").updated_at;

  // The editor retries with the stored, canonical version it adopted, without asking again.
  const retry = await (await load()).publishResumeDocument("token", USER, "pl", {
    yamlContent: first.document.yaml_content, title: "Jan Kowalski", changeNote: "pl", baseUpdatedAt: first.document.updated_at,
  });
  assert.deepEqual(retry.incomplete, []);
  assert.equal(fake.rows("resume_documents").find((row) => row.id === "doc-pl").updated_at, writtenAt, "not rewritten");
  assert.equal(fake.rows("resume_revisions").filter((row) => row.document_id === "doc-pl").length, 1);
  assertTranslationKept(stored(fake, "pl"), "pl after the retry");
});
