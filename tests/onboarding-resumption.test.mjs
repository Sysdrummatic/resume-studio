import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire, register } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const domain = await import("../app/lib/resume-onboarding.ts");
const { defaultResumeDocument } = await import("../app/lib/resume-schema.ts");
const { default: OnboardingProgress } = await import("../app/onboarding/onboarding-progress.tsx");
const require = createRequire(import.meta.url);
const { outputText } = ts.transpileModule(readFileSync("app/onboarding/onboarding-client.tsx", "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
});
const module = { exports: {} };
const dependencies = {
  "next/link": ({ children, ...props }) => createElement("a", props, children),
  "../components/app-brand": () => null,
  "./onboarding-progress": OnboardingProgress,
  "../lib/resume-onboarding": domain,
  "../lib/resume-export": { buildPublishedResumeExportUrls: () => null },
};
new Function("require", "module", "exports", outputText)(
  (id) => dependencies[id] ?? require(id), module, module.exports,
);
const OnboardingClient = module.exports.default;

function render(step, testRunId) {
  return renderToStaticMarkup(createElement(OnboardingClient, {
    initialState: { status: "paused", step, locale: "en", method: "scratch", ui_language: "en", imported: false, first_preset_id: null },
    testRunId, uiLanguage: "en", locale: "en", languages: [{ code: "en", label: "English" }],
    onUiLanguage() {}, onLocale: async () => {}, onSection() {}, onSave: async () => {},
    loading: false, loadError: false, importing: false, imported: false,
    resume: defaultResumeDocument("Jane Doe"), form: "GDPR form", preview: "CV preview", importControl: null,
  }));
}

test("normal and admin onboarding resume persisted steps on the correct visible card", () => {
  for (const testRunId of [undefined, "test-run"]) {
    for (const [step, heading, count] of [
      [11, "QR codes", "12 / 15"],
      [12, "GDPR clause", "13 / 15"],
      [13, "Review your first CV", "14 / 15"],
      [14, "Ready to save your CV?", "15 / 15"],
    ]) {
      const html = render(step, testRunId);
      assert.ok(html.includes(`<h1 id="onboarding-title" tabindex="-1">${heading}</h1>`), `stored step ${step}`);
      assert.ok(html.includes(`<strong>${count}</strong>`));
      assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
      if (step === 14) assert.match(html, /Yes, create my CV with a link/);
    }
  }
});
