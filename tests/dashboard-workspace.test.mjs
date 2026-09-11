import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);
const { summarizeMasterResume, filterDashboardPresets, getSelectedDashboardPreset } =
  await import("../app/dashboard/dashboard-model.ts");
const { defaultResumeDocument, normalizeResumeDocument } =
  await import("../app/lib/resume-schema.ts");
const { computeResumeCompletion } = await import("../app/master-resume/resume-completion.ts");

test("dashboard counts usable content rather than the editor's empty placeholder rows", () => {
  const empty = summarizeMasterResume(defaultResumeDocument(""));
  assert.deepEqual(empty.counts, { roles: 0, experience: 0, skills: 0, courses: 0 });
  assert.equal(empty.completion.percent, 0);
  const resume = normalizeResumeDocument({
    summary: [{ position: "Engineer", description: "Builds systems" }, { position: "   " }],
    experience: [
      { role: "Engineer", company: "Example" },
      { role: " ", company: "" }
    ],
    skills: [{ name: "TypeScript" }, { name: " " }],
    courses: [{ name: "Accessibility" }, { name: "" }]
  });
  const result = summarizeMasterResume(resume);
  assert.deepEqual(result.counts, { roles: 1, experience: 1, skills: 1, courses: 1 });
  assert.deepEqual(result.completion, computeResumeCompletion(resume));
});

const presets = [
  { id: "a", title: "Engineer", is_public: true },
  { id: "b", title: "Designer", is_public: false },
  { id: "c", title: "Test onboarding", is_public: true, onboarding_test_run_id: "test" }
];
test("filtering is case insensitive, preserves test CVs and does not mutate saved versions", () => {
  assert.deepEqual(
    filterDashboardPresets(presets, " engIN ", "all").map((p) => p.id),
    ["a"]
  );
  assert.deepEqual(
    filterDashboardPresets(presets, "", "private").map((p) => p.id),
    ["b"]
  );
  assert.deepEqual(
    filterDashboardPresets(presets, "", "public").map((p) => p.id),
    ["a", "c"]
  );
  assert.equal(presets.length, 3);
});
test("selection resolves the current row after save/publish and falls back after delete/filter", () => {
  assert.equal(getSelectedDashboardPreset(presets, "b"), presets[1]);
  const updated = presets.map((p) =>
    p.id === "b" ? { ...p, title: "Updated", is_public: true } : p
  );
  assert.equal(getSelectedDashboardPreset(updated, "b").title, "Updated");
  assert.equal(
    getSelectedDashboardPreset(
      presets.filter((p) => p.id !== "b"),
      "b"
    ).id,
    "a"
  );
  assert.equal(getSelectedDashboardPreset([], "a"), null);
});
