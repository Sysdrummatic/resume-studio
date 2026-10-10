import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// Import preflight: the versions that remain after an import (the bundle's documents
// plus the stored ones it does not replace) must be parallel lists (ADR 0024).
// A refused import leaves languages, documents and revisions exactly as they were.
// Isolated: the real resume-server code runs against an in-memory PostgREST
// (no RLS, no triggers), so this proves the app's writes, not Supabase.

const USER = "77777777-7777-7777-7777-777777777777";
const GLOBAL_LANGUAGES = ["en", "pl", "de"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));
const person = { brand_initials: "JK", first_name: "Jan", family_name: "Kowalski", contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], interests: [], gdpr_clause: "", tech_stack: [], summary: [] };
const rows = [
  { period: "2020 - 2021", company: "Alpha", highlights: [] },
  { period: "2021 - 2022", company: "Beta", highlights: [] },
];
const withRoles = (roles, extraRows = []) => ({ ...person, experience: [...rows, ...extraRows].map((row, index) => ({ ...row, role: roles[index] ?? "" })) });

const english = (extraRows) => withRoles(["Engineer A", "Engineer B", "Engineer C"], extraRows);
const polish = (extraRows) => withRoles(["Rola A", "Rola B", "Rola C"], extraRows);
const german = (extraRows) => withRoles(["Rolle A", "Rolle B", "Rolle C"], extraRows);
const third = [{ period: "2022 - 2023", company: "Gamma", highlights: [] }];

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
    name: "a bundle whose translation has fewer entries than its default",
    seed: account("en", { en: english() }),
    bundle: bundleOf("en", { en: english(third), pl: polish() }),
    status: 409,
    code: "parity",
    mentions: /do not have the same entries/,
  },
  {
    name: "a stored translation outside the bundle that the replaced default no longer matches",
    seed: account("en", { en: english(), de: german() }),
    bundle: bundleOf("en", { en: english(third) }),
    status: 409,
    code: "parity",
    mentions: /do not have the same entries/,
  },
  {
    name: "the new default has neither a bundle document nor a stored one",
    seed: account("en", { en: english() }),
    bundle: bundleOf("pl", { en: english() }),
    status: 400,
    mentions: /"pl"/,
  },
  {
    name: "the default switches to a language whose stored document has a different number of entries",
    seed: account("en", { en: english(), de: german(third) }),
    bundle: bundleOf("de", { en: english() }),
    status: 409,
    code: "parity",
    mentions: /do not have the same entries/,
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

test("a bundle without the new default's document succeeds when that document is already parallel", async (t) => {
  const { fake, result } = await runImport(
    account("en", { en: english(), pl: polish() }),
    bundleOf("pl", { en: { ...english(), experience: english().experience.map((row) => ({ ...row, role: `${row.role} (new)` })) } }),
  );
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(fake.rows("resume_user_locales").filter((row) => row.is_default).map((row) => row.locale), ["pl"]);
  assert.deepEqual(storedRoles(fake, "pl"), ["Rola A", "Rola B"], "the new default keeps its content");
  assert.deepEqual(storedRoles(fake, "en"), ["Engineer A (new)", "Engineer B (new)"], "the replacement EN is stored");
});

test("a full bundle replaces every document and keeps EN/PL/DE roles", async (t) => {
  const { fake, result } = await runImport(
    account("en", { en: english(), pl: polish(), de: german() }),
    bundleOf("pl", { pl: polish(third), en: english(third), de: german(third) }),
  );
  t.after(() => fake.restore());

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(storedRoles(fake, "pl"), ["Rola A", "Rola B", "Rola C"]);
  assert.deepEqual(storedRoles(fake, "en"), ["Engineer A", "Engineer B", "Engineer C"]);
  assert.deepEqual(storedRoles(fake, "de"), ["Rolle A", "Rolle B", "Rolle C"]);
});

test("an import that fails on a document write can be retried to the same final state", async (t) => {
  const seed = account("en", { en: english(), pl: polish() });
  const bundle = bundleOf("en", { en: english(), pl: polish() });
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
});
