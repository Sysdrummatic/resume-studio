import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("ADR 0001 publish runtime uses transactional RPC with explicit locale set", () => {
  const server = read("app/lib/resume-server.ts");
  const route = read("app/api/resume/presets/[presetId]/publish/route.ts");

  assert.equal(server.includes("functionName: \"publish_resume_saved_version\""), true);
  assert.equal(server.includes("input_selected_locales"), true);
  assert.equal(server.includes("selectedLocales: ResumeLocale[]"), true);
  assert.equal(route.includes("selectedLocales"), true);
  assert.equal(route.includes("At least one selected locale is required for publish."), true);
});

test("ADR 0001 unpublish runtime uses transactional RPC and keeps Saved Version private", () => {
  const server = read("app/lib/resume-server.ts");

  assert.equal(server.includes("functionName: \"unpublish_resume_saved_version\""), true);
  assert.equal(server.includes("input_preset_id"), true);
  assert.equal(server.includes("fetchResumePresetById(accessToken, userId, presetId)"), true);
});


test("editor public-link controls stay on owner-scoped preset APIs and do not touch public resolvers directly", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");

  assert.equal(editor.includes("/api/resume/presets/${encodeURIComponent(preset.id)}/publish"), true);
  assert.equal(editor.includes("/api/resume/presets/${encodeURIComponent(preset.id)}/unpublish"), true);
  assert.equal(editor.includes("resume_public_links"), false);
  assert.equal(editor.includes("fetchPublishedResumePresetBySlug"), false);
});
