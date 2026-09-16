import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

globalThis.window = { jsyaml: yaml };

const presetPreview = await import("../app/lib/preset-preview.ts");
const resumeSchema = await import("../app/lib/resume-schema.ts");
const { buildDefaultResumeYaml } = await import("../app/lib/resume-server.ts");
const { EMPTY_PRESET_SELECTION } = await import("../app/lib/preset-selection.ts");

const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(readFileSync("app/dashboard/dashboard-client.tsx", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
});
const dashboardModule = { exports: {} };
const dependencies = {
  "next/link": ({ children, ...props }) => createElement("a", props, children),
  "./dashboard.css": {},
  "../lib/resume-schema": resumeSchema,
  "../lib/preset-preview": presetPreview,
  "../lib/resume-export": { buildPublishedResumeExportUrls: () => null, parseCanonicalPublicPath: () => null },
  "../lib/resume-style": { normalizeResumeStyle: () => ({}) },
  "../components/status-toast": {
    StatusToast: () => null,
    useStatusToast: () => ({ toast: null, showToast() {}, closeToast() {} }),
  },
  "../components/PublishSavedVersionModal": () => null,
  "../components/resume-renderer/BasicResumeDocument": {
    BasicResumeDocument: ({ resume }) => createElement("div", { "data-testid": "basic-resume-document" }, resume.summary[0]?.description || ""),
  },
  "./dashboard-model": { summarizeMasterResume: () => "", filterDashboardPresets: (presets) => presets, getSelectedDashboardPreset: () => null },
  "lucide-react": new Proxy({}, { get: () => () => null }),
};
new Function("require", "module", "exports", outputText)(
  (id) => dependencies[id] ?? require(id),
  dashboardModule,
  dashboardModule.exports,
);
const { PresetPreviewModal } = dashboardModule.exports;

function seededYaml(locale) {
  return buildDefaultResumeYaml(`Test ${locale}`);
}

function filledYaml(locale) {
  return seededYaml(locale)
    .replace(/\r\n/g, "\n")
    .replace('position: ""\n    description: ""', `position: "QA Engineer"\n    description: "Filled ${locale} summary."`);
}

function baseFixture({ activeYaml, activeLocale = "en", secondYaml, secondLocale = "pl" }) {
  const documents = [
    { id: "doc-en", user_id: "u1", locale: activeLocale, title: "EN", yaml_content: activeYaml, schema_version: 1, updated_at: "" },
    { id: "doc-pl", user_id: "u1", locale: secondLocale, title: "PL", yaml_content: secondYaml, schema_version: 1, updated_at: "" },
  ];
  const languages = [
    { user_id: "u1", code: activeLocale, label: activeLocale.toUpperCase(), short_label: activeLocale.toUpperCase(), labels: {}, is_default: true, sort_order: 0, created_at: "", updated_at: "", label_override: null, short_label_override: null },
    { user_id: "u1", code: secondLocale, label: secondLocale.toUpperCase(), short_label: secondLocale.toUpperCase(), labels: {}, is_default: false, sort_order: 1, created_at: "", updated_at: "", label_override: null, short_label_override: null },
  ];
  const preset = {
    id: "preset-1", document_id: "doc-en", user_id: "u1", title: "My CV",
    selection: { ...EMPTY_PRESET_SELECTION, summary: [0] },
    is_public: false, allow_indexing: false, ai_generated: false,
    default_locale: activeLocale, slug: null, published_at: null, created_at: "", updated_at: "",
  };
  return { masterResume: documents[0], documents, languages, preset };
}

test("an empty language version shows the friendly empty message, keeps the switcher, and never shows the generic error", () => {
  const fixture = baseFixture({ activeYaml: seededYaml("en"), secondYaml: filledYaml("pl") });
  const html = renderToStaticMarkup(createElement(PresetPreviewModal, { ...fixture, onClose() {} }));

  assert.match(html, /has no content in/);
  assert.doesNotMatch(html, /CV preview could not be rendered from the master resume/);
  // The switcher must stay usable: both language buttons render.
  assert.match(html, />EN</);
  assert.match(html, />PL</);
  assert.doesNotMatch(html, /data-testid="basic-resume-document"/);
});

test("switching to the filled language renders its real content instead of the empty message", () => {
  // PresetPreviewModal's activeLocale starts from preset.default_locale /
  // masterResume.locale; simulating "the user picked the filled language" by
  // making that the initial document proves the same component and the same
  // buildPresetResumeDocument path render real content once it exists —
  // there is no DOM/click-simulation harness in this project to fire the
  // switcher button itself.
  const fixture = baseFixture({ activeYaml: filledYaml("en"), secondYaml: seededYaml("pl") });
  const html = renderToStaticMarkup(createElement(PresetPreviewModal, { ...fixture, onClose() {} }));

  assert.doesNotMatch(html, /has no content in/);
  assert.match(html, /data-testid="basic-resume-document"/);
  assert.match(html, /Filled en summary\./);
});

test("a document that fails to parse shows the generic error, not the empty-language message", () => {
  const fixture = baseFixture({ activeYaml: "not: [valid, yaml", secondYaml: filledYaml("pl") });
  const html = renderToStaticMarkup(createElement(PresetPreviewModal, { ...fixture, onClose() {} }));

  assert.match(html, /CV preview could not be rendered from the master resume/);
  assert.doesNotMatch(html, /has no content in/);
});
