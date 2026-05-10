import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("language versions are managed inside the master resume editor modal", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const layout = read("app/layout.tsx");

  assert.equal(editor.includes("Add language version"), true);
  assert.equal(editor.includes("Create version"), true);
  assert.equal(editor.includes("/api/resume/languages"), true);
  assert.equal(editor.includes("/api/resume/languages?withDocuments=true"), true);
  assert.equal(editor.includes("setDefaultLanguage"), true);
  assert.equal(editor.includes("deleteLanguageVersion"), true);
  assert.equal(layout.includes("/language-versions"), false);
});

test("language version API creates metadata and prepares a resume document", () => {
  const route = read("app/api/resume/languages/route.ts");
  const server = read("app/lib/resume-server.ts");

  assert.equal(route.includes("export async function GET"), true);
  assert.equal(route.includes("export async function POST"), true);
  assert.equal(route.includes("export async function PATCH"), true);
  assert.equal(route.includes("export async function DELETE"), true);
  assert.equal(route.includes("ensureResumeDocument"), true);
  assert.equal(route.includes('requireRequestActor(["admin", "manager", "user"])'), true);
  assert.equal(server.includes("fetchResumeLanguageVersionsForUser"), true);
  assert.equal(server.includes("upsertResumeLanguage"), true);
  assert.equal(server.includes("disableResumeLanguage"), true);
  assert.equal(server.includes("validateResumeLanguageInput"), true);
  assert.equal(server.includes("const updated = await updateTable"), true);
  assert.equal(server.includes("is_public: false"), true);
});

test("resume locale handling supports newly added two-letter languages", () => {
  const schema = read("app/lib/resume-schema.ts");
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const preview = read("app/master-resume/resume-live-preview.tsx");

  assert.equal(schema.includes("export type ResumeLocale = string"), true);
  assert.equal(schema.includes("/^[a-z]{2}$/.test(normalized) ? normalized : \"en\""), true);
  assert.equal(editor.includes("searchParams.get(\"locale\")"), true);
  assert.equal(editor.includes("setLanguageOptions(payload.languages.sort"), true);
  assert.equal(preview.includes("getPreviewLabels(locale)"), true);
});

test("preset APIs preserve dynamic default locales instead of forcing EN or PL", () => {
  const createRoute = read("app/api/resume/presets/route.ts");
  const updateRoute = read("app/api/resume/presets/[presetId]/route.ts");
  const publishRoute = read("app/api/resume/presets/[presetId]/publish/route.ts");
  const server = read("app/lib/resume-server.ts");

  assert.equal(createRoute.includes('body.defaultLocale === "pl" ? "pl" : "en"'), false);
  assert.equal(updateRoute.includes('body.defaultLocale === "pl" ? "pl" : "en"'), false);
  assert.equal(publishRoute.includes('body.defaultLocale === "pl" ? "pl" : "en"'), false);
  assert.equal(createRoute.includes("normalizeLocale(body.defaultLocale)"), true);
  assert.equal(updateRoute.includes("normalizeLocale(body.defaultLocale)"), true);
  assert.equal(publishRoute.includes("normalizeLocale(body.defaultLocale)"), true);
  assert.equal(server.includes("setDefaultResumeLocaleForUser"), true);
});

test("public language switching only exposes published documents and uses preset variants", () => {
  const server = read("app/lib/resume-server.ts");
  const migration = read("supabase/migrations/20260506_resume_language_metadata.sql");

  assert.equal(server.includes("fetchResumePresetVariants"), true);
  assert.equal(server.includes("buildImplicitPresetVariants"), true);
  assert.equal(server.includes("publicVariants"), true);
  assert.equal(server.includes("languageDocuments.length === 0"), true);
  assert.equal(migration.includes("resume_preset_variants_update_own_or_staff"), true);
  assert.equal(migration.includes("and d.locale = resume_preset_variants.locale"), true);
});

test("master resume editor loads saved EN documents instead of replacing them with the template", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(editor.includes('nextLocale === "en" ? await fetchText(TEMPLATE_PATH)'), false);
  assert.equal(editor.includes("payload.document?.yaml_content ||"), true);
});
