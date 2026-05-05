import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("dashboard separates master resume from preset configurations", () => {
  const page = read("app/dashboard/page.tsx");
  const client = read("app/dashboard/dashboard-client.tsx");

  assert.equal(page.includes("fetchResumePresetsForUser"), true);
  assert.equal(page.includes("DashboardClient"), true);
  assert.equal(client.includes("Master resume"), true);
  assert.equal(client.includes("Targeted CV presets"), true);
  assert.equal(client.includes("Create preset"), true);
  assert.equal(client.includes("PresetModal"), true);
});

test("resume presets are stored as lightweight selection config", () => {
  const server = read("app/lib/resume-server.ts");
  const migration = read("supabase/migrations/20260505_resume_presets.sql");

  assert.equal(server.includes("export type ResumePresetSelection"), true);
  assert.equal(server.includes("saveResumePreset"), true);
  assert.equal(server.includes("publishResumePreset"), true);
  assert.equal(migration.includes("create table if not exists public.resume_presets"), true);
  assert.equal(migration.includes("selection jsonb not null"), true);
  assert.equal(migration.includes("document_id uuid not null references public.resume_documents"), true);
});

test("preset APIs expose create, update and publish operations", () => {
  const listRoute = read("app/api/resume/presets/route.ts");
  const itemRoute = read("app/api/resume/presets/[presetId]/route.ts");
  const publishRoute = read("app/api/resume/presets/[presetId]/publish/route.ts");

  assert.equal(listRoute.includes("saveResumePreset"), true);
  assert.equal(itemRoute.includes("saveResumePreset"), true);
  assert.equal(publishRoute.includes("publishResumePreset"), true);
});

test("preset modal auto-selects the only summary and enables choice only for multiple summaries", () => {
  const client = read("app/dashboard/dashboard-client.tsx");

  assert.equal(client.includes("normalizeSummarySelection"), true);
  assert.equal(client.includes("const summaryChoiceEnabled = option.key !== \"summary\" || option.items.length > 1;"), true);
  assert.equal(client.includes("disabled={!summaryChoiceEnabled}"), true);
});

test("preset cards can open a rendered CV preview based on master resume selection", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const preview = read("app/master-resume/resume-live-preview.tsx");

  assert.equal(client.includes("Open CV"), true);
  assert.equal(client.includes("PresetPreviewModal"), true);
  assert.equal(client.includes("buildPresetResumeDocument"), true);
  assert.equal(client.includes("BasicResumeDocument"), true);
  assert.equal(preview.includes("export function BasicResumeDocument"), true);
});
