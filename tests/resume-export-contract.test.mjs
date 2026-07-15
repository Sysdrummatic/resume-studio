import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { normalizeResumeDocument } from "../app/lib/resume-schema.ts";
import { applyResumePresetSelection, normalizeResumePresetSelection } from "../app/lib/preset-selection.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const masterYamlWithExcludedItems = `
name: Test Person
brand_initials: TP
summary:
  - position: Frontend Engineer
    description: Included summary text
    default: true
  - position: EXCLUDED-SUMMARY-POSITION
    description: EXCLUDED-SUMMARY-TEXT
contact: []
qr_codes: []
skills:
  - name: Included Skill
    level: 4
  - name: EXCLUDED-SKILL
    level: 5
tech_stack:
  - Included Tech
  - EXCLUDED-TECH
languages: []
interests:
  - EXCLUDED-INTEREST
experience:
  - period: 2020 - 2024
    company: Included Corp
    role: Engineer
    highlights:
      - Included highlight
  - period: 2015 - 2020
    company: EXCLUDED-CORP
    role: EXCLUDED-ROLE
    highlights:
      - EXCLUDED-HIGHLIGHT
education: []
courses:
  - year: 2021
    name: Included Course
`;

const selectionExcludingItems = {
  summary: [0],
  experience: [0],
  education: [],
  courses: [0],
  skills: [0],
  interests: [],
  languages: [],
  tech_stack: [0],
};

test("published export pipeline applies the saved-version selection to exported yaml", () => {
  const masterDocument = normalizeResumeDocument(yaml.load(masterYamlWithExcludedItems), "");
  const selected = applyResumePresetSelection(masterDocument, normalizeResumePresetSelection(selectionExcludingItems));
  const exported = yaml.dump(selected);

  assert.ok(exported, "export yaml must be produced for a valid snapshot");
  assert.equal(exported.includes("Included Corp"), true);
  assert.equal(exported.includes("Included Skill"), true);
  assert.equal(exported.includes("Included Tech"), true);
  assert.equal(exported.includes("Included summary text"), true);
  for (const leaked of [
    "EXCLUDED-SUMMARY-POSITION",
    "EXCLUDED-SUMMARY-TEXT",
    "EXCLUDED-SKILL",
    "EXCLUDED-TECH",
    "EXCLUDED-INTEREST",
    "EXCLUDED-CORP",
    "EXCLUDED-ROLE",
    "EXCLUDED-HIGHLIGHT",
  ]) {
    assert.equal(exported.includes(leaked), false, `${leaked} must not leak into the export`);
  }
});

test("published export resolver applies the snapshot selection instead of returning raw master yaml", () => {
  const server = read("app/lib/resume-server.ts");

  assert.equal(server.includes("yamlContent: activeLocaleRow.yaml_content"), false);
  assert.equal(server.includes("export function buildPublishedExportYamlContent"), true);
  const resolver = server.slice(
    server.indexOf("export async function fetchPublishedResumeExportByPublicLink"),
    server.indexOf("export async function fetchResumeExportByPresetId"),
  );
  assert.equal(resolver.includes("buildPublishedExportYamlContent"), true);
  assert.equal(resolver.includes("return null"), true);
});

test("text export route is snapshot-only and rejects preset fallback", () => {
  const route = read("app/api/resume/export/text/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("fetchResumeExportByPresetId"), false);
  assert.equal(route.includes("personSlug and publicId are required"), true);
  assert.equal(route.includes("presetId"), false);
});

test("pdf export route is snapshot-only and returns application/pdf", () => {
  const route = read("app/api/resume/export/pdf/route.ts");
  const previewRoute = read("app/api/resume/export/pdf/preview/route.ts");
  const pdfDocument = read("app/lib/pdf/CvPdfDocument.tsx");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("\"Content-Type\": \"application/pdf\""), true);
  assert.equal(route.includes("personSlug and publicId are required"), true);
  assert.equal(route.includes("renderToBuffer"), true);
  assert.equal(route.includes("locale: exportData.locale"), true);
  assert.equal(previewRoute.includes('requireRequestActor(["admin"])'), true);
  assert.equal(pdfDocument.includes("from \"@react-pdf/renderer\""), true);
  assert.equal(pdfDocument.includes("buildResumeRendererLabels"), true);
  assert.equal(pdfDocument.includes("getResumeHeroRole"), true);
});


test("PdfTheme interface defines required color, typography, spacing, and layout tokens", () => {
  const theme = read("app/lib/pdf/theme.ts");
  assert.equal(theme.includes("PdfTheme"), true);
  assert.equal(theme.includes("cvBasicDotTheme"), true);
  assert.equal(theme.includes("accent"), true);
  assert.equal(theme.includes("SpaceGrotesk"), true);
  assert.equal(theme.includes("mainColumnFlex"), true);
});

test("PdfEngine interface provides render method abstraction", () => {
  const engine = read("app/lib/pdf/engine.ts");
  assert.equal(engine.includes("PdfEngine"), true);
  assert.equal(engine.includes("render"), true);
  assert.equal(engine.includes("PdfRenderOptions"), true);
});

test("react-pdf engine registers Space Grotesk for normal and bold weights", () => {
  const engine = read("app/lib/pdf/engine-react-pdf.ts");
  assert.equal(engine.includes("Font.register"), true);
  assert.equal(engine.includes("SpaceGrotesk"), true);
  assert.equal(engine.includes("public/fonts"), true);
  assert.equal(engine.includes("400"), true);
  assert.equal(engine.includes("700"), true);
});

test("buildPdfFilename produces opencivera naming convention", () => {
  const filename = read("app/lib/pdf/filename.ts");
  assert.equal(filename.includes("buildPdfFilename"), true);
  assert.equal(filename.includes("opencivera"), true);
});

test("pdf export route uses buildPdfFilename for Content-Disposition", () => {
  const route = read("app/api/resume/export/pdf/route.ts");
  assert.equal(route.includes("buildPdfFilename"), true);
});

test("pdf preview route uses buildPdfFilename and respects the draft pdf feature flag", () => {
  const previewRoute = read("app/api/resume/export/pdf/preview/route.ts");
  assert.equal(previewRoute.includes("buildPdfFilename"), true);
  assert.equal(previewRoute.includes("isPdfDraftEnabled"), true);
});

test("experience section keeps each employer block unsplit across pages", () => {
  const experience = read("app/lib/pdf/sections/PdfExperience.tsx");
  const primitives = read("app/lib/pdf/primitives.tsx");
  assert.equal(experience.includes("PdfTimelineItem"), true);
  assert.equal(primitives.includes("wrap={false}"), true);
});

test("pdf theme carries timeline and course background tokens from resume.css", () => {
  const theme = read("app/lib/pdf/theme.ts");
  assert.equal(theme.includes("timelineItemBg"), true);
  assert.equal(theme.includes("courseItemBg"), true);
  assert.equal(theme.includes("accentDark"), true);
  assert.equal(theme.includes("#f0f7f6"), true);
});

test("platform_feature_flags migration defines pdf_draft_enabled key", () => {
  const migrations = fs.readdirSync(path.join(process.cwd(), "supabase/migrations"));
  const flagsMigration = migrations.find((f) => f.includes("pdf_feature_flags"));
  assert.ok(flagsMigration, "pdf_feature_flags migration file must exist");
  const sql = read(`supabase/migrations/${flagsMigration}`);
  assert.equal(sql.includes("platform_feature_flags"), true);
  assert.equal(sql.includes("pdf_draft_enabled"), true);
});

test("isPdfDraftEnabled is exported from pdf-feature-flags", () => {
  const flags = read("app/lib/pdf-feature-flags.ts");
  assert.equal(flags.includes("isPdfDraftEnabled"), true);
});

test("BasicResumeDocument gates draft pdf behind the DB-driven flag", () => {
  const basicResume = read("app/components/resume-renderer/BasicResumeDocument.tsx");
  assert.equal(basicResume.includes("draftPdfEnabled"), true);
  assert.equal(basicResume.includes("allowDraftPdf"), false);
});

test("public export helper keeps canonical person slug and public id parsing local to the snapshot path", () => {
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("export function parseCanonicalPublicPath"), true);
  assert.equal(exportLib.includes("export function buildPublishedResumeExportUrls"), true);
  assert.equal(exportLib.includes("publicId"), true);
  assert.equal(exportLib.includes("personSlug"), true);
});

test("export helper exposes ats yaml and cvac urls", () => {
  const exportLib = read("app/lib/resume-export.ts");

  assert.equal(exportLib.includes("export function convertResumeToAtsYaml"), true);
  assert.equal(exportLib.includes("yamlUrl:"), true);
  assert.equal(exportLib.includes("cvacUrl:"), true);
  assert.equal(exportLib.includes("/api/resume/export/yaml"), true);
  assert.equal(exportLib.includes("/api/resume/export/cvac"), true);
});

test("plain text export drops non-ats decorations and sources section labels from ats-export-rules", () => {
  const exportLib = read("app/lib/resume-export.ts");
  const rules = read("app/lib/ats-export-rules.ts");

  assert.equal(exportLib.includes("--- "), false);
  assert.equal(exportLib.includes("/5)"), false);
  assert.equal(exportLib.includes("ATS_SECTION_HEADERS"), true);
  assert.equal(exportLib.includes('from "./ats-export-rules"'), true);
  assert.equal(rules.includes('experience: "WORK EXPERIENCE"'), true);
  assert.equal(rules.includes('certifications: "CERTIFICATIONS"'), true);
  assert.equal(/lines\.push\(`\(\$\{doc\.brand_initials\}\)`\)/.test(exportLib), false);
});

test("ats yaml export route is snapshot-only, rate limited, and returns text/yaml", () => {
  const route = read("app/api/resume/export/yaml/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("convertResumeToAtsYaml"), true);
  assert.equal(route.includes("rateLimit"), true);
  assert.equal(route.includes("\"Content-Type\": \"text/yaml; charset=utf-8\""), true);
  assert.equal(route.includes("personSlug and publicId are required"), true);
});

test("cvac export route returns raw published yaml untransformed and is rate limited", () => {
  const route = read("app/api/resume/export/cvac/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("exportData.yamlContent"), true);
  assert.equal(route.includes("normalizeResumeDocument"), false);
  assert.equal(route.includes("rateLimit"), true);
  assert.equal(route.includes("\"Content-Type\": \"text/yaml; charset=utf-8\""), true);
});
