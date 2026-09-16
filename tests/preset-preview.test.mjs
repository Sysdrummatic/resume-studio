import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

// buildPresetResumeDocument reads window.jsyaml, exactly like the browser
// build does (the vendored copy of the same js-yaml package).
globalThis.window = { jsyaml: yaml };

const { buildPresetResumeDocument } = await import("../app/lib/preset-preview.ts");
const { buildDefaultResumeYaml } = await import("../app/lib/resume-server.ts");
const { EMPTY_PRESET_SELECTION } = await import("../app/lib/preset-selection.ts");

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
