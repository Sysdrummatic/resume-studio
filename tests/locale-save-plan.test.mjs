import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { readAppDictionary } from "./helpers/app-i18n.mjs";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { planSynchronizedBuffer, saveLocalesInOrder, synchronizationFailureMessages } = await import("../app/master-resume/locale-save-plan.ts");
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("translations are saved before the default language, whose save rewrites them", async () => {
  const events = [];
  const save = async (locale) => {
    events.push(`start:${locale}`);
    await new Promise((resolve) => setTimeout(resolve, locale === "pl" ? 20 : 1));
    events.push(`end:${locale}`);
    return locale;
  };

  const outcomes = await saveLocalesInOrder(["en", "pl", "de"], "en", save);

  assert.ok(events.indexOf("start:en") > events.indexOf("end:pl"), "the default starts after the slowest translation finished");
  assert.ok(events.indexOf("start:en") > events.indexOf("end:de"));
  assert.deepEqual(outcomes.map((outcome) => outcome.value), ["en", "pl", "de"], "outcomes stay aligned with the targets");
});

test("a failed translation does not stop the default language from being saved", async () => {
  const outcomes = await saveLocalesInOrder(["pl", "en"], "en", async (locale) => {
    if (locale === "pl") throw new Error("pl: conflict");
    return locale;
  });

  assert.equal(outcomes[0].status, "rejected");
  assert.equal(outcomes[1].status, "fulfilled");
});

const buffer = (updatedAt, dirty = false) => ({
  documentRow: { updated_at: updatedAt },
  yamlPanel: dirty ? "edited" : "saved",
  savedYamlContent: "saved",
  cvStyle: { template: "a" },
  savedCvStyle: { template: "a" },
});

test("a translation rewritten from the version the editor holds is refreshed or rebased", () => {
  assert.equal(planSynchronizedBuffer(buffer("v1"), "v1"), "replace");
  assert.equal(planSynchronizedBuffer(buffer("v1", true), "v1"), "rebase");
});

test("a translation that also changed elsewhere is left stale so its next save is a visible conflict", () => {
  assert.equal(planSynchronizedBuffer(buffer("v0"), "v1"), "stale");
  assert.equal(planSynchronizedBuffer(buffer("v0", true), "v1"), "stale");
  assert.equal(planSynchronizedBuffer({ ...buffer("v1"), documentRow: null }, "v1"), "stale");
});

test("a legacy conflict reported by the sync becomes a readable, localized editor message", () => {
  const messages = synchronizationFailureMessages(
    { synchronizationFailed: [{ locale: "pl", reason: "legacy-pairing", conflicts: [{ collection: "experience", reason: "count", defaultCount: 1, translationCount: 2 }] }], synchronizationComplete: true },
    "en",
  );

  assert.deepEqual(messages.map(({ locale, key }) => [locale, key]), [["pl", "{locale}: this older language version does not match the default language's entries ({collections}), so it was left unchanged. Make its entries match the default language, then save again."]]);
  assert.deepEqual(messages[0].params, { locale: "pl", collections: "experience" });
});

test("editor failure messages exist in both the English and the Polish dictionary", () => {
  const keys = [
    ...synchronizationFailureMessages({ synchronizationFailed: [{ locale: "pl", reason: "legacy-pairing", conflicts: [] }, { locale: "de", reason: "read" }], synchronizationComplete: false }, "en"),
  ].map((message) => message.key);
  for (const locale of ["en", "pl"]) {
    const text = readAppDictionary(locale).editor.text;
    for (const key of new Set(keys)) assert.ok(text[key], `${locale} translates ${key}`);
  }
});

test("a partial save gives the editor the stored version to retry from and a localized explanation", async () => {
  const { partialSaveFailure, PARTIAL_SAVE_MESSAGE } = await import("../app/master-resume/locale-save-plan.ts");
  const document = { id: "doc-pl", updated_at: "v2" };

  assert.deepEqual(partialSaveFailure({ saved: true, document, incomplete: ["revision"], error: "x" }, "pl"), {
    document,
    message: { locale: "pl", key: PARTIAL_SAVE_MESSAGE, params: { locale: "pl" } },
  });
  assert.equal(partialSaveFailure({ error: "Publish failed." }, "pl"), null, "an ordinary failure keeps the old base");
  assert.equal(partialSaveFailure({ saved: true }, "pl"), null, "no version, no rebase");
  for (const locale of ["en", "pl"]) {
    assert.ok(readAppDictionary(locale).editor.text[PARTIAL_SAVE_MESSAGE], `${locale} translates the partial-save message`);
  }
});

const ambiguousPayload = { code: "legacy-pairing", error: "English server text", legacyConflicts: [{ collection: "interests", reason: "ambiguous" }] };
const orderPayload = { code: "legacy-pairing", error: "English server text", legacyConflicts: [{ collection: "experience", reason: "order", index: 0 }] };

test("a 409 legacy-pairing response becomes a keyed message, with a confirmation only for ambiguous order", async () => {
  const { legacyConflictFailure, LEGACY_PAIRING_MESSAGE, LEGACY_PAIRING_AMBIGUOUS_MESSAGE, LEGACY_PAIRING_CONFIRM_PROMPT } = await import("../app/master-resume/locale-save-plan.ts");

  assert.deepEqual(legacyConflictFailure(ambiguousPayload, "pl"), {
    message: { locale: "pl", key: LEGACY_PAIRING_AMBIGUOUS_MESSAGE, params: { locale: "pl", collections: "interests" } },
    prompt: { locale: "pl", key: LEGACY_PAIRING_CONFIRM_PROMPT, params: { locale: "pl", collections: "interests" } },
  });
  assert.deepEqual(legacyConflictFailure(orderPayload, "pl"), {
    message: { locale: "pl", key: LEGACY_PAIRING_MESSAGE, params: { locale: "pl", collections: "experience" } },
    prompt: null,
  });
  assert.equal(legacyConflictFailure({ error: "Publish failed." }, "pl"), null);
});

test("a direct save of an ambiguous legacy version is resent once the user confirms, and never for an order conflict", async () => {
  const { saveWithLegacyConfirmation } = await import("../app/master-resume/locale-save-plan.ts");
  const run = async (firstPayload, answer) => {
    const sent = [];
    const prompts = [];
    const outcome = await saveWithLegacyConfirmation(
      "pl",
      async (confirm) => {
        sent.push(confirm);
        return confirm ? { status: 200, payload: { ok: true } } : { status: 409, payload: firstPayload };
      },
      async (prompt) => {
        prompts.push(prompt.key);
        return answer;
      },
    );
    return { sent, prompts, outcome };
  };

  const confirmed = await run(ambiguousPayload, true);
  assert.deepEqual(confirmed.sent, [false, true]);
  assert.deepEqual(confirmed.outcome, { status: 200, payload: { ok: true } });

  const declined = await run(ambiguousPayload, false);
  assert.deepEqual(declined.sent, [false]);
  assert.equal(declined.outcome.status, 409);

  const order = await run(orderPayload, true);
  assert.deepEqual([order.sent, order.prompts], [[false], []], "a contradicting order is never offered for confirmation");
});

test("legacy-pairing messages render in English and Polish from the dictionaries, not from payload.error", async () => {
  const { formatAppMessage } = await import("../app/i18n/locale.ts");
  const plan = await import("../app/master-resume/locale-save-plan.ts");
  const keys = [plan.LEGACY_PAIRING_MESSAGE, plan.LEGACY_PAIRING_AMBIGUOUS_MESSAGE, plan.LEGACY_PAIRING_CONFIRM_PROMPT];
  const params = { locale: "pl", collections: "interests" };
  const rendered = {};
  for (const language of ["en", "pl"]) {
    const text = readAppDictionary(language).editor.text;
    rendered[language] = keys.map((key) => {
      assert.ok(text[key], `${language} translates ${key}`);
      return formatAppMessage(text[key], params);
    });
  }
  for (const [index, key] of keys.entries()) {
    assert.notEqual(rendered.pl[index], rendered.en[index], `Polish is translated: ${key}`);
    for (const message of [rendered.en[index], rendered.pl[index]]) {
      assert.match(message, /interests/);
      assert.doesNotMatch(message, /English server text|\{/);
    }
  }
});

test("the publish route answers a direct save of a problematic legacy version with a structured code", async () => {
  const ts = (await import("typescript")).default;
  const server = await import("../app/lib/resume-server.ts");
  const js = ts.transpileModule(read("app/api/resume/publish/route.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const route = {};
  const modules = {
    "next/server": { NextResponse: { json: (body, init) => Response.json(body, init) } },
    "../../../lib/auth-request": { requireRequestActor: async () => ({ ok: true, actor: { userId: "u" }, accessToken: "t" }) },
    "../../../lib/rate-limit": { rateLimit: async () => ({ success: true, reset: Date.now() }) },
    "../../../lib/resume-schema": await import("../app/lib/resume-schema.ts"),
    "../../../lib/supabase-http": { callRpc: async () => ({ data: true }) },
    "../../../lib/content-safety-audit": { flagSuspiciousResumeContent: async () => {} },
    "../../../lib/resume-server": {
      ...server,
      publishResumeDocument: async () => { throw new server.ResumeLegacyPairingError([{ collection: "experience", reason: "order", index: 0 }]); },
    },
  };
  new Function("require", "exports", js)((name) => modules[name], route);

  const response = await route.POST(new Request("http://localhost/api/resume/publish", { method: "POST", body: JSON.stringify({ locale: "pl", yamlContent: "name: Jan" }) }));
  const body = await response.json();

  assert.equal(response.status, 409);
  assert.equal(body.code, "legacy-pairing");
  assert.deepEqual(body.legacyConflicts, [{ collection: "experience", reason: "order", index: 0 }]);
});
