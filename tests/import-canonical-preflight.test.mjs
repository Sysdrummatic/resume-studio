import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// Import preflight: every document an import will replace, synchronize or use as
// the source of linkage IDs is checked before the first write. A refused import
// leaves languages, documents and revisions exactly as they were.
// Isolated: the real resume-server code runs against an in-memory PostgREST
// (no RLS, no triggers), so this proves the app's writes, not Supabase.

const USER = "77777777-7777-7777-7777-777777777777";
const GLOBAL_LANGUAGES = ["en", "pl", "de"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));
const person = { brand_initials: "JK", first_name: "Jan", family_name: "Kowalski", contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], interests: [], gdpr_clause: "", tech_stack: [], summary: [] };
const rows = [
  { period: "2020 - 2021", company: "Alpha", highlights: [] },
  { period: "2021 - 2022", company: "Beta", highlights: [] },
];
const withRoles = (roles, ids) => ({ ...person, experience: rows.map((row, index) => ({ ...row, role: roles[index], ...(ids ? { entry_id: ids[index] } : {}) })), ...(ids ? { __ocv: { entries: { tech_stack: [], interests: [] } } } : {}) });

const english = (ids) => withRoles(["Engineer A", "Engineer B"], ids);
const polish = (ids) => withRoles(["Rola A", "Rola B"], ids);
const german = (ids) => withRoles(["Rolle A", "Rolle B"], ids);
const brokenIds = ["dup-1", "dup-1"];
const linkedIds = ["alpha-1", "beta-1"];
const foreignIds = ["foreign-a", "foreign-b"];

function account(defaultLocale, documents) {
  return {
    resume_languages: GLOBAL_LANGUAGES,
    resume_user_locales: Object.keys(documents).map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === defaultLocale, sort_order: (index + 1) * 10 })),
    resume_documents: Object.entries(documents).map(([locale, document]) => ({ id: `doc-${locale}`, user_id: USER, locale, title: locale, yaml_content: yaml.dump(document), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" })),
    resume_revisions: [],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  };
}
const bundleOf = (defaultLocale, documents) => ({
  languages: ["en", "pl", "de"].filter((code) => code === defaultLocale || documents[code]).map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), is_default: code === defaultLocale, sort_order: index })),
  documents: Object.entries(documents).map(([locale, document]) => ({ locale, title: `Master resume ${locale}`, yaml_content: yaml.dump(document) })),
});

async function runImport(seed, bundle) {
  const fake = installFakePostgrest(seed);
  const { importLanguagesAndDocuments } = await import("../app/lib/resume-server.ts");
  const snapshot = () => structuredClone({ documents: fake.rows("resume_documents"), locales: fake.rows("resume_user_locales"), revisions: fake.rows("resume_revisions") });
  const before = snapshot();
  const result = await importLanguagesAndDocuments("token", USER, bundle);
  return { fake, result, before, after: snapshot(), writes: fake.calls.filter((call) => call.method !== "GET") };
}
const stored = (fake, locale) => yaml.load(fake.rows("resume_documents").find((row) => row.locale === locale).yaml_content);
const storedRoles = (fake, locale) => stored(fake, locale).experience.map((row) => row.role);

const refusals = [
  {
    name: "broken EN default, legacy PL, bundle makes PL the default and carries only a replacement EN (last confirmed bug)",
    seed: account("en", { en: english(brokenIds), pl: polish() }),
    bundle: bundleOf("pl", { en: english(linkedIds) }),
    status: 409,
    code: "default-document-required",
    mentions: /"pl"/,
  },
  {
    name: "sound EN default, legacy PL, bundle makes PL the default and replaces EN (the ID source would be replaced)",
    seed: account("en", { en: english(linkedIds), pl: polish() }),
    bundle: bundleOf("pl", { en: english(linkedIds) }),
    status: 409,
    code: "default-document-required",
    mentions: /"pl"/,
  },
  {
    name: "mirror: broken PL default, legacy EN, bundle makes EN the default and carries only a replacement PL",
    seed: account("pl", { pl: polish(brokenIds), en: english() }),
    bundle: bundleOf("en", { pl: polish(linkedIds) }),
    status: 409,
    code: "default-document-required",
    mentions: /"en"/,
  },
  {
    name: "new default has neither a bundle document nor a stored one",
    seed: account("en", { en: english(linkedIds) }),
    bundle: bundleOf("pl", { en: english(linkedIds) }),
    status: 400,
    mentions: /"pl"/,
  },
  {
    name: "a legacy bundle translation that cannot be paired unambiguously with the bundle default",
    seed: account("en", { en: english(linkedIds) }),
    bundle: bundleOf("en", { en: english(linkedIds), pl: { ...polish(), summary: [{ position: "Rola", description: "", default: true }] } }),
    status: 409,
    code: "legacy-pairing",
    mentions: /"pl"/,
  },
  {
    name: "a stored translation outside the bundle whose entries the replaced default no longer has (same default language)",
    seed: account("en", { en: english(linkedIds), de: german(linkedIds) }),
    bundle: bundleOf("en", { en: english(foreignIds) }),
    status: 409,
    code: "translations-would-be-lost",
    mentions: /"de"/,
  },
  {
    name: "a stored translation outside the bundle whose entries the new default does not have (default switches EN to PL)",
    seed: account("en", { en: english(linkedIds), de: german(linkedIds) }),
    bundle: bundleOf("pl", { pl: polish(foreignIds), en: english(foreignIds) }),
    status: 409,
    code: "translations-would-be-lost",
    mentions: /"de"/,
  },
  {
    name: "a stored translation outside the bundle that reuses an ID while the default switches",
    seed: account("en", { en: english(linkedIds), de: german(brokenIds) }),
    bundle: bundleOf("pl", { pl: polish(linkedIds), en: english(linkedIds) }),
    status: 409,
    code: "duplicate-ids",
    mentions: /"de"/,
  },
];

for (const scenario of refusals) {
  test(`import is refused before any write: ${scenario.name}`, async (t) => {
    const { fake, result, before, after, writes } = await runImport(scenario.seed, scenario.bundle);
    t.after(() => fake.restore());

    assert.deepEqual(after, before, "languages, documents and revisions are unchanged");
    assert.deepEqual(writes, [], "nothing is written");
    assert.equal(result.ok, false);
    assert.equal(result.status, scenario.status);
    if (scenario.code) assert.equal(result.code, scenario.code);
    assert.match(result.error, scenario.mentions);
  });
}

test("a bundle without the new default's document succeeds when that document is already linked", async (t) => {
  const { fake, result } = await runImport(
    account("en", { en: english(linkedIds), pl: polish(linkedIds) }),
    bundleOf("pl", { en: { ...english(linkedIds), experience: english(linkedIds).experience.map((row) => ({ ...row, role: `${row.role} (new)` })) } }),
  );
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(fake.rows("resume_user_locales").filter((row) => row.is_default).map((row) => row.locale), ["pl"]);
  assert.deepEqual(storedRoles(fake, "pl"), ["Rola A", "Rola B"], "the new default keeps its content");
  assert.deepEqual(storedRoles(fake, "en"), ["Engineer A (new)", "Engineer B (new)"], "the replacement EN is stored, linked by ID");
  assert.deepEqual(stored(fake, "en").experience.map((row) => row.entry_id), linkedIds);
});

test("a full bundle replaces every document, including stored ones with duplicate IDs, and keeps EN/PL/DE roles", async (t) => {
  const { fake, result } = await runImport(
    account("en", { en: english(brokenIds), pl: polish(), de: german(brokenIds) }),
    bundleOf("pl", { pl: polish(foreignIds), en: english(foreignIds), de: german(foreignIds) }),
  );
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(storedRoles(fake, "pl"), ["Rola A", "Rola B"]);
  assert.deepEqual(storedRoles(fake, "en"), ["Engineer A", "Engineer B"]);
  assert.deepEqual(storedRoles(fake, "de"), ["Rolle A", "Rolle B"]);
  for (const locale of ["pl", "en", "de"]) assert.deepEqual(stored(fake, locale).experience.map((row) => row.entry_id), foreignIds, locale);
});

test("an import that fails on a document write can be retried to the same final state", async (t) => {
  const seed = account("en", { en: english(linkedIds), pl: polish(linkedIds) });
  const bundle = bundleOf("en", { en: english(foreignIds), pl: polish(foreignIds) });
  let failed = false;
  const fake = installFakePostgrest(seed, {
    onRequest: (request) => {
      if (!failed && request.method === "PATCH" && request.path === "resume_documents" && request.url.search.includes("doc-pl")) {
        failed = true;
        return new Response(JSON.stringify({ message: "temporary" }), { status: 503, headers: { "Content-Type": "application/json" } });
      }
    },
  });
  t.after(() => fake.restore());
  const { importLanguagesAndDocuments } = await import("../app/lib/resume-server.ts");

  const first = await importLanguagesAndDocuments("token", USER, bundle);
  assert.equal(first.ok, false, "the failed write is reported, not hidden");
  const retry = await importLanguagesAndDocuments("token", USER, bundle);

  assert.deepEqual(retry, { ok: true });
  assert.deepEqual(storedRoles(fake, "en"), ["Engineer A", "Engineer B"]);
  assert.deepEqual(storedRoles(fake, "pl"), ["Rola A", "Rola B"]);
  assert.deepEqual(stored(fake, "pl").experience.map((row) => row.entry_id), foreignIds);
});
