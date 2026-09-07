import test from "node:test";
import assert from "node:assert/strict";
import { register, createRequire } from "node:module";
import { readFileSync } from "node:fs";
import ts from "typescript";
import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const domain = await import("../app/lib/resume-onboarding.ts");
const schema = await import("../app/lib/resume-schema.ts");
const { applyResumeSelectionToRawDocument } = await import("../app/lib/preset-selection.ts");
const { hasCapability } = await import("../app/lib/rbac.ts");
const require = createRequire(import.meta.url);

function loadModule(path, dependencies) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (id) => dependencies[id] ?? require(id),
    module,
    module.exports
  );
  return module.exports;
}

const initial = {
  status: "pending",
  step: 0,
  locale: "en",
  method: "scratch",
  ui_language: "en",
  first_preset_id: null,
  imported: false
};

test("only newly enrolled accounts start automatically; paused, active, completed and existing users do not", () => {
  assert.equal(domain.shouldStartOnboarding(initial), true);
  for (const state of [
    null,
    ...["active", "paused", "completed"].map((status) => ({ ...initial, status }))
  ]) {
    assert.equal(domain.shouldStartOnboarding(state), false);
  }
});

test("progress validates the step and language and never accepts publication or owner fields", () => {
  const progress = {
    ...initial,
    status: "active",
    step: domain.ONBOARDING_REVIEW_STEP,
    imported: true
  };
  const parsed = domain.parseOnboardingProgress({
    ...progress,
    user_id: "other-user",
    first_preset_id: "other-cv"
  });
  assert.equal(parsed.imported, true);
  assert.equal("user_id" in parsed, false);
  assert.equal("first_preset_id" in parsed, false);
  for (const patch of [
    { step: -1 },
    { step: 15 },
    { step: 1.5 },
    { status: "completed" },
    { locale: "en&user_id=eq.other" },
    { method: "unknown" },
    { ui_language: "xx" },
    { imported: "true" }
  ]) {
    assert.equal(domain.parseOnboardingProgress({ ...progress, ...patch }), null);
  }
});

test("first CV includes meaningful entries and one filled summary, preserving source indexes", () => {
  const resume = schema.defaultResumeDocument("Jane Doe");
  resume.summary.push({ position: "Engineer", description: "Builds products", default: false });
  resume.experience.push({ role: "Engineer", company: "Example", period: "2024", highlights: [] });
  resume.skills.push({ name: "JavaScript", level: 4 });
  resume.interests = ["", "Hiking"];
  const selection = domain.firstCvSelection(resume);
  assert.deepEqual(selection.summary, [1]);
  assert.deepEqual(selection.experience, [1]);
  assert.deepEqual(selection.skills, [1]);
  assert.deepEqual(selection.interests, [1]);
  assert.deepEqual(selection.courses, []);
  assert.equal(domain.isFirstCvReady(resume), true);
  assert.equal(domain.isFirstCvReady(schema.defaultResumeDocument("Jane")), false);
  resume.first_name = "";
  resume.family_name = "";
  assert.equal(domain.isFirstCvReady(resume), false);
});

test("selection retains partial entries and prefers the filled default summary", () => {
  const resume = schema.defaultResumeDocument("Jane Doe");
  resume.summary = [
    { position: "First", description: "", default: false },
    { position: "Preferred", description: "", default: true }
  ];
  resume.experience = [{ role: " ", company: "Example", period: "", highlights: [] }];
  resume.education = [{ school: "", degree: "MSc", period: "", detail: "" }];
  const selection = domain.firstCvSelection(resume);
  assert.deepEqual(selection.summary, [1]);
  assert.deepEqual(selection.experience, [0]);
  assert.deepEqual(selection.education, [0]);
});

test("selection indexes are computed against the raw yaml array, not the post-normalization one", () => {
  const raw = {
    first_name: "Jane",
    family_name: "Doe",
    summary: "A short summary",
    experience: [
      { period: "", company: "", role: "", highlights: [] },
      { period: "2024", company: "Example", role: "Engineer", highlights: [] }
    ]
  };
  const selection = domain.firstCvSelection(raw);
  assert.deepEqual(selection.experience, [1]);
  const applied = applyResumeSelectionToRawDocument(raw, selection);
  assert.equal(applied.experience.length, 1);
  assert.equal(applied.experience[0].company, "Example");
});

function serverFixture() {
  const state = { ...initial, status: "active", step: 14 };
  const resume = schema.defaultResumeDocument("Jane Doe");
  resume.summary[0] = { position: "Engineer", description: "Builds products", default: true };
  const presets = [];
  const calls = [];
  let failPublish = false;
  let failCompletion = false;
  const server = loadModule("app/lib/resume-onboarding-server.ts", {
    "./resume-onboarding": domain,
    "./resume-schema": schema,
    "./supabase-http": {
      queryTable: async (input) => {
        assert.equal(input.accessToken, "owner-token");
        assert.match(input.query, /user_id=eq.owner/);
        return {
          data:
            input.table === "resume_onboarding"
              ? [{ ...state }]
              : [{ id: "doc", locale: "en", yaml_content: yaml.dump(resume) }]
        };
      },
      updateTable: async (input) => {
        calls.push("complete");
        assert.match(input.query, /user_id=eq.owner/);
        if (failCompletion) return { error: "network error" };
        Object.assign(state, input.values);
        return { data: [{ ...state }] };
      },
      callRpc: async (input) => {
        calls.push("reserve");
        assert.equal(input.functionName, "reserve_onboarding_preset");
        if (!state.first_preset_id) {
          state.first_preset_id = "first-cv";
          presets.push({ id: "first-cv" });
        }
        return { data: state.first_preset_id };
      }
    },
    "./resume-server": {
      fetchResumePresetsForUser: async (userId) => {
        assert.equal(userId, "owner");
        return presets;
      },
      publishResumePreset: async (_token, userId, id, options) => {
        assert.equal(userId, "owner");
        assert.equal(id, "first-cv");
        assert.equal(options.allowIndexing, false);
        assert.deepEqual(options.selectedLocales, ["en"]);
        calls.push("publish");
        if (failPublish) throw Error("private internal SQL detail");
        presets[0].canonical_public_path = "/jane-doe/first-cv";
        return presets[0];
      }
    }
  });
  return {
    server,
    state,
    calls,
    presets,
    resume,
    failPublish: (value) => {
      failPublish = value;
    },
    failCompletion: (value) => {
      failCompletion = value;
    }
  };
}

test("declining publication completes the guide without creating any CV or link", async () => {
  const f = serverFixture();
  assert.deepEqual(await f.server.completeOnboarding("owner-token", "owner", false), {
    publicPath: null
  });
  assert.deepEqual(f.calls, ["complete"]);
  assert.equal(f.state.status, "completed");
  assert.equal(f.presets.length, 0);
});

test("failed publication remains resumable and retries use the same first CV", async () => {
  const f = serverFixture();
  f.failPublish(true);
  await assert.rejects(f.server.completeOnboarding("owner-token", "owner", true));
  assert.equal(f.state.status, "active");
  assert.equal(f.presets.length, 1);
  f.failPublish(false);
  const result = await f.server.completeOnboarding("owner-token", "owner", true);
  assert.equal(result.publicPath, "/jane-doe/first-cv");
  assert.equal(f.presets.length, 1);
  assert.equal(f.state.status, "completed");
  const publishedCount = f.calls.filter((call) => call === "publish").length;
  assert.deepEqual(await f.server.completeOnboarding("owner-token", "owner", true), result);
  assert.equal(f.calls.filter((call) => call === "publish").length, publishedCount);
});

test("a lost completion write retries without publishing an already live CV again", async () => {
  const f = serverFixture();
  f.failCompletion(true);
  await assert.rejects(f.server.completeOnboarding("owner-token", "owner", true));
  assert.equal(f.state.status, "active");
  f.failCompletion(false);
  await f.server.completeOnboarding("owner-token", "owner", true);
  assert.equal(f.calls.filter((call) => call === "publish").length, 1);
});

test("empty first CV is never published", async () => {
  const f = serverFixture();
  f.resume.summary = [];
  await assert.rejects(f.server.completeOnboarding("owner-token", "owner", true));
  assert.equal(f.calls.length, 0);
});

test("route enforces auth and existing capabilities for all four roles; errors do not expose internals", async () => {
  for (const role of ["admin", "manager", "user", "recruiter", null]) {
    let called = false;
    const route = loadModule("app/api/resume/onboarding/route.ts", {
      "../../../lib/auth-request": {
        requireRequestActor: async (options) => {
          if (!role) return { ok: false, status: 401, message: "Authentication required." };
          assert.ok(options.allCapabilities.every((capability) => hasCapability(role, capability)));
          return { ok: true, accessToken: "token", actor: { userId: "owner" } };
        }
      },
      "../../../lib/resume-onboarding": domain,
      "../../../lib/resume-onboarding-server": {
        completeOnboarding: async (_token, userId, publish) => {
          assert.equal(userId, "owner");
          assert.equal(publish, true);
          called = true;
          throw Error("secret service role key and SQL internals");
        }
      }
    });
    const response = await route.POST(
      new Request("http://localhost/api/resume/onboarding", {
        method: "POST",
        body: JSON.stringify({ publish: true, userId: "victim" })
      })
    );
    assert.equal(response.status, role ? 500 : 401);
    assert.equal(called, Boolean(role));
    assert.doesNotMatch(await response.text(), /secret|SQL|victim/);
  }
});

test("final action requires an explicit boolean publication choice", async () => {
  const route = loadModule("app/api/resume/onboarding/route.ts", {
    "../../../lib/auth-request": {
      requireRequestActor: async () => ({
        ok: true,
        accessToken: "token",
        actor: { userId: "owner" }
      })
    },
    "../../../lib/resume-onboarding": domain,
    "../../../lib/resume-onboarding-server": {
      completeOnboarding: async () => assert.fail("must not publish")
    }
  });
  for (const body of ["{broken", "null", "{}", '{"publish":"true"}']) {
    const response = await route.POST(
      new Request("http://localhost/api/resume/onboarding", { method: "POST", body })
    );
    assert.equal(response.status, 400);
  }
});
