import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// Language versions are parallel lists (ADR 0024). Isolated: the real
// resume-server code against an in-memory PostgREST (no RLS, no triggers).

const USER = "55555555-5555-5555-5555-555555555555";
const OLD = "2025-06-01T00:00:00.000Z";
const LANGUAGES = ["en", "pl"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));

const base = {
  brand_initials: "JK", first_name: "Jan", family_name: "Kowalski", gdpr_clause: "",
  summary: [{ position: "Engineer", description: "Builds", default: true }],
  contact: [], qr_codes: [], skills: [{ name: "Writing", level: 4 }], languages: [], education: [], courses: [],
  tech_stack: ["TypeScript"], interests: ["Music"],
  experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["Built the editor"] }],
};

async function documents() {
  const { buildLanguageTemplate } = await import("../app/lib/resume-language-parity.ts");
  const polish = buildLanguageTemplate(base);
  polish.experience[0].role = "Inżynier";
  return { english: base, polish };
}

function install(docs, extra = {}) {
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === "en", sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "Jan Kowalski", yaml_content: yaml.dump(docs.english), schema_version: 1, updated_at: OLD },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "Jan Kowalski", yaml_content: yaml.dump(docs.polish), schema_version: 1, updated_at: OLD },
    ],
    resume_revisions: [],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
    ...extra,
  });
}

const row = (fake, id) => fake.rows("resume_documents").find((entry) => entry.id === id);

test("saving one version stores it without entry IDs and leaves the other versions untouched", async (t) => {
  const docs = await documents();
  const fake = install(docs);
  t.after(() => fake.restore());
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");
  const before = row(fake, "doc-pl").yaml_content;
  const withIds = {
    ...base,
    experience: [{ entry_id: "exp-1", ...base.experience[0], company: "Acme Corp" }],
    __ocv: { entries: { tech_stack: ["t-1"], interests: ["i-1"] } },
  };

  const saved = await publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(withIds), title: "Jan Kowalski", changeNote: "default", baseUpdatedAt: OLD });

  assert.ok(saved?.document);
  assert.equal("synchronized" in saved, false, "there is no synchronization step any more");
  const stored = yaml.load(row(fake, "doc-en").yaml_content);
  assert.equal(stored.experience[0].company, "Acme Corp");
  assert.deepEqual(stored.tech_stack, ["TypeScript"]);
  assert.doesNotMatch(row(fake, "doc-en").yaml_content, /entry_id|__ocv/);
  assert.equal(row(fake, "doc-pl").yaml_content, before, "the translation is not rewritten");
});

test("a rollback that would make a version differ from the others is refused before anything changes", async (t) => {
  const docs = await documents();
  const longer = { ...base, experience: [...base.experience, { period: "2018", company: "Beta", role: "Dev", highlights: [] }] };
  const fake = install(docs, {
    resume_revisions: [{ id: "rev-1", document_id: "doc-en", revision_number: 1, locale: "en", title: "t", yaml_content: yaml.dump(longer), schema_version: 1, change_note: null, created_at: OLD, created_by: USER }],
  });
  t.after(() => fake.restore());
  const { rollbackResumeDocument, ResumeParityError } = await import("../app/lib/resume-server.ts");
  const writesBefore = fake.calls.filter((call) => call.method !== "GET").length;

  await assert.rejects(rollbackResumeDocument("token", USER, "en", "doc-en", 1), (error) => {
    assert.ok(error instanceof ResumeParityError);
    assert.ok(error.issues.some((issue) => issue.kind === "count" && issue.collection === "experience" && issue.locale === "pl"));
    return true;
  });
  assert.equal(fake.calls.filter((call) => call.method !== "GET").length, writesBefore, "nothing was written");
});

test("switching the default language only moves the default flag", async (t) => {
  const docs = await documents();
  const fake = install(docs);
  t.after(() => fake.restore());
  const { switchDefaultResumeLocale } = await import("../app/lib/resume-server.ts");
  const documentsBefore = structuredClone(fake.rows("resume_documents"));

  const result = await switchDefaultResumeLocale("token", USER, "pl");

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(fake.rows("resume_user_locales").filter((entry) => entry.is_default).map((entry) => entry.locale), ["pl"]);
  assert.deepEqual(fake.rows("resume_documents"), documentsBefore, "no document is rewritten");
});

test("switching to a language without a document is refused", async (t) => {
  const docs = await documents();
  const fake = install(docs, {
    resume_user_locales: [
      { user_id: USER, locale: "en", label_override: null, short_label_override: null, is_default: true, sort_order: 10 },
      { user_id: USER, locale: "pl", label_override: null, short_label_override: null, is_default: false, sort_order: 20 },
    ],
    resume_documents: [{ id: "doc-en", user_id: USER, locale: "en", title: "Jan", yaml_content: yaml.dump(docs.english), schema_version: 1, updated_at: OLD }],
  });
  t.after(() => fake.restore());
  const { switchDefaultResumeLocale } = await import("../app/lib/resume-server.ts");

  assert.deepEqual(await switchDefaultResumeLocale("token", USER, "pl"), { ok: false });
  assert.deepEqual(fake.rows("resume_user_locales").filter((entry) => entry.is_default).map((entry) => entry.locale), ["en"]);
});
