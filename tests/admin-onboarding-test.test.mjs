import test from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const domain = await import("../app/lib/resume-onboarding.ts");
const testDomain = await import("../app/lib/onboarding-test.ts");
const schema = await import("../app/lib/resume-schema.ts");
const { isRoleAuthorized } = await import("../app/lib/rbac.ts");
const require = createRequire(import.meta.url);
const runId = "00000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ runId }) };

function loadModule(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)((id) => dependencies[id] ?? require(id), module, module.exports);
  return module.exports;
}

function routes(role = "admin", run = { id: runId, status: "active", locale: "en", drafts: {} }) {
  const calls = [];
  const auth = { requireRequestActor: async (options) => {
    assert.deepEqual(options.acceptedRoles, ["admin"]);
    return role && isRoleAuthorized(role, options) ? { ok: true, accessToken: "owner-token", actor: { userId: "owner" } }
      : { ok: false, status: role ? 403 : 401, message: "Denied" };
  } };
  const server = {
    fetchOnboardingTest: async (token, userId, requestedId) => {
      assert.equal(token, "owner-token"); assert.equal(userId, "owner");
      if (requestedId) assert.equal(requestedId, runId);
      return run;
    },
    onboardingTestRpc: async (token, name, payload) => { assert.equal(token, "owner-token"); calls.push({ name, payload }); return run; }
  };
  const dependencies = (prefix) => ({ [`${prefix}/auth-request`]: auth, [`${prefix}/onboarding-test-server`]: server,
    [`${prefix}/onboarding-test`]: testDomain, [`${prefix}/resume-onboarding`]: domain, [`${prefix}/resume-schema`]: schema,
    [`${prefix}/content-safety-audit`]: { flagSuspiciousResumeContent: async () => {} } });
  return { calls,
    settings: loadModule("app/api/admin/onboarding-test/route.ts", dependencies("../../../lib")),
    run: loadModule("app/api/admin/onboarding-test/[runId]/route.ts", dependencies("../../../../lib")) };
}
const request = (body, method = "POST") => new Request("http://localhost/api/admin/onboarding-test", { method, body: JSON.stringify(body) });

test("all test operations reject non-admin roles and anonymous callers before reading or writing", async () => {
  for (const role of ["manager", "user", "recruiter", null]) {
    const r = routes(role);
    for (const response of [await r.settings.GET(), await r.settings.POST(request({ action: "start" })),
      await r.run.GET(request({}), context), await r.run.PATCH(request({}, "PATCH"), context), await r.run.POST(request({ publish: true }), context)]) {
      assert.equal(response.status, role ? 403 : 401);
    }
    assert.equal(r.calls.length, 0);
  }
});

test("admin can arm, start, disarm or restart only their own run", async () => {
  const r = routes();
  for (const action of ["arm", "start", "disarm", "restart"]) {
    assert.equal((await r.settings.POST(request({ action, expectedRunId: runId, userId: "victim" }))).status, 200);
    assert.deepEqual(r.calls.at(-1), { name: "configure_onboarding_test", payload: { input_action: action, input_expected_run_id: runId } });
  }
});

test("test draft save validates input and writes only to isolated RPC", async () => {
  const r = routes(); const resume = schema.defaultResumeDocument("Test Person");
  resume.summary[0] = { position: "Test engineer", description: "Test content", default: true };
  const content = yaml.dump(resume);
  const response = await r.run.PATCH(request({ locale: "pl", yamlContent: content, userId: "victim", documentId: "master" }, "PATCH"), context);
  assert.equal(response.status, 200);
  assert.deepEqual(r.calls[0], { name: "save_onboarding_test", payload: { input_run_id: runId, input_locale: "pl", input_yaml: content, input_selection: domain.firstCvSelection(resume) } });
  for (const invalid of [{ locale: "de", yamlContent: content }, { locale: "en", yamlContent: "x".repeat(250001) }, { locale: "en", yamlContent: "[invalid" }]) {
    assert.equal((await r.run.PATCH(request(invalid, "PATCH"), context)).status, 400);
  }
  assert.equal(r.calls.length, 1);
});

test("foreign or missing run cannot be read, saved or finished", async () => {
  const r = routes("admin", null);
  assert.equal((await r.run.GET(request({}), context)).status, 404);
  assert.equal((await r.run.POST(request({ publish: false }), context)).status, 404);
  assert.equal((await r.run.PATCH(request({ status: "active", step: 2, locale: "en", method: "scratch", ui_language: "en", imported: false }, "PATCH"), context)).status, 404);
  assert.equal(r.calls.length, 0);
});

test("test completion requires explicit consent and a publishable saved draft", async () => {
  const r = routes();
  assert.equal((await r.run.POST(request({ publish: "true" }), context)).status, 400);
  assert.equal((await r.run.POST(request({ publish: true }), context)).status, 400);
  assert.equal(r.calls.length, 0);
  assert.equal((await r.run.POST(request({ publish: false }), context)).status, 200);
  assert.deepEqual(r.calls[0], { name: "finish_onboarding_test", payload: { input_run_id: runId, input_publish: false } });
});

test("invalid run IDs never reach storage", async () => {
  const r = routes();
  for (const id of ["", "../other", `${runId}&user_id=eq.victim`]) {
    assert.equal((await r.run.GET(request({}), { params: Promise.resolve({ runId: id }) })).status, 400);
  }
  assert.equal(r.calls.length, 0);
});

test("completed tests reject stale draft writes while allowing completion retries", async () => {
  const r = routes("admin", { id: runId, status: "completed", locale: "en", drafts: {} });
  const content = yaml.dump(schema.defaultResumeDocument("Stale draft"));
  assert.equal((await r.run.PATCH(request({ locale: "en", yamlContent: content }, "PATCH"), context)).status, 409);
  assert.equal((await r.run.PATCH(request({ status: "active", step: 14, locale: "en", method: "scratch", ui_language: "en", imported: false }, "PATCH"), context)).status, 200);
  assert.equal(r.calls.length, 0);
  assert.equal((await r.run.POST(request({ publish: true }), context)).status, 200);
  assert.deepEqual(r.calls[0], { name: "finish_onboarding_test", payload: { input_run_id: runId, input_publish: true } });
});
