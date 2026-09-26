import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { planSynchronizedBuffer, saveLocalesInOrder } = await import("../app/master-resume/locale-save-plan.ts");

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
