import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const selection = {
  summary: [0], experience: [], education: [], courses: [], skills: [],
  interests: [], languages: [], tech_stack: [],
};

test("invalid later publication locale leaves variants and profile untouched", async (t) => {
  const english = yaml.dump({
    first_name: "Jan", family_name: "Kowalski",
    summary: [{ position: "Engineer", description: "Builds", default: true }],
  });
  const polish = yaml.dump({
    first_name: "Jan", family_name: "Kowalski",
    summary: [{ position: "", description: "", default: true }],
  });
  const fake = installFakePostgrest({
    resume_presets: [{
      id: "preset-1", user_id: "user-1", document_id: "doc-en", title: "CV", selection,
      default_locale: "en", is_public: false, allow_indexing: false, ai_generated: false,
    }],
    resume_documents: [
      { id: "doc-en", user_id: "user-1", locale: "en", yaml_content: english },
      { id: "doc-pl", user_id: "user-1", locale: "pl", yaml_content: polish },
    ],
    profiles: [{ id: "user-1", name_sync_mode: "auto", first_name: "Old", last_name: "Name", display_name: "Old Name", person_slug: "old-name" }],
    resume_public_links: [], resume_preset_variants: [],
  });
  t.after(fake.restore);
  const { publishResumePreset } = await import("../app/lib/resume-server.ts");

  await assert.rejects(
    publishResumePreset("user-token", "user-1", "preset-1", {
      allowIndexing: false, defaultLocale: "en", selectedLocales: ["en", "pl"],
    }),
    /\[publish:step=localeSelection\].*pl/,
  );
  assert.deepEqual(fake.rows("resume_preset_variants"), []);
  assert.equal(fake.rows("profiles")[0].display_name, "Old Name");
  assert.deepEqual(fake.calls.filter(({ method }) => method !== "GET"), [], "validation failure must not write anything");
});

test("valid publication stores per-locale selections before the snapshot RPC", async (t) => {
  const source = {
    first_name: "Jan", family_name: "Kowalski",
    summary: [{ entry_id: "summary-1", position: "Engineer", description: "Builds", default: true }],
    experience: [{ entry_id: "experience-1", period: "2020", company: "Acme", role: "Engineer", highlights: [] }],
  };
  const translated = {
    ...source,
    summary: [{ ...source.summary[0], position: "Inżynier", description: "Buduje" }],
    experience: [{ ...source.experience[0], role: "" }],
  };
  const withExperience = { ...selection, experience: [0] };
  const fake = installFakePostgrest({
    resume_presets: [{
      id: "preset-1", user_id: "user-1", document_id: "doc-en", title: "CV", selection: withExperience,
      default_locale: "en", is_public: false, allow_indexing: false, ai_generated: false,
    }],
    resume_documents: [
      { id: "doc-en", user_id: "user-1", locale: "en", yaml_content: yaml.dump(source) },
      { id: "doc-pl", user_id: "user-1", locale: "pl", yaml_content: yaml.dump(translated) },
    ],
    profiles: [{ id: "user-1", name_sync_mode: "manual", display_name: "Jan Kowalski", person_slug: "jan-kowalski" }],
    resume_public_links: [], resume_preset_variants: [],
  });
  t.after(fake.restore);
  const { publishResumePreset } = await import("../app/lib/resume-server.ts");

  const published = await publishResumePreset("user-token", "user-1", "preset-1", {
    allowIndexing: false, defaultLocale: "pl", selectedLocales: ["en", "pl"],
  });
  assert.ok(published);
  const variants = fake.rows("resume_preset_variants");
  assert.equal(variants.length, 2);
  assert.deepEqual(variants.find(({ locale }) => locale === "en").selection.experience, [0]);
  assert.deepEqual(variants.find(({ locale }) => locale === "pl").selection.experience, []);
  const publishIndex = fake.calls.findIndex(({ target }) => target === "publish_resume_saved_version");
  assert.ok(publishIndex > fake.calls.findLastIndex(({ method, target }) => method === "POST" && target === "resume_preset_variants"));
});

test("variant read failure stops publication before replacing a saved language selection", async (t) => {
  const source = yaml.dump({
    first_name: "Jan", family_name: "Kowalski",
    summary: [{ position: "Engineer", description: "Builds", default: true }],
    experience: [{ period: "2020", company: "Acme", role: "Engineer", highlights: [] }],
  });
  const customSelection = { ...selection, experience: [0] };
  const fake = installFakePostgrest({
    resume_presets: [{ id: "preset-1", user_id: "user-1", document_id: "doc-en", title: "CV", selection,
      default_locale: "en", is_public: false, allow_indexing: false, ai_generated: false }],
    resume_documents: [{ id: "doc-en", user_id: "user-1", locale: "en", yaml_content: source }],
    resume_preset_variants: [{ id: "variant-en", preset_id: "preset-1", user_id: "user-1", document_id: "doc-en",
      locale: "en", selection: customSelection, is_default: true }],
    profiles: [{ id: "user-1", name_sync_mode: "manual", display_name: "Jan Kowalski", person_slug: "jan-kowalski" }],
    resume_public_links: [],
  }, {
    onRequest: ({ method, path }) => method === "GET" && path === "resume_preset_variants"
      ? new Response(JSON.stringify({ message: "unavailable" }), { status: 503, headers: { "Content-Type": "application/json" } })
      : undefined,
  });
  t.after(fake.restore);
  const { publishResumePreset } = await import("../app/lib/resume-server.ts");

  await assert.rejects(
    publishResumePreset("user-token", "user-1", "preset-1", {
      allowIndexing: false, defaultLocale: "en", selectedLocales: ["en"],
    }),
    /variant/i,
  );
  assert.deepEqual(fake.rows("resume_preset_variants")[0].selection, customSelection);
  assert.deepEqual(fake.calls.filter(({ method }) => method !== "GET"), []);
});
