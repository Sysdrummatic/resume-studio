import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// Reproduces the interleavings behind a lost translation: the default-language
// save rewrites every translation (ADR 0023 §4) while the editor, or another
// tab, saves that translation. Runs the real resume-server code against an
// in-memory PostgREST, so it proves the application's writes, not Supabase.

const USER = "33333333-3333-3333-3333-333333333333";
const OLD = "2025-06-01T00:00:00.000Z";
const LANGUAGES = ["en", "pl"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));

async function linkedDocuments() {
  const { ensureResumeEntryIds, buildResumeLanguageTemplate } = await import("../app/lib/resume-language-linkage.ts");
  const english = ensureResumeEntryIds({
    brand_initials: "JK", first_name: "Jan", family_name: "Kowalski",
    summary: [{ position: "Engineer", description: "Builds tools", default: true }],
    contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], gdpr_clause: "",
    tech_stack: ["TypeScript"], interests: ["Music"],
    experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["Built the editor"] }],
  });
  const polish = buildResumeLanguageTemplate(english);
  polish.summary[0].position = "Inżynier";
  polish.experience[0].role = "Inżynier";
  polish.tech_stack = ["TypeScript"];
  polish.interests = ["Muzyka"];
  const withRole = (role) => yaml.dump({ ...polish, experience: [{ ...polish.experience[0], role }] });
  return { english, polish, withRole };
}

function install(docs, onRequest) {
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === "en", sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "en", yaml_content: yaml.dump(docs.english), schema_version: 1, updated_at: OLD },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "pl", yaml_content: yaml.dump(docs.polish), schema_version: 1, updated_at: OLD },
    ],
    profiles: [{ id: USER, display_name: "Jan Kowalski", person_slug: "jan-kowalski", name_sync_mode: "manual" }],
  }, { onRequest });
}

const polishRow = (fake) => fake.rows("resume_documents").find((row) => row.id === "doc-pl");
const polishRole = (fake) => yaml.load(polishRow(fake).yaml_content).experience[0].role;
const isWriteTo = (request, id) => request.method === "PATCH" && request.path === "resume_documents" && request.url.search.includes(id);

test("the default-language sync does not overwrite a translation saved while it runs", async (t) => {
  const docs = await linkedDocuments();
  let fake;
  let injected = false;
  fake = install(docs, (request) => {
    // The sync has already read the old translation; the translation save lands now.
    if (!injected && isWriteTo(request, "doc-pl")) {
      injected = true;
      fake.update("resume_documents", (row) => row.id === "doc-pl", { yaml_content: docs.withRole("Świeże tłumaczenie") });
    }
  });
  t.after(() => fake.restore());
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");

  const saved = await publishResumeDocument("token", USER, "en", {
    yamlContent: yaml.dump({ ...docs.english, experience: [{ ...docs.english.experience[0], company: "Acme Corp" }] }),
    title: "Jan Kowalski",
    changeNote: "Default edit",
  });

  assert.ok(saved, "the default language is saved");
  assert.equal(injected, true, "the interleaving was exercised");
  assert.equal(polishRole(fake), "Świeże tłumaczenie", "the fresh translation survives the sync");
  assert.equal(yaml.load(polishRow(fake).yaml_content).experience[0].company, "Acme Corp", "the sync still applies the default's neutral fields");
});

test("a save based on an outdated version is rejected instead of overwriting another tab's save", async (t) => {
  const docs = await linkedDocuments();
  const fake = install(docs);
  t.after(() => fake.restore());
  const { publishResumeDocument, ResumeDocumentConflictError } = await import("../app/lib/resume-server.ts");

  assert.ok(await publishResumeDocument("token", USER, "pl", { yamlContent: docs.withRole("Karta B"), title: "Jan Kowalski", changeNote: "tab B", baseUpdatedAt: OLD }));
  await assert.rejects(
    publishResumeDocument("token", USER, "pl", { yamlContent: docs.withRole("Karta A"), title: "Jan Kowalski", changeNote: "tab A", baseUpdatedAt: OLD }),
    ResumeDocumentConflictError,
  );
  assert.equal(polishRole(fake), "Karta B");
});

test("a write that lands between a save's read and its write is detected", async (t) => {
  const docs = await linkedDocuments();
  let fake;
  let injected = false;
  fake = install(docs, (request) => {
    if (!injected && isWriteTo(request, "doc-pl")) {
      injected = true;
      fake.update("resume_documents", (row) => row.id === "doc-pl", { yaml_content: docs.withRole("Druga karta") });
    }
  });
  t.after(() => fake.restore());
  const { publishResumeDocument, ResumeDocumentConflictError } = await import("../app/lib/resume-server.ts");

  await assert.rejects(
    publishResumeDocument("token", USER, "pl", { yamlContent: docs.withRole("Pierwsza karta"), title: "Jan Kowalski", changeNote: "tab A", baseUpdatedAt: OLD }),
    ResumeDocumentConflictError,
  );
  assert.equal(polishRole(fake), "Druga karta");
});

test("after a conflict or a failed write, retrying from the current version succeeds", async (t) => {
  const docs = await linkedDocuments();
  let failNextWrite = true;
  const fake = install(docs, (request) => {
    if (failNextWrite && isWriteTo(request, "doc-pl")) {
      failNextWrite = false;
      return new Response(JSON.stringify({ message: "temporary failure" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }
  });
  t.after(() => fake.restore());
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");
  const payload = { yamlContent: docs.withRole("Po ponowieniu"), title: "Jan Kowalski", changeNote: "retry", baseUpdatedAt: OLD };

  assert.equal(await publishResumeDocument("token", USER, "pl", payload), null, "the failed write is reported");
  assert.equal(polishRow(fake).updated_at, OLD, "a failed write leaves the stored version untouched");
  const retried = await publishResumeDocument("token", USER, "pl", payload);
  assert.ok(retried);
  assert.equal(polishRole(fake), "Po ponowieniu");
  assert.equal(retried.document.updated_at, polishRow(fake).updated_at, "the response carries the new base version");
});

test("a default-language save reports which translations it rewrote and from which version", async (t) => {
  const docs = await linkedDocuments();
  const fake = install(docs);
  t.after(() => fake.restore());
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");

  const saved = await publishResumeDocument("token", USER, "en", {
    yamlContent: yaml.dump({ ...docs.english, experience: [{ ...docs.english.experience[0], company: "Acme Corp" }] }),
    title: "Jan Kowalski",
    changeNote: "Default edit",
    baseUpdatedAt: OLD,
  });

  assert.deepEqual(saved.synchronizationFailed, []);
  assert.deepEqual(saved.synchronized.map((entry) => [entry.locale, entry.previousUpdatedAt, entry.document.updated_at]), [["pl", OLD, polishRow(fake).updated_at]]);
});

const unavailable = () => new Response(JSON.stringify({ message: "upstream unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } });
const isTranslationListRead = (request) => request.method === "GET" && request.path === "resume_documents" && request.url.search.includes("order=updated_at.desc");
const isReadOf = (request, id) => request.method === "GET" && request.path === "resume_documents" && request.url.search.includes(`id=eq.${id}`);
const editedDefault = (docs) => yaml.dump({ ...docs.english, experience: [{ ...docs.english.experience[0], company: "Acme Corp" }] });

test("a failed read of the translation list is reported instead of looking like a complete sync", async (t) => {
  const docs = await linkedDocuments();
  const fake = install(docs, (request) => (isTranslationListRead(request) ? unavailable() : undefined));
  t.after(() => fake.restore());
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");

  const saved = await publishResumeDocument("token", USER, "en", { yamlContent: editedDefault(docs), title: "Jan Kowalski", changeNote: "Default edit" });

  assert.ok(saved, "the default language itself is saved");
  assert.equal(saved.synchronizationComplete, false);
  assert.equal(yaml.load(polishRow(fake).yaml_content).experience[0].company, "Acme", "the translation was not touched");
});

test("a failed re-read after a lost compare-and-swap is reported as a failed translation", async (t) => {
  const docs = await linkedDocuments();
  let fake;
  let conflicted = false;
  fake = install(docs, (request) => {
    if (!conflicted && isWriteTo(request, "doc-pl")) {
      conflicted = true;
      fake.update("resume_documents", (row) => row.id === "doc-pl", { yaml_content: docs.withRole("Inna karta") });
      return undefined;
    }
    if (conflicted && isReadOf(request, "doc-pl")) return unavailable();
  });
  t.after(() => fake.restore());
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");

  const saved = await publishResumeDocument("token", USER, "en", { yamlContent: editedDefault(docs), title: "Jan Kowalski", changeNote: "Default edit" });

  assert.deepEqual(saved.synchronizationFailed, [{ locale: "pl", reason: "read" }]);
  assert.equal(polishRole(fake), "Inna karta", "the concurrent translation is kept");
});

test("the publish API and the editor message both report an incomplete sync", async () => {
  const { synchronizationFailureMessages, NOT_SYNCHRONIZED_MESSAGE, SYNCHRONIZATION_UNCHECKED_MESSAGE } = await import("../app/master-resume/locale-save-plan.ts");
  const ts = (await import("typescript")).default;
  const { readFileSync } = await import("node:fs");
  const js = ts.transpileModule(readFileSync(new URL("../app/api/resume/publish/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const route = {};
  const resumeSchema = await import("../app/lib/resume-schema.ts");
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "../../../lib/auth-request": { requireRequestActor: async () => ({ ok: true, actor: { userId: USER }, accessToken: "token" }) },
    "../../../lib/rate-limit": { rateLimit: async () => ({ success: true, reset: Date.now() }) },
    "../../../lib/resume-schema": resumeSchema,
    "../../../lib/supabase-http": { callRpc: async () => ({ data: true }) },
    "../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => {} },
    "../../../lib/resume-server": {
      upgradeLegacyResumeYamlContent: (value) => value,
      publishResumeDocument: async () => ({
        document: { id: "doc-en", updated_at: "v2" }, revisions: [], synchronized: [],
        synchronizationFailed: [{ locale: "pl", reason: "read" }], synchronizationComplete: false,
      }),
    },
  };
  new Function("require", "exports", js)((name) => modules[name], route);

  const response = await route.POST(new Request("http://localhost/api/resume/publish", { method: "POST", body: JSON.stringify({ locale: "en", yamlContent: "name: Jan" }) }));
  const body = await response.json();

  assert.deepEqual([body.synchronizationComplete, body.synchronizationFailed], [false, [{ locale: "pl", reason: "read" }]]);
  assert.deepEqual(synchronizationFailureMessages(body, "en").map((message) => [message.locale, message.key]), [
    ["pl", NOT_SYNCHRONIZED_MESSAGE],
    ["en", SYNCHRONIZATION_UNCHECKED_MESSAGE],
  ]);
});
