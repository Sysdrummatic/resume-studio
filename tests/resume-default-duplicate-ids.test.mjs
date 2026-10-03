import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// One entry_id on two different default entries pairs both with the same
// translation: the sync then copies one translated entry over the other.
// Isolated: the real resume-server code runs against an in-memory PostgREST
// (no RLS, no triggers), so this proves the app's writes, not Supabase.

const USER = "66666666-6666-6666-6666-666666666666";
const LANGUAGES = ["en", "pl"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));
const empty = { brand_initials: "JK", first_name: "Jan", family_name: "Kowalski", summary: [], contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], interests: [], gdpr_clause: "" };

const englishRows = [
  { period: "2020 - 2021", company: "Alpha", role: "Engineer A", highlights: ["Alpha work"] },
  { period: "2021 - 2022", company: "Beta", role: "Engineer B", highlights: ["Beta work"] },
];
const legacyEnglish = { ...empty, tech_stack: ["TypeScript", "React"], experience: englishRows };
// Legacy PL that pairs with the default by company + start year.
const legacyPolish = { ...empty, tech_stack: ["TypeScript", "React"], experience: [
  { period: "2020 - 2021", company: "Alpha", role: "Rola A", highlights: ["Praca w Alpha"] },
  { period: "2021 - 2022", company: "Beta", role: "Rola B", highlights: ["Praca w Beta"] },
] };

const duplicateExperienceIds = { ...legacyEnglish, experience: englishRows.map((row) => ({ ...row, entry_id: "dup-1" })), __ocv: { entries: { tech_stack: ["tech-1", "tech-2"], interests: [] } } };
const duplicateTextListIds = { ...legacyEnglish, experience: englishRows.map((row, index) => ({ ...row, entry_id: `exp-${index}` })), __ocv: { entries: { tech_stack: ["tech-1", "tech-1"], interests: [] } } };

function install({ storedEnglish }) {
  const documents = [{ id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: yaml.dump(legacyPolish), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" }];
  if (storedEnglish) documents.push({ id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(storedEnglish), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" });
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === "en", sort_order: (index + 1) * 10 })),
    resume_documents: documents,
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  });
}

async function server() {
  return import("../app/lib/resume-server.ts");
}
const save = {
  publish: async (document) => (await server()).publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(document), title: "en", changeNote: "first save" }),
  draft: async (document) => (await server()).saveResumeDraftDocument("token", USER, "en", { yamlContent: yaml.dump(document), title: "en" }),
};
const documentWrites = (fake) => fake.calls.filter((call) => call.method !== "GET" && (call.target === "resume_documents" || call.target === "create_resume_revision"));
const polishRows = (fake) => yaml.load(fake.rows("resume_documents").find((row) => row.id === "doc-pl").yaml_content).experience.map((row) => [row.company, row.role, row.highlights[0]]);

for (const [idCase, document, collection] of [["experience entry_id", duplicateExperienceIds, "experience"], ["__ocv.entries text list", duplicateTextListIds, "tech_stack"]]) {
  for (const path of ["publish", "draft"]) {
    for (const [storedCase, storedEnglish] of [["no stored default yet", null], ["a legacy stored default", legacyEnglish]]) {
      test(`the first ${path} save of a default reusing an ${idCase} is refused before any write (${storedCase})`, async (t) => {
        const fake = install({ storedEnglish });
        t.after(() => fake.restore());
        const { ResumeLanguageLinkageError } = await server();
        const before = structuredClone(fake.rows("resume_documents"));

        const outcome = await save[path](document).then((value) => ({ value }), (error) => ({ error }));

        // Checked first: accepting the document is what makes the PL entries copies.
        assert.deepEqual(polishRows(fake), [["Alpha", "Rola A", "Praca w Alpha"], ["Beta", "Rola B", "Praca w Beta"]], "the two PL entries stay different");
        assert.deepEqual(documentWrites(fake), [], "no document or revision is written");
        assert.deepEqual(fake.rows("resume_documents"), before);
        assert.ok(outcome.error instanceof ResumeLanguageLinkageError, "the save is refused with a linkage conflict");
        assert.ok(outcome.error.issues.length > 0 && outcome.error.issues.every((issue) => issue.kind === "duplicate-id" && issue.collection === collection), JSON.stringify(outcome.error.issues));
      });
    }
  }
}

test("a stored default with duplicate IDs can be repaired by saving it with unique IDs", async (t) => {
  const fake = install({ storedEnglish: duplicateExperienceIds });
  t.after(() => fake.restore());
  const repaired = { ...duplicateExperienceIds, experience: [{ ...duplicateExperienceIds.experience[0] }, { ...duplicateExperienceIds.experience[1], entry_id: "beta-1" }] };

  const saved = await save.publish(repaired);

  assert.ok(saved, "the repair is accepted");
  assert.deepEqual(yaml.load(fake.rows("resume_documents").find((row) => row.id === "doc-en").yaml_content).experience.map((row) => row.entry_id), ["dup-1", "beta-1"]);
});

test("a legacy default without IDs still gets its position-derived IDs on first save", async (t) => {
  const fake = install({ storedEnglish: null });
  t.after(() => fake.restore());

  assert.ok(await save.publish(legacyEnglish));

  const stored = yaml.load(fake.rows("resume_documents").find((row) => row.locale === "en").yaml_content);
  assert.deepEqual(stored.experience.map((row) => row.entry_id), ["legacy-experience-0", "legacy-experience-1"]);
  assert.deepEqual(stored.__ocv.entries.tech_stack, ["legacy-tech_stack-0", "legacy-tech_stack-1"]);
  assert.deepEqual(polishRows(fake), [["Alpha", "Rola A", "Praca w Alpha"], ["Beta", "Rola B", "Praca w Beta"]], "the PL entries are paired, not copied");
});

// A stored default that already reuses an ID (possible after older code) must
// never be the canonical side of a reconciliation: both entries would take the
// same translation. It is refused, not silently re-numbered, because nobody
// knows which translated entry belongs to which default entry.

function installBrokenDefault({ polish = legacyPolish } = {}) {
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === "en", sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(duplicateExperienceIds), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: yaml.dump(polish), schema_version: 1, updated_at: "2025-01-01T00:00:00.000Z" },
    ],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  });
}
const anyWrites = (fake) => fake.calls.filter((call) => call.method !== "GET");
const distinctPolish = [["Alpha", "Rola A", "Praca w Alpha"], ["Beta", "Rola B", "Praca w Beta"]];
const assertBrokenDefaultRefusal = (error, serverModule) => {
  assert.ok(error instanceof serverModule.ResumeDefaultDuplicateIdsError, error);
  assert.equal(error.locale, "en");
  assert.ok(error.issues.length > 0 && error.issues.every((issue) => issue.kind === "duplicate-id"));
  return true;
};

test("an import of only PL over a stored EN default with duplicate IDs is refused before any write", async (t) => {
  const fake = installBrokenDefault();
  t.after(() => fake.restore());
  const before = structuredClone({ documents: fake.rows("resume_documents"), locales: fake.rows("resume_user_locales") });
  const { importLanguagesAndDocuments } = await server();
  const bundle = {
    languages: [
      { code: "en", label: "English", short_label: "EN", is_default: true, sort_order: 0 },
      { code: "pl", label: "Polski", short_label: "PL", is_default: false, sort_order: 1 },
    ],
    documents: [{ locale: "pl", title: "Master resume PL", yaml_content: yaml.dump(legacyPolish) }],
  };

  const result = await importLanguagesAndDocuments("token", USER, bundle);

  assert.deepEqual(polishRows(fake), distinctPolish, "PL roles are not turned into copies");
  assert.equal(result.ok, false);
  assert.equal(result.status, 409);
  assert.equal(result.code, "default-duplicate-ids");
  assert.match(result.error, /"en"/);
  assert.ok(result.linkageIssues.every((issue) => issue.kind === "duplicate-id"), "the existing linkageIssues field is kept");
  assert.deepEqual(anyWrites(fake), [], "no language, document or revision is written");
  assert.deepEqual({ documents: fake.rows("resume_documents"), locales: fake.rows("resume_user_locales") }, before);
});

for (const confirmLegacyPairing of [false, true]) {
  test(`an ordinary translation save against a default with duplicate IDs is refused (confirmed order: ${confirmLegacyPairing})`, async (t) => {
    const fake = installBrokenDefault();
    t.after(() => fake.restore());
    const serverModule = await server();
    const { ensureResumeEntryIds } = await import("../app/lib/resume-language-linkage.ts");

    const outcome = await serverModule.publishResumeDocument("token", USER, "pl", {
      yamlContent: yaml.dump(ensureResumeEntryIds(legacyPolish)), title: "pl", changeNote: "pl", confirmLegacyPairing,
    }).then((value) => ({ value }), (error) => ({ error }));

    assert.deepEqual(polishRows(fake), distinctPolish);
    assert.deepEqual(anyWrites(fake), []);
    assertBrokenDefaultRefusal(outcome.error, serverModule);
  });
}

test("a linked translation is not reconciled against a default with duplicate IDs either", async (t) => {
  const { buildResumeLanguageTemplate } = await import("../app/lib/resume-language-linkage.ts");
  const linkedPolish = buildResumeLanguageTemplate(duplicateExperienceIds);
  linkedPolish.experience = linkedPolish.experience.map((row, index) => ({ ...row, role: legacyPolish.experience[index].role, highlights: legacyPolish.experience[index].highlights }));
  const fake = installBrokenDefault({ polish: linkedPolish });
  t.after(() => fake.restore());
  const serverModule = await server();

  const outcome = await serverModule.publishResumeDocument("token", USER, "pl", { yamlContent: yaml.dump(linkedPolish), title: "pl", changeNote: "pl" })
    .then((value) => ({ value }), (error) => ({ error }));

  assert.deepEqual(polishRows(fake), distinctPolish);
  assert.deepEqual(anyWrites(fake), []);
  assertBrokenDefaultRefusal(outcome.error, serverModule);
});

test("switching the default is refused while the current or the new default reuses an ID", async () => {
  const serverModule = await server();
  for (const [label, target] of [["current default is broken", "pl"], ["new default is broken", "en"]]) {
    const fake = installBrokenDefault();
    // For the second case PL is the default and EN (with the duplicate IDs) becomes the target.
    if (target === "en") for (const row of fake.rows("resume_user_locales")) row.is_default = row.locale === "pl";
    const before = structuredClone({ documents: fake.rows("resume_documents"), locales: fake.rows("resume_user_locales") });

    const result = await serverModule.switchDefaultResumeLocale("token", USER, target);

    assert.equal(result.ok, false, label);
    assert.ok(result.duplicates?.length && result.duplicates.every((issue) => issue.kind === "duplicate-id"), label);
    assert.deepEqual(anyWrites(fake), [], `${label}: nothing written`);
    assert.deepEqual({ documents: fake.rows("resume_documents"), locales: fake.rows("resume_user_locales") }, before, label);
    fake.restore();
  }
});

test("after the user saves the default with unique IDs, the translation links without copies", async (t) => {
  const fake = installBrokenDefault();
  t.after(() => fake.restore());
  const { publishResumeDocument } = await server();
  const repaired = { ...duplicateExperienceIds, experience: [{ ...duplicateExperienceIds.experience[0] }, { ...duplicateExperienceIds.experience[1], entry_id: "beta-1" }] };

  const saved = await publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(repaired), title: "en", changeNote: "repair" });

  // Saving the repaired default runs the language sync, which links PL.
  assert.ok(saved);
  assert.deepEqual(saved.synchronizationFailed, []);
  assert.deepEqual(polishRows(fake), distinctPolish);
  const pl = yaml.load(fake.rows("resume_documents").find((row) => row.id === "doc-pl").yaml_content);
  assert.deepEqual(pl.experience.map((row) => row.entry_id), ["dup-1", "beta-1"]);
});

test("the publish API reports a broken default with a code, the existing fields and EN/PL editor messages", async () => {
  const ts = (await import("typescript")).default;
  const { readFileSync } = await import("node:fs");
  const serverModule = await server();
  const plan = await import("../app/master-resume/locale-save-plan.ts");
  const js = ts.transpileModule(readFileSync(new URL("../app/api/resume/publish/route.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const route = {};
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "../../../lib/auth-request": { requireRequestActor: async () => ({ ok: true, actor: { userId: USER }, accessToken: "t" }) },
    "../../../lib/rate-limit": { rateLimit: async () => ({ success: true, reset: Date.now() }) },
    "../../../lib/resume-schema": await import("../app/lib/resume-schema.ts"),
    "../../../lib/supabase-http": { callRpc: async () => ({ data: true }) },
    "../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => {} },
    "../../../lib/resume-server": {
      ...serverModule,
      publishResumeDocument: async () => { throw new serverModule.ResumeDefaultDuplicateIdsError("en", [{ kind: "duplicate-id", collection: "experience", index: 1, actualId: "dup-1" }]); },
    },
  };
  new Function("require", "exports", js)((name) => modules[name], route);

  const response = await route.POST(new Request("http://localhost/api/resume/publish", { method: "POST", body: JSON.stringify({ locale: "pl", yamlContent: "name: Jan" }) }));
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "default-duplicate-ids");
  assert.equal(typeof body.error, "string");
  assert.deepEqual(body.linkageIssues, [{ kind: "duplicate-id", collection: "experience", index: 1, actualId: "dup-1" }]);

  const failure = plan.defaultDuplicateIdsFailure(body, "pl");
  assert.deepEqual(failure, { locale: "pl", key: plan.DEFAULT_DUPLICATE_IDS_MESSAGE, params: { locale: "pl", defaultLocale: "en" } });
  const yamlLib = (await import("js-yaml")).default;
  const rendered = ["en", "pl"].map((language) => yamlLib.load(readFileSync(new URL(`../app/i18n/locales/${language}.yaml`, import.meta.url), "utf8")).editor.text[failure.key]);
  assert.ok(rendered.every(Boolean), "both dictionaries translate the message");
  assert.notEqual(rendered[0], rendered[1]);
});

// Repairing the default must not touch a translation whose stored rows still
// share the old ID: pairing those rows by ID would give both the same text
// (or blank one). The sync leaves it unchanged and reports a conflict; the user
// then assigns the translation explicit IDs, which is an unambiguous mapping.

async function installBrokenPair() {
  const { buildResumeLanguageTemplate } = await import("../app/lib/resume-language-linkage.ts");
  const brokenPolish = buildResumeLanguageTemplate(duplicateExperienceIds);
  brokenPolish.experience = brokenPolish.experience.map((row, index) => ({ ...row, role: legacyPolish.experience[index].role, highlights: legacyPolish.experience[index].highlights }));
  assert.deepEqual(brokenPolish.experience.map((row) => row.entry_id), ["dup-1", "dup-1"], "fixture: both PL roles share the old ID");
  return { fake: installBrokenDefault({ polish: brokenPolish }), brokenPolish };
}
const repairedEnglish = { ...duplicateExperienceIds, experience: [{ ...duplicateExperienceIds.experience[0] }, { ...duplicateExperienceIds.experience[1], entry_id: "beta-1" }] };

test("repairing the default leaves a translation with duplicated stored IDs unchanged and reports it", async (t) => {
  const { fake } = await installBrokenPair();
  t.after(() => fake.restore());
  const polishBefore = fake.rows("resume_documents").find((row) => row.id === "doc-pl").yaml_content;
  const { publishResumeDocument } = await server();

  const saved = await publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(repairedEnglish), title: "en", changeNote: "repair" });

  assert.equal(fake.rows("resume_documents").find((row) => row.id === "doc-pl").yaml_content, polishBefore, "no PL role is overwritten or blanked");
  assert.deepEqual(polishRows(fake), distinctPolish);
  assert.ok(saved, "the default itself is repaired");
  assert.equal(saved.synchronizationFailed.length, 1);
  assert.equal(saved.synchronizationFailed[0].locale, "pl");
  assert.equal(saved.synchronizationFailed[0].reason, "duplicate-ids");
  assert.ok(saved.synchronizationFailed[0].issues.every((issue) => issue.kind === "duplicate-id"));
});

test("after the default is repaired, the user maps the translation explicitly by giving it unique IDs", async (t) => {
  const { fake, brokenPolish } = await installBrokenPair();
  t.after(() => fake.restore());
  const { publishResumeDocument } = await server();
  assert.ok(await publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(repairedEnglish), title: "en", changeNote: "repair" }));

  const mapped = { ...brokenPolish, experience: [{ ...brokenPolish.experience[0] }, { ...brokenPolish.experience[1], entry_id: "beta-1" }] };
  assert.ok(await publishResumeDocument("token", USER, "pl", { yamlContent: yaml.dump(mapped), title: "pl", changeNote: "map" }));

  assert.deepEqual(polishRows(fake), distinctPolish);
  const pl = yaml.load(fake.rows("resume_documents").find((row) => row.id === "doc-pl").yaml_content);
  assert.deepEqual(pl.experience.map((row) => row.entry_id), ["dup-1", "beta-1"]);
});

test("a translation save that itself reuses an ID is refused before reconciliation", async (t) => {
  const { fake, brokenPolish } = await installBrokenPair();
  t.after(() => fake.restore());
  const serverModule = await server();
  assert.ok(await serverModule.publishResumeDocument("token", USER, "en", { yamlContent: yaml.dump(repairedEnglish), title: "en", changeNote: "repair" }));
  const writesBefore = anyWrites(fake).length;

  const outcome = await serverModule.publishResumeDocument("token", USER, "pl", { yamlContent: yaml.dump(brokenPolish), title: "pl", changeNote: "pl" })
    .then((value) => ({ value }), (error) => ({ error }));

  assert.deepEqual(polishRows(fake), distinctPolish);
  assert.equal(anyWrites(fake).length, writesBefore, "nothing written");
  assert.ok(outcome.error instanceof serverModule.ResumeLanguageLinkageError, outcome.error);
  assert.ok(outcome.error.issues.some((issue) => issue.kind === "duplicate-id"));
});

test("the editor shows a sync conflict over duplicated translation IDs in English and Polish", async () => {
  const { readFileSync } = await import("node:fs");
  const plan = await import("../app/master-resume/locale-save-plan.ts");
  const messages = plan.synchronizationFailureMessages({ synchronizationFailed: [{ locale: "pl", reason: "duplicate-ids", issues: [{ kind: "duplicate-id", collection: "experience", index: 1, actualId: "dup-1" }] }], synchronizationComplete: true }, "en");

  assert.deepEqual(messages, [{ locale: "pl", key: plan.TRANSLATION_DUPLICATE_IDS_MESSAGE, params: { locale: "pl", collections: "experience" } }]);
  const yamlLib = (await import("js-yaml")).default;
  const rendered = ["en", "pl"].map((language) => yamlLib.load(readFileSync(new URL(`../app/i18n/locales/${language}.yaml`, import.meta.url), "utf8")).editor.text[messages[0].key]);
  assert.ok(rendered.every(Boolean));
  assert.notEqual(rendered[0], rendered[1]);
});
