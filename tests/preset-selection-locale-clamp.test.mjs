import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  applyResumeSelectionToRawDocument,
  clampResumeSelectionToRawDocument,
  normalizeResumePresetSelection,
} from "../app/lib/preset-selection.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

// Selection built against a default-locale document with more entries than the
// second language document — the shape that broke public language switching.
const baseSelection = normalizeResumePresetSelection({
  summary: [1],
  experience: [0, 2],
  education: [0],
  courses: [],
  skills: [0, 1, 2],
  interests: [],
  languages: [0],
  tech_stack: [0, 1],
});

const secondLocaleDocument = {
  name: "Test Person",
  summary: [{ position: "Only summary", description: "PL", default: true }],
  experience: [{ role: "Included", company: "PL Corp" }],
  education: [],
  courses: [],
  skills: [{ name: "PL Skill", level: 3 }],
  interests: [],
  languages: [{ name: "Polski", level: "native" }],
  tech_stack: ["PL Tech"],
};

test("clamp drops out-of-range indexes and falls back to the document's default summary", () => {
  const clamped = clampResumeSelectionToRawDocument(secondLocaleDocument, baseSelection);
  assert.ok(clamped, "selection must clamp to a shorter locale document");
  assert.deepEqual(clamped.summary, [0]);
  assert.deepEqual(clamped.experience, [0]);
  assert.deepEqual(clamped.education, []);
  assert.deepEqual(clamped.skills, [0]);
  assert.deepEqual(clamped.languages, [0]);
  assert.deepEqual(clamped.tech_stack, [0]);

  const applied = applyResumeSelectionToRawDocument(secondLocaleDocument, clamped);
  assert.ok(applied, "clamped selection must always apply to the document it was clamped against");
  assert.equal(applied.summary.length, 1);
});

test("clamp never adds entries the base selection excluded", () => {
  const document = {
    ...secondLocaleDocument,
    experience: [
      { role: "First", company: "A" },
      { role: "Second", company: "B" },
      { role: "Third", company: "C" },
    ],
  };
  const clamped = clampResumeSelectionToRawDocument(document, baseSelection);
  assert.ok(clamped);
  assert.deepEqual(clamped.experience, [0, 2], "in-range indexes pass through unchanged");
  for (const key of Object.keys(baseSelection)) {
    if (key === "summary") continue;
    assert.ok(
      clamped[key].every((index) => baseSelection[key].includes(index)),
      `${key} must stay a subset of the base selection`,
    );
  }
});

test("clamp keeps an in-range summary choice instead of overriding it", () => {
  const document = {
    ...secondLocaleDocument,
    summary: [
      { position: "First", default: true },
      { position: "Second" },
    ],
  };
  const clamped = clampResumeSelectionToRawDocument(document, baseSelection);
  assert.ok(clamped);
  assert.deepEqual(clamped.summary, [1], "summary index 1 exists, so the user's choice is preserved");
});

test("clamp returns null for documents that cannot satisfy the one-summary invariant", () => {
  assert.equal(clampResumeSelectionToRawDocument(null, baseSelection), null);
  assert.equal(clampResumeSelectionToRawDocument([], baseSelection), null);
  assert.equal(clampResumeSelectionToRawDocument({ ...secondLocaleDocument, summary: [] }, baseSelection), null);
});

test("publish materializes a clamped per-locale variant before the snapshot RPC", () => {
  const server = read("app/lib/resume-server.ts");
  const publishBody = server.slice(server.indexOf("export async function publishResumePreset"));

  assert.equal(publishBody.includes("clampResumeSelectionToRawDocument"), true);
  assert.equal(publishBody.includes("upsertResumePresetVariant(accessToken, userId, existingPreset, localeDocument, effectiveSelection)"), true);
  assert.equal(
    publishBody.indexOf("upsertResumePresetVariant") < publishBody.indexOf("publish_resume_saved_version"),
    true,
    "variants must be materialized before the snapshot RPC copies their selections",
  );
});
