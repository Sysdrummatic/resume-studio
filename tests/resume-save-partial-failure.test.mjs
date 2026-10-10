import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

import ts from "typescript";
import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// A save that fails *after* resume_documents was written: the user must learn
// the document is stored (with its new version), and a plain retry must finish
// the remaining steps without writing or recording anything twice. Isolated:
// real resume-server code against an in-memory PostgREST (no RLS, no triggers).

const USER = "44444444-4444-4444-4444-444444444444";
const OLD = "2025-06-01T00:00:00.000Z";
const LANGUAGES = ["en", "pl"].map((code, index) => ({ code, label: code, short_label: code.toUpperCase(), labels: {}, is_enabled: true, sort_order: (index + 1) * 10 }));

async function linkedDocuments() {
  const { buildLanguageTemplate } = await import("../app/lib/resume-language-parity.ts");
  const english = ({
    brand_initials: "JK", first_name: "Jan", family_name: "Kowalski",
    summary: [{ position: "Engineer", description: "Builds tools", default: true }],
    contact: [], qr_codes: [], skills: [], languages: [], education: [], courses: [], gdpr_clause: "",
    tech_stack: ["TypeScript"], interests: ["Music"],
    experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["Built the editor"] }],
  });
  const polish = buildLanguageTemplate(english);
  polish.experience[0].role = "Inżynier";
  return { english, polish, withRole: (role) => yaml.dump({ ...polish, experience: [{ ...polish.experience[0], role }] }) };
}

function install(docs, { nameSync = "manual", onRequest } = {}) {
  return installFakePostgrest({
    resume_languages: LANGUAGES,
    resume_user_locales: ["en", "pl"].map((locale, index) => ({ user_id: USER, locale, label_override: null, short_label_override: null, is_default: locale === "en", sort_order: (index + 1) * 10 })),
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", title: "Jan Kowalski", yaml_content: yaml.dump(docs.english), schema_version: 1, updated_at: OLD },
      { id: "doc-pl", user_id: USER, locale: "pl", title: "Jan Kowalski", yaml_content: yaml.dump(docs.polish), schema_version: 1, updated_at: OLD },
    ],
    profiles: [{ id: USER, display_name: "Jan Kowalski", first_name: "Jan", last_name: "Kowalski", person_slug: "jan-kowalski", name_sync_mode: nameSync }],
  }, { onRequest });
}

const failOnce = () => {
  let failed = false;
  return (condition) => {
    if (failed || !condition) return undefined;
    failed = true;
    return new Response(JSON.stringify({ message: "temporary failure" }), { status: 503, headers: { "Content-Type": "application/json" } });
  };
};
const isRevisionOf = (request, id) => request.path === "rpc/create_resume_revision" && JSON.parse(request.body).input_document_id === id;
const row = (fake, id) => fake.rows("resume_documents").find((entry) => entry.id === id);
const revisionsOf = (fake, id) => fake.rows("resume_revisions").filter((entry) => entry.document_id === id);

async function saveTwice(fake, payload) {
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");
  const first = await publishResumeDocument("token", USER, "pl", { ...payload, baseUpdatedAt: OLD });
  assert.ok(first?.document, "the stored document is returned even though a later step failed");
  assert.equal(first.document.updated_at, row(fake, "doc-pl").updated_at, "…with its new version, the base for the retry");
  const writtenAt = row(fake, "doc-pl").updated_at;
  const retry = await publishResumeDocument("token", USER, "pl", { ...payload, baseUpdatedAt: first.document.updated_at });
  return { first, retry, writtenAt };
}

for (const scenario of [
  { step: "revision", options: {}, fails: (request) => isRevisionOf(request, "doc-pl") },
  { step: "profile", options: { nameSync: "auto" }, fails: (request) => request.method === "PATCH" && request.path === "profiles" },
  { step: "profile", label: "profile read (transient)", options: { nameSync: "auto" }, fails: (request) => request.method === "GET" && request.path === "profiles" && request.url.searchParams.get("select") === "id,display_name,first_name,last_name,person_slug,name_sync_mode" },
  { step: "public-identity", options: {}, fails: (request) => request.method === "GET" && request.path === "profiles" && request.url.searchParams.get("select") === "id,display_name,person_slug" },
]) {
  test(`a failed ${scenario.label ?? scenario.step} step after the document write is a recoverable partial save`, async (t) => {
    const docs = await linkedDocuments();
    const failing = failOnce();
    const fake = install(docs, { ...scenario.options, onRequest: (request) => failing(scenario.fails(request)) });
    t.after(() => fake.restore());
    const payload = { yamlContent: docs.withRole("Po awarii"), title: "Jan Kowalski", changeNote: "partial" };

    const { first, retry, writtenAt } = await saveTwice(fake, payload);

    assert.deepEqual(first.incomplete, [scenario.step]);
    assert.ok(retry, "the retry is not rejected as a conflict");
    assert.deepEqual(retry.incomplete, [], "the retry finishes the remaining step");
    assert.equal(row(fake, "doc-pl").updated_at, writtenAt, "the retry does not write the document again");
    const revisions = revisionsOf(fake, "doc-pl");
    assert.equal(revisions.length, 1, "exactly one revision records the change");
    assert.equal(revisions[0].yaml_content, row(fake, "doc-pl").yaml_content);
  });
}

test("the publish API answers a partial save with the stored document and what is left to do", async () => {
  const js = ts.transpileModule(readFileSync(new URL("../app/api/resume/publish/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const route = {};
  const server = await import("../app/lib/resume-server.ts");
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "../../../lib/auth-request": { requireRequestActor: async () => ({ ok: true, actor: { userId: USER }, accessToken: "token" }) },
    "../../../lib/rate-limit": { rateLimit: async () => ({ success: true, reset: Date.now() }) },
    "../../../lib/resume-schema": await import("../app/lib/resume-schema.ts"),
    "../../../lib/supabase-http": { callRpc: async () => ({ data: true }) },
    "../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => {} },
    "../../../lib/resume-server": {
      ...server,
      publishResumeDocument: async () => ({ document: { id: "doc-pl", updated_at: "v2" }, revisions: [], incomplete: ["revision"] }),
    },
  };
  new Function("require", "exports", js)((name) => modules[name], route);

  const response = await route.POST(new Request("http://localhost/api/resume/publish", { method: "POST", body: JSON.stringify({ locale: "pl", yamlContent: "name: Jan" }) }));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.saved, true);
  assert.deepEqual(body.document, { id: "doc-pl", updated_at: "v2" });
  assert.deepEqual(body.incomplete, ["revision"]);
  assert.equal(body.error, server.RESUME_SAVE_INCOMPLETE_MESSAGE);
});

test("a missing profile and manual name sync are not profile failures", async (t) => {
  const { publishResumeDocument } = await import("../app/lib/resume-server.ts");
  const docs = await linkedDocuments();
  const payload = { yamlContent: docs.withRole("Bez profilu"), title: "Jan Kowalski", changeNote: "profile", baseUpdatedAt: OLD };

  const manual = install(docs, { nameSync: "manual" });
  const withManualSync = await publishResumeDocument("token", USER, "pl", payload);
  manual.restore();
  assert.deepEqual(withManualSync.incomplete, [], "manual mode deliberately skips the name sync");

  const missing = install(docs);
  t.after(() => missing.restore());
  missing.rows("profiles").length = 0;
  const withoutProfile = await publishResumeDocument("token", USER, "pl", payload);
  assert.equal(withoutProfile.incomplete.includes("profile"), false, "a missing profile has no name to sync");
});
