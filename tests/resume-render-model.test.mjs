import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("buildResumeRenderConfig always uses the hardcoded template and theme ID", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes('DEFAULT_TEMPLATE_ID = "sample-two-column"'), true);
  assert.equal(source.includes('DEFAULT_THEME_ID = "cv-basic-dot"'), true);
  assert.equal(source.includes("templateId: DEFAULT_TEMPLATE_ID"), true);
  assert.equal(source.includes("themeId: DEFAULT_THEME_ID"), true);
});

test("buildResumeRenderConfig defaults chrome visibility to true", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes("visible: true"), true);
});

test("buildResumeRenderConfig supports all four render modes", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes('"public"'), true);
  assert.equal(source.includes('"editor"'), true);
  assert.equal(source.includes('"preview"'), true);
  assert.equal(source.includes('"pdf"'), true);
});

test("buildResumeRendererLabels merges locale defaults before applying caller overrides", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes("...DEFAULT_RENDERER_LABELS"), true);
  assert.equal(source.includes("...sanitizedOverrides"), true);

  const defaultsPos = source.indexOf("...DEFAULT_RENDERER_LABELS");
  const overridesPos = source.indexOf("...sanitizedOverrides");
  assert.equal(overridesPos > defaultsPos, true, "overrides must come after defaults so they win");
});

test("buildResumeRendererLabels strips undefined values before merging overrides", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes("filter(([, value]) => value !== undefined)"), true);
});

test("getResumeHeroRole returns trimmed roleOverride when provided", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes('String(roleOverride || "").trim()'), true);
  assert.equal(source.includes("return trimmedOverride"), true);
});

test("getResumeHeroRole falls back to default summary position", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes("getDefaultSummary"), true);
  assert.equal(source.includes("defaultSummary?.position.trim()"), true);
});

test("getResumeHeroRole skips position labeled 'default'", () => {
  const source = read("app/components/resume-renderer/build-resume-render-model.ts");

  assert.equal(source.includes('"default"'), true);
});

test("all CV entry points route through BasicResumeDocument", () => {
  const sample = read("app/resume/resume-view-client.tsx");
  const publicCanonical = read("app/[personSlug]/[publicId]/page.tsx");
  const publicLegacy = read("app/r/[slug]/page.tsx");
  const userHub = read("app/user/user-client.tsx");
  const dashboard = read("app/dashboard/dashboard-client.tsx");
  const masterResume = read("app/master-resume/resume-live-preview.tsx");
  const previewFrame = read("app/components/design-system/molecules/ResumePreviewFrame.tsx");

  assert.equal(sample.includes("BasicResumeDocument"), true, "Sample CV must use BasicResumeDocument");
  assert.equal(sample.includes("import ResumeRenderer"), false, "Sample CV must not import ResumeRenderer directly");

  assert.equal(publicCanonical.includes("BasicResumeDocument"), true, "public canonical route must use BasicResumeDocument");
  assert.equal(publicLegacy.includes("BasicResumeDocument"), true, "public legacy route must use BasicResumeDocument");

  assert.equal(userHub.includes("ResumePreviewFrame"), true, "User Hub must use ResumePreviewFrame");
  assert.equal(previewFrame.includes("BasicResumeDocument"), true, "ResumePreviewFrame must wrap BasicResumeDocument");

  assert.equal(dashboard.includes("BasicResumeDocument"), true, "Dashboard modal must use BasicResumeDocument");
  assert.equal(masterResume.includes("BasicResumeDocument"), true, "Master Resume preview must use BasicResumeDocument");
});
