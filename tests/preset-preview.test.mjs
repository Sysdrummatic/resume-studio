import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// buildPresetResumeDocument reads window.jsyaml, exactly like the browser
// build does (the vendored copy of the same js-yaml package).
globalThis.window = { jsyaml: yaml };

const { buildPresetResumeDocument, saveOrReportError } = await import("../app/lib/preset-preview.ts");
const { buildDefaultResumeYaml } = await import("../app/lib/resume-server.ts");
const { EMPTY_PRESET_SELECTION } = await import("../app/lib/preset-selection.ts");
const { buildLanguageTemplate: buildResumeLanguageTemplate } = await import("../app/lib/resume-language-parity.ts");

test("a freshly seeded language version (the real onboarding/new-language template) previews as empty, not ok", () => {
  // ocv-0203: buildDefaultResumeYaml() is the exact function that seeds a new
  // document (new language version, or a fresh onboarding draft) — it reads
  // public/data/private/resume-en-template.yaml, whose summary is one blank
  // entry (`position: "", description: "", default: true`). That single
  // *element* made the old clamp-based check report "ok", so the friendly
  // empty-language message from #187 never actually fired for this, the most
  // common real case.
  const seededYaml = buildDefaultResumeYaml("Test User");
  const selection = { ...EMPTY_PRESET_SELECTION, summary: [0] };

  const result = buildPresetResumeDocument(seededYaml, selection);
  assert.equal(result.status, "empty");
});

test("a language version with real summary text previews as ok", () => {
  // Line endings follow the checked-out template's .gitattributes setting, so
  // normalize before patching rather than assuming LF or CRLF.
  const filledYaml = buildDefaultResumeYaml("Test User")
    .replace(/\r\n/g, "\n")
    .replace('position: ""\n    description: ""', 'position: "QA Engineer"\n    description: "Writes regression tests."');
  const selection = { ...EMPTY_PRESET_SELECTION, summary: [0] };

  const result = buildPresetResumeDocument(filledYaml, selection);
  assert.equal(result.status, "ok");
  assert.equal(result.resume.summary[0].position, "QA Engineer");
});

test("translated CV preview omits linked work entries that have only neutral fields", () => {
  const translation = buildResumeLanguageTemplate({
    summary: [{ position: "Engineer", description: "Builds", default: true }],
    experience: [{ period: "2020", company: "Acme", role: "Engineer", highlights: [] }],
  });
  translation.summary[0].position = "Inżynier";
  translation.experience[0].role = "Inżynier";
  translation.experience.push({ ...translation.experience[0], period: "2019", company: "Beta", role: "", highlights: [] });
  const selection = { ...EMPTY_PRESET_SELECTION, summary: [0], experience: [0, 1] };

  const preview = buildPresetResumeDocument(yaml.dump(translation), selection, { translation: true });
  assert.equal(preview.status, "ok");
  assert.deepEqual(preview.resume.experience.map(({ company }) => company), ["Acme"]);
});

test("saveOrReportError turns a rejected save into a reportable message instead of an unhandled rejection", async () => {
  const rejected = await saveOrReportError(() => Promise.reject(new Error("network down")), "Could not save. Check your connection and try again.");
  assert.deepEqual(rejected, { ok: false, error: "Could not save. Check your connection and try again." });
});

test("saveOrReportError passes through a successful save", async () => {
  const resolved = await saveOrReportError(() => Promise.resolve("saved"), "unused");
  assert.deepEqual(resolved, { ok: true, value: "saved" });
});
