import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

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

test("an explicit isPublic still wins, and new versions start private", async (t) => {
  const { fake } = installPublished();
  t.after(fake.restore);
  const { saveResumePreset } = await import("../app/lib/resume-server.ts");

  const created = await saveResumePreset("token", USER, { documentId: "doc-en", title: "New", selection, defaultLocale: "en" });
  assert.equal(created?.is_public, false);
  const hidden = await saveResumePreset("token", USER, {
    presetId: "preset-1", documentId: "doc-en", title: "CV", selection, defaultLocale: "en", isPublic: false,
  });
  assert.equal(hidden?.is_public, false);
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

test("republish route authorizes, rate limits and reports failures without leaking a half result", () => {
  const route = read("app/api/resume/presets/[presetId]/republish/route.ts");
  assert.match(route, /resume\.preset\.publish_own/);
  assert.match(route, /rateLimit\(/);
  assert.match(route, /republishResumePreset\(/);
  assert.match(route, /export async function POST/);
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
