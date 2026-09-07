import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import ts from "typescript";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { defaultResumeDocument, normalizeLocale } = await import("../app/lib/resume-schema.ts");
const { upgradeLegacyResumeYamlContent } = await import("../app/lib/resume-server.ts");
const { buildUserDataBundleYaml, parseUserDataBundle } = await import("../app/lib/user-data-transfer.ts");

const routeSource = readFileSync(new URL("../app/api/resume/transfer/import/route.ts", import.meta.url), "utf8");
const routeJs = ts.transpileModule(routeSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

test("oversized legacy YAML bypasses local parsing and remains available for RPC rejection", (t) => {
  const oversizedYaml = `name: Jan Kowalski\n# ${"x".repeat(250_000)}`;
  const loader = t.mock.method(yaml, "load", () => { throw new Error("Must not parse oversized YAML"); });
  assert.equal(upgradeLegacyResumeYamlContent(oversizedYaml), oversizedYaml);
  assert.equal(loader.mock.callCount(), 0);
});

test("legacy upgrade bounds repeated alias merges instead of expanding them", () => {
  const baseKeys = Array.from({ length: 10 }, (_, index) => `k${index}: ${index}`).join(", ");
  const aliases = Array.from({ length: 10 }, () => "*base").join(", ");
  const input = `name: Jan Kowalski\nbase: &base { ${baseKeys} }\nroot: { <<: [${aliases}] }\n`;
  assert.equal(upgradeLegacyResumeYamlContent(input), input);
});

test("ordinary split-name YAML and malformed YAML keep their existing content", () => {
  for (const input of ["first_name: Jan\nfamily_name: Kowalski\n", "name: [unclosed"]) {
    assert.equal(upgradeLegacyResumeYamlContent(input), input);
  }
});

function importRoute({ validationSucceeds = true } = {}) {
  const validated = [];
  const saved = [];
  const audited = [];
  const localeWrites = [];
  const modules = {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "../../../../lib/auth-request": {
      requireRequestActor: async () => ({ ok: true, accessToken: "test-token", actor: { userId: "test-user" } }),
    },
    "../../../../lib/platform-feature-flags": { isUserDataTransferEnabled: async () => true },
    "../../../../lib/resume-schema": { normalizeLocale },
    "../../../../lib/user-data-transfer": { parseUserDataBundle },
    "../../../../lib/supabase-http": {
      callRpc: async ({ payload }) => {
        validated.push(payload.input_yaml);
        return { data: validationSucceeds, error: null };
      },
    },
    "../../../../lib/content-safety-audit": {
      flagSuspiciousResumeContent: async (content) => audited.push(content),
    },
    "../../../../lib/resume-server": {
      upgradeLegacyResumeYamlContent,
      upsertResumeUserLocale: async (...args) => { localeWrites.push(args); return true; },
      saveResumeDraftDocument: async (_token, _userId, _locale, payload) => {
        saved.push(payload.yamlContent);
        return { document: { id: "document-id" } };
      },
      fetchResumePresetsForUser: async () => [],
      fetchResumeDocumentsForUser: async () => [],
    },
  };
  const exports = {};
  new Function("require", "exports", routeJs)((name) => {
    assert.ok(name in modules, `Unexpected import: ${name}`);
    return modules[name];
  }, exports);
  return { POST: exports.POST, validated, saved, audited, localeWrites };
}

function legacyBundleRequest() {
  const { first_name, family_name, ...document } = defaultResumeDocument("Jan Kowalski");
  const yamlContent = buildUserDataBundleYaml({
    languages: [{ code: "pl", label: "Polski", short_label: "PL", is_default: true, sort_order: 0 }],
    documents: [{
      locale: "pl",
      title: "Legacy master",
      yaml_content: yaml.dump({ ...document, name: `${first_name} ${family_name}`, custom_field: "keep me" }),
    }],
    cv_versions: [],
  });
  return new Request("http://localhost/api/resume/transfer/import", {
    method: "POST", body: JSON.stringify({ yamlContent }),
  });
}

test("legacy v1 backup validates, saves and audits the same upgraded document without losing unknown fields", async () => {
  const route = importRoute();
  const response = await route.POST(legacyBundleRequest());
  assert.equal(response.status, 200);
  const validatedDocument = yaml.load(route.validated[0]);
  assert.equal(validatedDocument.first_name, "Jan");
  assert.equal(validatedDocument.family_name, "Kowalski");
  assert.equal(validatedDocument.custom_field, "keep me");
  assert.equal("name" in validatedDocument, false);
  assert.deepEqual(route.saved, route.validated);
  assert.deepEqual(route.audited, route.validated);
});

test("failed validation after legacy upgrade leaves documents and locales untouched", async () => {
  const route = importRoute({ validationSucceeds: false });
  const response = await route.POST(legacyBundleRequest());
  assert.equal(response.status, 400);
  assert.equal(route.saved.length, 0);
  assert.equal(route.localeWrites.length, 0);
});

test("additive SQL compatibility migration retains required fields and accepts only complete name shapes", () => {
  const sql = readFileSync(new URL(
    "../supabase/migrations/20260906000000_preserve_legacy_resume_yaml_validation.sql", import.meta.url,
  ), "utf8");
  assert.match(sql, /length\(input_yaml\) > 250000/);
  for (const key of Object.keys(defaultResumeDocument()).filter((key) => !["first_name", "family_name"].includes(key))) {
    assert.ok(sql.includes(`'${key}'`), `Missing required field ${key}`);
  }
  assert.match(sql, /return \(has_first_name and has_family_name\)\s+or \(not has_first_name and not has_family_name and input_yaml ~ '\(\?m\)\^name\\s\*:'\)/);
  assert.doesNotMatch(sql, /update public\.resume_(?:documents|revisions)|alter table|security definer/i);
});
