import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import ts from "typescript";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { applyResumeSelectionToRawDocument } = await import("../app/lib/preset-selection.ts");

const routeSource = readFileSync(new URL("../app/api/resume/transfer/import/route.ts", import.meta.url), "utf8");
const routeJs = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

const selection = (summaryIndex) => ({
  summary: [summaryIndex], experience: [], education: [], courses: [],
  skills: [], interests: [], languages: [], tech_stack: [],
});
const documentYaml = yaml.dump({
  first_name: "Ada", family_name: "Example",
  summary: [{ position: "Engineer", description: "Builds software", default: true }],
  experience: [], education: [], courses: [], skills: [], interests: [],
  languages: [], tech_stack: [],
});

function importRoute({ variant = false, invalid = true, crossLocaleDefault = false, fail = null } = {}) {
  const writes = [];
  const savedSelections = [];
  const importedVariants = [];
  const bundle = {
    languages: [{ code: "en", is_default: !crossLocaleDefault }, ...(variant || crossLocaleDefault ? [{ code: "pl", is_default: crossLocaleDefault }] : [])],
    documents: [{ locale: "en", title: "Experience Base", yaml_content: documentYaml },
      ...(variant || crossLocaleDefault ? [{ locale: "pl", title: "Baza doświadczeń", yaml_content: documentYaml }] : [])],
    cv_versions: [{
      title: "Example CV", default_locale: "en", selection: selection(variant || !invalid ? 0 : 9),
      variants: variant ? [{ locale: "pl", selection: selection(invalid ? 9 : 0) }] : [],
      style_settings: {}, allow_indexing: false, ai_generated: false,
    }],
  };
  if (crossLocaleDefault) {
    bundle.documents[0].yaml_content = yaml.dump({
      ...yaml.load(documentYaml),
      summary: [{ position: "First", description: "One" }, { position: "Second", description: "Two" }],
    });
    bundle.cv_versions[0].default_locale = "pl";
    bundle.cv_versions[0].selection = selection(1);
    bundle.cv_versions[0].variants = [
      { locale: "pl", selection: selection(0) },
      { locale: "en", selection: selection(1) },
    ];
  }
  const modules = {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "js-yaml": yaml,
    "../../../../lib/auth-request": { requireRequestActor: async () => ({ ok: true, accessToken: "token", actor: { userId: "owner" } }) },
    "../../../../lib/platform-feature-flags": { isUserDataTransferEnabled: async () => true },
    "../../../../lib/resume-schema": { normalizeLocale: (value) => value },
    "../../../../lib/resume-server": {
      deleteResumePreset: async () => { writes.push("delete preset"); return fail !== "delete"; },
      fetchResumeDocumentsForUser: async () => bundle.documents.map((document) => ({ ...document, id: `doc-${document.locale}` })),
      fetchResumePresetsForUser: async () => fail === "delete" ? [{ id: "old-preset", is_public: false }] : [],
      fetchPrivateResumePresetIdsForUser: async () => fail === "presetRead" ? null : fail === "delete" ? ["old-preset"] : [],
      importLanguagesAndDocuments: async () => { writes.push("import documents"); return { ok: true }; },
      importResumePresetVariant: async (_token, _user, _preset, locale, selected) => {
        writes.push("import variant"); importedVariants.push({ locale, selection: selected }); return fail !== "variant";
      },
      normalizeResumePresetSelection: (value) => value,
      saveResumePreset: async (_token, _user, payload) => {
        writes.push("save preset"); savedSelections.push(payload.selection); return fail === "save" ? null : { id: "preset-1" };
      },
      upgradeLegacyResumeYamlContent: (value) => value,
      validateResumePresetSelection: (value) => value.summary.length === 1 ? [] : ["summary"],
    },
    "../../../../lib/user-data-transfer": { parseUserDataBundle: () => ({ bundle }) },
    "../../../../lib/supabase-http": { callRpc: async () => ({ data: true, error: null }) },
    "../../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => {} },
    "../../../../lib/preset-selection": { applyResumeSelectionToRawDocument },
  };
  const exports = {};
  new Function("require", "exports", routeJs)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return { POST: exports.POST, writes, savedSelections, importedVariants };
}

for (const variant of [false, true]) {
  test(`import rejects an out-of-range ${variant ? "variant" : "CV"} selection before writes`, async () => {
    const route = importRoute({ variant });
    const response = await route.POST(new Request("http://localhost/api/resume/transfer/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yamlContent: "bundle" }),
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(route.writes, []);
  });
}

test("import still saves a CV with applicable selections", async () => {
  const route = importRoute({ variant: true, invalid: false });
  const response = await route.POST(new Request("http://localhost/api/resume/transfer/import", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ yamlContent: "bundle" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(route.writes, ["import documents", "save preset", "import variant"]);
});

test("import uses the default-locale variant when the original CV selection belongs to another language", async () => {
  const route = importRoute({ crossLocaleDefault: true });
  const response = await route.POST(new Request("http://localhost/api/resume/transfer/import", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ yamlContent: "bundle" }),
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(route.savedSelections, [selection(0)]);
  assert.deepEqual(route.importedVariants, [{ locale: "en", selection: selection(1) }]);
});

for (const fail of ["delete", "save", "variant"]) {
  test(`import reports a failed ${fail} operation instead of claiming success`, async () => {
    const route = importRoute({ variant: fail === "variant", invalid: false, fail });
    const response = await route.POST(new Request("http://localhost/api/resume/transfer/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yamlContent: "bundle" }),
    }));
    assert.equal(response.status, 500);
    assert.equal((await response.json()).ok, false);
    if (fail === "delete") assert.deepEqual(route.writes, ["import documents", "delete preset"]);
  });
}

test("import stops before writes when existing private CV versions cannot be read", async () => {
  const route = importRoute({ invalid: false, fail: "presetRead" });
  const response = await route.POST(new Request("http://localhost/api/resume/transfer/import", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ yamlContent: "bundle" }),
  }));
  assert.equal(response.status, 500);
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.match(payload.error, /No changes were saved/);
  assert.deepEqual(route.writes, []);
});
