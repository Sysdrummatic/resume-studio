import test from "node:test";
import assert from "node:assert/strict";
import {
  buildResumeLanguageTemplate,
  ensureResumeEntryIds,
  hasCompleteResumeLinkage,
  reconcileResumeLanguageDocument,
  withoutResumeEntryIds,
} from "../app/lib/resume-language-linkage.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const linkedWithOcv = () => ({
  first_name: "Lukasz",
  summary: [{ entry_id: "s-1", position: "TW", description: "d", default: true }],
  skills: [{ entry_id: "k-1", name: "Writing", level: 5 }],
  tech_stack: ["TypeScript", "Git"],
  interests: ["Music"],
  __ocv: { entries: { tech_stack: ["t-1", "t-2"], interests: ["i-1"] } },
});

test("string lists with __ocv ids become entry objects that keep their ids, and __ocv disappears", () => {
  const result = ensureResumeEntryIds(linkedWithOcv());

  assert.deepEqual(result.tech_stack, [
    { entry_id: "t-1", name: "TypeScript" },
    { entry_id: "t-2", name: "Git" },
  ]);
  assert.deepEqual(result.interests, [{ entry_id: "i-1", name: "Music" }]);
  assert.equal("__ocv" in result, false);
});

test("an id-less legacy document gets position-derived ids for the text lists", () => {
  const result = ensureResumeEntryIds({ tech_stack: ["A", "B"], interests: ["X"] });

  assert.deepEqual(result.tech_stack.map((item) => item.entry_id), ["legacy-tech_stack-0", "legacy-tech_stack-1"]);
  assert.equal(result.interests[0].entry_id, "legacy-interests-0");
});

test("text rows added to an already linked document get random ids, never positional ones", () => {
  const result = ensureResumeEntryIds({ ...linkedWithOcv(), __ocv: undefined, tech_stack: ["A"], interests: [] });

  assert.match(result.tech_stack[0].entry_id, UUID);
});

test("ids stay attached to their text when an earlier entry is removed", () => {
  const upgraded = ensureResumeEntryIds(linkedWithOcv());
  const afterRemoval = ensureResumeEntryIds({ ...upgraded, tech_stack: upgraded.tech_stack.slice(1) });

  assert.deepEqual(afterRemoval.tech_stack, [{ entry_id: "t-2", name: "Git" }]);
});

test("the old string shape still counts as completely linked while __ocv carries the ids", () => {
  assert.equal(hasCompleteResumeLinkage(linkedWithOcv()), true);
  assert.equal(hasCompleteResumeLinkage({ ...linkedWithOcv(), __ocv: undefined }), false);
});

test("a new language template keeps the text-list ids and blanks the names", () => {
  const template = buildResumeLanguageTemplate(linkedWithOcv());

  assert.deepEqual(template.tech_stack, [
    { entry_id: "t-1", name: "" },
    { entry_id: "t-2", name: "" },
  ]);
  assert.equal("__ocv" in template, false);
});

test("reconciliation matches translated text-list entries by id and drops removed ones", () => {
  const base = ensureResumeEntryIds(linkedWithOcv());
  const translation = {
    ...base,
    tech_stack: [{ entry_id: "t-2", name: "Git (pl)" }, { entry_id: "gone", name: "Old" }],
    interests: [{ entry_id: "i-1", name: "Muzyka" }],
  };

  const result = reconcileResumeLanguageDocument(base, translation);

  assert.deepEqual(result.tech_stack, [
    { entry_id: "t-1", name: "" },
    { entry_id: "t-2", name: "Git (pl)" },
  ]);
  assert.deepEqual(result.interests, [{ entry_id: "i-1", name: "Muzyka" }]);
});

test("stripping ids keeps the text of the lists", () => {
  const result = withoutResumeEntryIds(linkedWithOcv());

  assert.deepEqual(result.tech_stack, [{ name: "TypeScript" }, { name: "Git" }]);
  assert.equal("__ocv" in result, false);
});

test("the old text-list shape is recognised so the editor can rewrite it on open", async () => {
  const { hasLegacyTextListShape } = await import("../app/lib/resume-language-linkage.ts");

  assert.equal(hasLegacyTextListShape(linkedWithOcv()), true);
  assert.equal(hasLegacyTextListShape({ tech_stack: ["A"] }), true);
  assert.equal(hasLegacyTextListShape(ensureResumeEntryIds(linkedWithOcv())), false);
});
