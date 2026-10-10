import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";
import { readAppDictionary } from "./helpers/app-i18n.mjs";
import { loadRoute } from "./helpers/load-route.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const resumeSchema = await import("../app/lib/resume-schema.ts");

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const USER = "user-1";
const selection = {
  summary: [0], experience: [], education: [], courses: [], skills: [],
  interests: [], languages: [], tech_stack: [],
};
const cv = (position) => yaml.dump({
  first_name: "Jan", family_name: "Kowalski",
  summary: [{ position, description: "Builds", default: true }],
});

function installPublished({ isPublic = true, link = true } = {}) {
  const rpcBodies = [];
  const fake = installFakePostgrest({
    resume_presets: [{
      id: "preset-1", user_id: USER, document_id: "doc-en", title: "CV", selection,
      default_locale: "en", is_public: isPublic, allow_indexing: true, ai_generated: false,
    }],
    resume_documents: [
      { id: "doc-en", user_id: USER, locale: "en", yaml_content: cv("Engineer") },
      { id: "doc-pl", user_id: USER, locale: "pl", yaml_content: cv("Inżynier") },
    ],
    profiles: [{ id: USER, name_sync_mode: "manual", display_name: "Jan Kowalski", person_slug: "jan-kowalski" }],
    resume_public_links: link
      ? [{
        id: "link-1", user_id: USER, preset_id: "preset-1", person_slug: "jan-kowalski", public_id: "abc123",
        status: "active", is_active: true, default_locale: "en", available_locales: ["en"], allow_indexing: false,
      }]
      : [],
    resume_preset_variants: [],
  }, {
    onRequest: ({ path, body }) => {
      if (path === "rpc/publish_resume_saved_version") rpcBodies.push(JSON.parse(body));
    },
  });
  return { fake, rpcBodies };
}

test("editing a published LiveCV version keeps it published", async (t) => {
  const { fake } = installPublished();
  t.after(fake.restore);
  const { saveResumePreset } = await import("../app/lib/resume-server.ts");

  const saved = await saveResumePreset("token", USER, {
    presetId: "preset-1", documentId: "doc-en", title: "Renamed", selection, defaultLocale: "en", allowIndexing: true,
  });
  assert.equal(saved?.is_public, true, "an edit must not silently flip a published version to private");
  assert.equal(fake.rows("resume_presets")[0].is_public, true);
});

test("a client cannot flip is_public through a save: new versions start private, existing ones keep their flag", async (t) => {
  const { fake } = installPublished();
  t.after(fake.restore);
  const { saveResumePreset } = await import("../app/lib/resume-server.ts");

  // Only the publish and unpublish RPCs may change the flag, together with the link.
  const created = await saveResumePreset("token", USER, { documentId: "doc-en", title: "New", selection, defaultLocale: "en", isPublic: true });
  assert.equal(created?.is_public, false);
  const edited = await saveResumePreset("token", USER, {
    presetId: "preset-1", documentId: "doc-en", title: "CV", selection, defaultLocale: "en", isPublic: false,
  });
  assert.equal(edited?.is_public, true, "a published version with an active link must not be marked private by an edit");
  assert.equal(fake.rows("resume_presets").find(({ id }) => id === "preset-1").is_public, true);
});

test("republish keeps the languages already published under the link", async (t) => {
  const { fake, rpcBodies } = installPublished();
  t.after(fake.restore);
  const { republishResumePreset } = await import("../app/lib/resume-server.ts");

  const result = await republishResumePreset("token", USER, "preset-1");
  assert.ok(result);
  assert.equal(rpcBodies.length, 1);
  assert.deepEqual(rpcBodies[0].input_selected_locales, ["en"], "a language the link never exposed must not go public");
  assert.equal(rpcBodies[0].input_default_locale, "en");
  assert.equal(rpcBodies[0].input_allow_indexing, true, "indexing follows the version's saved setting");
});

test("republish refuses a version that has no active link", async (t) => {
  const { fake, rpcBodies } = installPublished({ isPublic: false, link: false });
  t.after(fake.restore);
  const { republishResumePreset } = await import("../app/lib/resume-server.ts");

  await assert.rejects(republishResumePreset("token", USER, "preset-1"), /not published/i);
  assert.equal(rpcBodies.length, 0);
});

const PREFIX = "../../../../../";
function republishRoute({ auth, rateLimited = false, republish } = {}) {
  const calls = [];
  let lastRequest = null;
  const route = loadRoute("app/api/resume/presets/[presetId]/republish/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    [`${PREFIX}lib/auth-request`]: { requireRequestActor: async () => auth ?? { ok: true, actor: { userId: USER }, accessToken: "token" } },
    [`${PREFIX}lib/rate-limit`]: { rateLimit: async () => ({ success: !rateLimited, reset: Date.now() + 30_000 }) },
    [`${PREFIX}lib/resume-schema`]: resumeSchema,
    [`${PREFIX}lib/resume-server`]: {
      republishResumePreset: async (...args) => {
        calls.push(args.slice(3));
        return republish ? republish() : { id: "preset-1", is_public: true };
      },
    },
  });
  const post = (body) => {
    lastRequest = new Request("http://localhost/api/resume/presets/preset-1/republish", { method: "POST", body, headers: { "Content-Type": "application/json" } });
    return route.POST(lastRequest, { params: Promise.resolve({ presetId: "preset-1" }) });
  };
  return { post, calls, request: () => lastRequest };
}

test("republish route refuses an unauthorized caller before doing anything", async () => {
  const { post, calls } = republishRoute({ auth: { ok: false, status: 403, message: "Forbidden" } });
  const response = await post(JSON.stringify({ selectedLocales: ["en"], defaultLocale: "en" }));
  assert.equal(response.status, 403);
  assert.deepEqual(calls, []);
});

test("republish route answers 429 with Retry-After and never reads the body when rate limited", async () => {
  const { post, calls, request } = republishRoute({ rateLimited: true });
  const response = await post("{}");
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("Retry-After")) > 0);
  assert.deepEqual(calls, []);
  assert.equal(request().bodyUsed, false);
});

test("republish route keeps the current languages for an empty request and forwards an explicit choice", async () => {
  const kept = republishRoute();
  assert.equal((await kept.post("")).status, 200);
  assert.equal((await kept.post("{}")).status, 200);
  assert.deepEqual(kept.calls, [[undefined], [undefined]]);

  const chosen = republishRoute();
  const response = await chosen.post(JSON.stringify({ selectedLocales: ["en", "PL"], defaultLocale: "pl" }));
  assert.equal(response.status, 200);
  assert.deepEqual(chosen.calls, [[{ selectedLocales: ["en", "pl"], defaultLocale: "pl" }]]);
});

test("republish route rejects an incomplete or malformed language choice with 400 instead of ignoring it", async () => {
  const bad = [
    ["only selectedLocales", { selectedLocales: ["pl"] }],
    ["only defaultLocale", { defaultLocale: "pl" }],
    ["empty selection", { selectedLocales: [], defaultLocale: "en" }],
    ["default outside the selection", { selectedLocales: ["pl"], defaultLocale: "en" }],
    ["non-string entry", { selectedLocales: [1], defaultLocale: "en" }],
    ["garbage locale that would be coerced to en", { selectedLocales: ["x1"], defaultLocale: "x1" }],
    ["selectedLocales not an array", { selectedLocales: "pl", defaultLocale: "pl" }],
  ];
  for (const [label, body] of bad) {
    const { post, calls } = republishRoute();
    assert.equal((await post(JSON.stringify(body))).status, 400, label);
    assert.deepEqual(calls, [], `${label} must not publish`);
  }
  for (const [label, raw] of [["JSON null", "null"], ["JSON array", "[]"], ["JSON string", "\"pl\""], ["invalid JSON", "{"]]) {
    const { post, calls } = republishRoute();
    assert.equal((await post(raw)).status, 400, label);
    assert.deepEqual(calls, [], label);
  }
});

test("republish route reports a failed or empty republish as 500 with the reason", async () => {
  const failing = republishRoute({ republish: () => { throw new Error("[publish:step=rpc] boom"); } });
  const failed = await failing.post("{}");
  assert.equal(failed.status, 500);
  assert.match((await failed.json()).error, /boom/);

  const empty = republishRoute({ republish: () => null });
  assert.equal((await empty.post("{}")).status, 500);
});

test("version editor offers Create, Save or Update by state, with a hover hint only for Update", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  assert.match(client, /labels\.create/, "creating a version has its own button label");
  assert.match(client, /labels\.update_hint/, "Update explains itself in a hover hint");
  assert.match(client, /republish/, "Update asks the dashboard to republish after saving");
  assert.match(client, /labels\.messages\.saved_not_updated/, "a failed republish after a successful save is reported");
});

for (const locale of ["en", "pl"]) {
  test(`dashboard dictionary (${locale}) has the Update LiveCV copy`, () => {
    const { dashboard } = readAppDictionary(locale);
    for (const key of ["create", "save", "update", "update_hint"]) {
      assert.ok(dashboard.preset_editor[key], `preset_editor.${key}`);
    }
    for (const key of ["updated", "update_failed", "saved_not_updated"]) {
      assert.ok(dashboard.messages[key], `messages.${key}`);
    }
  });
}

test("terminology guide names Update LiveCV and keeps Save from touching the link", () => {
  const guide = read("docs/guides/brand-language-and-terminology.md");
  assert.match(guide, /`Zaktualizuj LiveCV` \/ `Update LiveCV`/);
});

test("a saved version keeps its public link path in the library when the save response omits it", async () => {
  const { mergePreset } = await import("../app/dashboard/dashboard-model.ts");
  const current = [
    { id: "a", title: "Old", is_public: true, canonical_public_path: "/jan/abc" },
    { id: "b", title: "Other", is_public: false },
  ];
  // PATCH /presets/[id] returns the row without the link-derived path.
  const merged = mergePreset(current, { id: "a", title: "New", is_public: true });
  assert.equal(merged[0].title, "New");
  assert.equal(merged[0].canonical_public_path, "/jan/abc", "Copy/Open link must survive an edit that fails to republish");
  assert.equal(mergePreset(current, { id: "a", is_public: false, canonical_public_path: null })[0].canonical_public_path, null, "an explicit null from unpublish still clears it");
  assert.equal(mergePreset(current, { id: "c", title: "Fresh" })[0].id, "c", "unknown versions are prepended");
});

test("repair migration only aligns is_public with an active link and never un-publishes", () => {
  const sql = read("supabase/migrations/20261010000000_repair_preset_is_public_with_active_link.sql").toLowerCase();
  assert.match(sql, /update public\.resume_presets p\s+set is_public = true/);
  assert.match(sql, /where p\.is_public = false/);
  assert.match(sql, /l\.status = 'active'\s+and l\.is_active = true/);
  assert.doesNotMatch(sql, /is_public = false\s*(,|where p\.id)/, "must not set is_public to false");
  assert.doesNotMatch(sql, /\b(delete|drop|alter policy|create policy)\b/);
});

// ── "Publish again" folded into the version editor ─────────────────────────

test("republish can change the published languages and default, and rejects an unusable choice", async (t) => {
  const { fake, rpcBodies } = installPublished();
  t.after(fake.restore);
  const { republishResumePreset } = await import("../app/lib/resume-server.ts");

  assert.ok(await republishResumePreset("token", USER, "preset-1", { selectedLocales: ["en", "pl"], defaultLocale: "pl" }));
  assert.deepEqual(rpcBodies[0].input_selected_locales, ["en", "pl"]);
  assert.equal(rpcBodies[0].input_default_locale, "pl");

  await assert.rejects(republishResumePreset("token", USER, "preset-1", { selectedLocales: ["pl"], defaultLocale: "en" }), /defaultLocale/);
  await assert.rejects(republishResumePreset("token", USER, "preset-1", { selectedLocales: [], defaultLocale: "en" }), /selectedLocales/);
  assert.equal(rpcBodies.length, 1, "a rejected choice must not publish");
});

test("the library knows which languages each link currently serves", async (t) => {
  const { fake } = installPublished();
  t.after(fake.restore);
  const { fetchResumePresetsForUser } = await import("../app/lib/resume-server.ts");

  const [preset] = await fetchResumePresetsForUser(USER);
  assert.deepEqual(preset.published_locales, ["en"]);
});

test("the republish route forwards the chosen languages", () => {
  const route = read("app/api/resume/presets/[presetId]/republish/route.ts");
  assert.match(route, /selectedLocales/);
  assert.match(route, /defaultLocale/);
});

test("Publish again is gone and the version editor owns publication languages", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const modal = read("app/components/PublishSavedVersionModal.tsx");
  const fields = read("app/components/PublicationLanguageFields.tsx");
  assert.doesNotMatch(client, /publish_again/);
  assert.match(client, /PublicationLanguageFields/, "the version editor renders the shared language fields");
  assert.match(modal, /PublicationLanguageFields/, "the first-publication dialog uses the same fields");
  assert.match(fields, /validatePublicationLanguages/);
  assert.match(client, /!selectedPreset\.onboarding_test_run_id && !selectedPreset\.is_public/, "only an unpublished version offers the Publish button");
  for (const locale of ["en", "pl"]) {
    assert.equal("publish_again" in readAppDictionary(locale).dashboard.library, false, `${locale} dictionary`);
  }
});

test("tutorials no longer send readers to a Publish again button", () => {
  for (const [locale, text] of [["en", "Publish it again"], ["pl", "Opublikuj ją ponownie"]]) {
    const tutorial = read(`content/docs/locales/${locale}/tutorials/add-language-version/add-language-version.md`);
    assert.equal(tutorial.includes(text), false, `${locale} add-language-version still points at the removed dialog`);
    assert.match(tutorial, locale === "en" ? /Update LiveCV/ : /Zaktualizuj LiveCV/);
  }
});
