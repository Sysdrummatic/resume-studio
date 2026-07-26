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
  assert.equal(client.includes("Master Resume"), true);
  assert.equal(client.includes("Your CVs"), true);
  assert.equal(client.includes("Create CV"), true);
  assert.equal(client.includes("PresetModal"), true);
});

test("resume presets are stored as lightweight selection config", () => {
  const server = read("app/lib/resume-server.ts");
  const migration = read("supabase/migrations/20260505000000_resume_presets.sql");

  assert.equal(server.includes("export type { ResumePresetSelection }"), true);
  assert.equal(server.includes("saveResumePreset"), true);
  assert.equal(server.includes("publishResumePreset"), true);
  assert.equal(migration.includes("create table if not exists public.resume_presets"), true);
  assert.equal(migration.includes("selection jsonb not null"), true);
  assert.equal(migration.includes("document_id uuid not null references public.resume_documents"), true);
});

test("preset APIs expose create, update, publish and delete operations", () => {
  const listRoute = read("app/api/resume/presets/route.ts");
  const itemRoute = read("app/api/resume/presets/[presetId]/route.ts");
  const publishRoute = read("app/api/resume/presets/[presetId]/publish/route.ts");

  assert.equal(listRoute.includes("saveResumePreset"), true);
  assert.equal(itemRoute.includes("saveResumePreset"), true);
  assert.equal(itemRoute.includes("deleteResumePreset"), true);
  assert.equal(itemRoute.includes("export async function DELETE"), true);
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
  const page = read("app/dashboard/page.tsx");

  assert.equal(client.includes("Open CV"), true);
  assert.equal(client.includes("PresetPreviewModal"), true);
  assert.equal(client.includes("buildPresetResumeDocument"), true);
  assert.equal(client.includes("BasicResumeDocument"), true);
  assert.equal(page.includes("fetchResumeUserLocalesForUser"), true);
  assert.equal(page.includes("initialDocuments={ownedDocuments}"), true);
  assert.equal(page.includes("draftPdfEnabled={draftPdfEnabled && actor.role === \"admin\"}"), true);
  assert.equal(client.includes("buildLanguageOptions"), true);
  assert.equal(client.includes("onLanguageSelect={setActiveLocale}"), true);
  assert.equal(client.includes("parseCanonicalPublicPath"), true);
  const basicResumeDoc = read("app/components/resume-renderer/BasicResumeDocument.tsx");
  assert.equal(basicResumeDoc.includes("export function BasicResumeDocument"), true);
  assert.equal(preview.includes("BasicResumeDocument"), true);
});

test("preset row shows Open CV first, Copy link when published, and a settings menu with confirmed delete", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const styles = read("app/globals.css");

  assert.equal(client.includes("PresetActionsMenu"), true);
  assert.equal(client.includes("aria-label={`CV Version settings for ${preset.title}`}"), true);
  assert.equal(client.includes("aria-label={`Delete CV Version ${preset.title}`}"), true);
  assert.equal(client.includes('{preset.is_public ? "Unpublish" : "Publish"}'), true);
  assert.equal(client.includes("dashboard-preset-menu__separator"), true);
  assert.equal(client.includes("setConfirmDeletePreset(preset)"), true);
  assert.equal(client.includes("Delete CV Version confirmation"), true);
  assert.equal(client.includes("dashboard-resume-list__secondary-actions"), false);
  assert.equal(styles.includes(".dashboard-preset-menu__panel"), true);
});

test("dashboard exposes canonical link management only; editor shows only Publish and Revision", () => {
  const client = read("app/dashboard/dashboard-client.tsx");
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const server = read("app/lib/resume-server.ts");

  assert.equal(client.includes("dashboard-resume-list__links"), false);
  assert.equal(client.includes("<dt>Updated</dt>"), false);
  assert.equal(client.includes("<dt>Canonical</dt>"), false);
  assert.equal(client.includes("<dt>Compatibility</dt>"), false);
  assert.equal(client.includes("canonical_public_path"), true);
  assert.equal(client.includes("copyPublicLink"), true);
  assert.equal(client.includes("Open CV"), true);
  assert.equal(client.includes("Copy link"), true);
  assert.equal(client.includes("PublishSavedVersionModal"), true);

  assert.equal(editor.includes("Open public CV"), false);
  assert.equal(editor.includes("Copy public URL"), false);
  assert.equal(editor.includes("resume_public_links"), false);
  assert.equal(server.includes("canonical_public_path"), true);
});

test("snapshot exports use canonical public paths only for dashboard and editor flows", () => {
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const userPage = read("app/user/page.tsx");
  const userClient = read("app/user/user-client.tsx");
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("buildPublishedResumeExportUrls"), true);
  assert.equal(exportLib.includes("textUrl"), true);
  assert.equal(exportLib.includes("pdfUrl"), true);
  assert.equal(dashboard.includes("buildPublishedResumeExportUrls"), true);
  assert.equal(dashboard.includes("presetId="), false);
  assert.equal(editor.includes("buildPublishedResumeExportUrls"), false);
  assert.equal(editor.includes("presetId="), false);
  assert.equal(userPage.includes("UserClient"), true);
  assert.equal(userClient.includes("Primary Resume"), false);
  assert.equal(userClient.includes('aria-label="Resume preview"'), true);
  assert.equal(userClient.includes("presetId="), false);
});
