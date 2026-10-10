import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// Two tabs (or a failed write) must never overwrite each other: every save is a
// compare-and-swap on updated_at (ADR 0023 §8, kept by ADR 0024). Runs the real
// resume-server code against an in-memory PostgREST, so it proves the
// application's writes, not Supabase.

const USER = "33333333-3333-3333-3333-333333333333";
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
