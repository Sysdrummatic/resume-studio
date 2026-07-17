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

test("a plain-text summary counts as the single default summary in clamp and apply", () => {
  const legacyDocument = {
    ...secondLocaleDocument,
    summary: "Soy una Product Scientist creativa.",
  };

  const clamped = clampResumeSelectionToRawDocument(legacyDocument, baseSelection);
  assert.ok(clamped, "legacy string-summary documents must stay publishable");
  assert.deepEqual(clamped.summary, [0]);

  const applied = applyResumeSelectionToRawDocument(legacyDocument, clamped);
  assert.ok(applied, "clamped selection must apply to a string-summary document");
  assert.equal(applied.summary, legacyDocument.summary, "plain-text summary passes through verbatim");

  assert.equal(
    applyResumeSelectionToRawDocument(legacyDocument, { ...clamped, summary: [1] }),
    null,
    "a string summary is a virtual one-element array, so index 1 is out of range",
  );
  assert.equal(
    clampResumeSelectionToRawDocument({ ...legacyDocument, summary: "   " }, baseSelection),
    null,
    "a blank summary cannot satisfy the one-summary invariant",
  );
});

test("publish materializes a clamped per-locale variant before the snapshot RPC", () => {
  const server = read("app/lib/resume-server.ts");
  const publishBody = server.slice(server.indexOf("export async function publishResumePreset"));

  assert.equal(publishBody.includes("clampResumeSelectionToRawDocument"), true);
  assert.equal(publishBody.includes("upsertResumePresetVariant(accessToken, userId, existingPreset, localeDocument!, effectiveSelection)"), true);
  assert.equal(
    publishBody.indexOf("upsertResumePresetVariant") < publishBody.indexOf("publish_resume_saved_version"),
    true,
    "variants must be materialized before the snapshot RPC copies their selections",
  );
});

test("publish fails closed when any explicitly selected locale cannot render", () => {
  const server = read("app/lib/resume-server.ts");
  const publishBody = server.slice(server.indexOf("export async function publishResumePreset"));

  assert.equal(publishBody.includes("input_selected_locales: explicitLocales"), true);
  assert.equal(publishBody.includes("skipping locale"), false);
  assert.equal(
    publishBody.includes("selection cannot be applied to ${locale} document"),
    true,
    "every explicitly selected locale must either publish or abort with an actionable error",
  );
});

test("preset delete revokes an active public link first and the snapshot trigger allows source detach", () => {
  const server = read("app/lib/resume-server.ts");
  const deleteBody = server.slice(
    server.indexOf("export async function deleteResumePreset"),
    server.indexOf("export async function ensureResumeDocument"),
  );
  assert.equal(deleteBody.includes("unpublishResumePreset(accessToken, userId, presetId)"), true);
  assert.equal(
    deleteBody.indexOf("unpublishResumePreset") < deleteBody.indexOf("deleteTable"),
    true,
    "the active link must be revoked before the preset row is deleted",
  );

  const migration = read("supabase/migrations/20260717000000_allow_snapshot_source_detach.sql");
  assert.equal(migration.includes("create or replace function public.prevent_published_cv_mutation()"), true);
  for (const column of ["preset_id", "source_variant_id", "source_document_id", "source_revision_id", "created_by"]) {
    assert.equal(migration.includes(`'${column}'`), true, `${column} must be detachable on snapshot rows`);
  }
  assert.equal(
    migration.includes("Published CV snapshots are immutable"),
    true,
    "any other snapshot mutation must still be rejected",
  );
});
