import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import yaml from "js-yaml";

import { installFakePostgrest } from "./helpers/fake-postgrest.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { presetStyleSource } = await import("../app/lib/resume-style.ts");

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const documentStyle = { template: "document" };
const USER = "11111111-1111-1111-1111-111111111111";
const selection = {
  summary: [0], experience: [], education: [], courses: [], skills: [],
  interests: [], languages: [], tech_stack: [],
};

function installLegacyPreset() {
  return installFakePostgrest({
    resume_documents: [{
      id: "doc-1", user_id: USER, locale: "en", schema_version: 1,
      style_settings: { template: "signal-grid", accentColor: "#123456" },
      yaml_content: yaml.dump({
        first_name: "Jan", family_name: "Kowalski",
        summary: [{ position: "Engineer", description: "Builds tools", default: true }],
      }),
    }],
    resume_presets: [{
      id: "preset-1", document_id: "doc-1", user_id: USER, title: "CV",
      selection, style_settings: {}, is_public: false, allow_indexing: false,
      ai_generated: false, default_locale: "en", slug: null,
    }],
    resume_public_links: [], resume_preset_variants: [],
  });
}

test("a saved CV version without its own style uses its document's style", () => {
  // `{}` is the column default: versions created before per-version styles, or
  // by code that never wrote one. They must look like their publications did.
  assert.equal(presetStyleSource({}, documentStyle), documentStyle);
  assert.equal(presetStyleSource(undefined, documentStyle), documentStyle);
  assert.equal(presetStyleSource(null, documentStyle), documentStyle);
  assert.deepEqual(presetStyleSource({ template: "own" }, documentStyle), { template: "own" });
});

test("the dashboard, the version editor and the publish trigger apply the same fallback", () => {
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const server = read("app/lib/resume-server.ts");
  const migration = read("supabase/migrations/20260926000000_preset_style_inherits_document.sql");

  assert.doesNotMatch(dashboard, /preset\??\.style_settings \?\?/);
  assert.doesNotMatch(server, /preset\??\.style_settings \?\?/);
  assert.match(dashboard, /presetStyleSource\(/);
  assert.match(server, /presetStyleSource\(/);
  assert.match(migration, /nullif\(p\.style_settings, '\{\}'::jsonb\)/);
});

test("a stored empty preset style remains an inheritance marker through reads and private export", async (t) => {
  const fake = installLegacyPreset();
  t.after(fake.restore);
  const { fetchResumePresetsForUser, fetchResumeExportByPresetId } = await import("../app/lib/resume-server.ts");

  const [preset] = await fetchResumePresetsForUser(USER);
  assert.deepEqual(preset.style_settings, {}, "dashboard must receive the raw inheritance marker");

  const exported = await fetchResumeExportByPresetId("token", USER, "preset-1");
  assert.equal(exported?.cvStyle.template, "signal-grid");
  assert.equal(exported?.cvStyle.accentColor, "#123456");
});

test("saving an inherited style does not replace it with application defaults", async (t) => {
  const fake = installLegacyPreset();
  t.after(fake.restore);
  const { saveResumePreset } = await import("../app/lib/resume-server.ts");

  const updated = await saveResumePreset("token", USER, {
    presetId: "preset-1", documentId: "doc-1", title: "Updated CV", selection,
    defaultLocale: "en",
  });
  assert.ok(updated);
  assert.deepEqual(fake.rows("resume_presets")[0].style_settings, {}, "an unrelated edit must preserve inheritance");

  const imported = await saveResumePreset("token", USER, {
    documentId: "doc-1", title: "Restored CV", selection,
    styleSettings: {}, defaultLocale: "en",
  });
  assert.ok(imported);
  assert.deepEqual(fake.rows("resume_presets").find(({ id }) => id === imported.id).style_settings, {}, "a transferred inheritance marker must survive import");
});
