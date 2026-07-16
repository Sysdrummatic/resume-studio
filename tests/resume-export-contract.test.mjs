import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";
import { register } from "node:module";

import { normalizeResumePresetSelection } from "../app/lib/preset-selection.ts";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { buildPublishedExportContent, buildPublishedResumeDocument } = await import("../app/lib/published-export.ts");

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

test("buildPublishedExportContent applies the saved-version selection to exported yaml and resume", () => {
  const exportContent = buildPublishedExportContent(masterYamlWithExcludedItems, selectionExcludingItems);

  assert.ok(exportContent, "export content must be produced for a valid snapshot");
  const exported = exportContent.yamlContent;
  const resumeJson = JSON.stringify(exportContent.resume);
  assert.equal(exported.includes("Included Corp"), true);
  assert.equal(exported.includes("Included Skill"), true);
  assert.equal(exported.includes("Included Tech"), true);
  assert.equal(exported.includes("Included summary text"), true);
  assert.equal(resumeJson.includes("Included Corp"), true);
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
    assert.equal(exported.includes(leaked), false, `${leaked} must not leak into the exported yaml`);
    assert.equal(resumeJson.includes(leaked), false, `${leaked} must not leak into the parsed resume`);
  }
});

test("buildPublishedExportContent preserves extension fields the schema does not know", () => {
  const masterYamlWithExtensions = `
name: Test Person
custom_top_level:
  vendor: acme
  note: EXTENSION-TOP-LEVEL
summary:
  - position: Frontend Engineer
    description: Included summary text
    x_summary_tag: EXTENSION-SUMMARY-FIELD
  - position: EXCLUDED-SUMMARY-POSITION
experience:
  - period: 2020 - 2024
    company: Included Corp
    role: Engineer
    location: EXTENSION-NESTED-FIELD
    highlights:
      - Included highlight
  - period: 2015 - 2020
    company: EXCLUDED-CORP
    role: EXCLUDED-ROLE
`;
  const exportContent = buildPublishedExportContent(masterYamlWithExtensions, {
    summary: [0],
    experience: [0],
    education: [],
    courses: [],
    skills: [],
    interests: [],
    languages: [],
    tech_stack: [],
  });

  assert.ok(exportContent, "export content must be produced");
  const exported = exportContent.yamlContent;
  assert.equal(exported.includes("EXTENSION-TOP-LEVEL"), true, "unknown top-level fields must survive the export");
  assert.equal(exported.includes("EXTENSION-SUMMARY-FIELD"), true, "unknown fields on selected summary items must survive");
  assert.equal(exported.includes("EXTENSION-NESTED-FIELD"), true, "unknown fields on selected experience items must survive");
  assert.equal(exported.includes("EXCLUDED-SUMMARY-POSITION"), false);
  assert.equal(exported.includes("EXCLUDED-CORP"), false);

  const roundTripped = yaml.load(exported);
  assert.equal(roundTripped.custom_top_level.note, "EXTENSION-TOP-LEVEL");
  assert.equal(roundTripped.summary.length, 1);
  assert.equal(roundTripped.summary[0].default, true, "first selected summary must be marked default");
  assert.equal(roundTripped.experience.length, 1);
});

test("buildPublishedExportContent returns null for unparseable or non-object snapshots", () => {
  assert.equal(buildPublishedExportContent("summary: [unclosed", {}), null);
  assert.equal(buildPublishedExportContent("- just\n- a\n- list\n", {}), null);
});

const masterYamlWithInvalidRecords = `
name: Test Person
summary:
  - position: Frontend Engineer
    description: Included summary text
experience:
  - {}
  - period: 2010 - 2015
    company: PRIVATE-CORP
    role: PRIVATE-ROLE
  - period: 2016 - 2024
    company: PUBLIC-CORP
    role: PUBLIC-ROLE
`;

test("selection indexes are raw-domain: records dropped by normalization do not shift the selection", () => {
  const selection = {
    summary: [0],
    experience: [2],
    education: [],
    courses: [],
    skills: [],
    interests: [],
    languages: [],
    tech_stack: [],
  };
  const exportContent = buildPublishedExportContent(masterYamlWithInvalidRecords, selection);

  assert.ok(exportContent, "export content must be produced");
  assert.equal(exportContent.yamlContent.includes("PUBLIC-CORP"), true);
  assert.equal(exportContent.yamlContent.includes("PRIVATE-CORP"), false, "raw index 2 must select PUBLIC-CORP, not shift onto PRIVATE-CORP");
  assert.equal(exportContent.resume.experience.length, 1);
  assert.equal(exportContent.resume.experience[0].company, "PUBLIC-CORP");
});

test("public view and export surfaces resolve the same document for the same snapshot and selection", () => {
  const selection = {
    summary: [0],
    experience: [1],
    education: [],
    courses: [],
    skills: [],
    interests: [],
    languages: [],
    tech_stack: [],
  };
  const viewResume = buildPublishedResumeDocument(masterYamlWithInvalidRecords, selection);
  const exportContent = buildPublishedExportContent(masterYamlWithInvalidRecords, selection);

  assert.ok(viewResume && exportContent);
  assert.deepEqual(viewResume, exportContent.resume, "public view and exports must interpret selection indexes identically");
  assert.equal(viewResume.experience[0].company, "PRIVATE-CORP");
});

test("snapshots whose selection cannot be applied faithfully are rejected", () => {
  const emptySelection = {
    summary: [],
    experience: [],
    education: [],
    courses: [],
    skills: [],
    interests: [],
    languages: [],
    tech_stack: [],
  };

  assert.equal(buildPublishedExportContent("{}", emptySelection), null, "empty document must be rejected");
  assert.equal(
    buildPublishedExportContent(masterYamlWithInvalidRecords, { ...emptySelection, summary: [0], experience: [5] }),
    null,
    "out-of-range index must be rejected",
  );
  assert.equal(
    buildPublishedExportContent(masterYamlWithInvalidRecords, emptySelection),
    null,
    "selection without exactly one summary must be rejected",
  );
  assert.equal(
    buildPublishedExportContent("summary:\n  - position: A\nexperience: not-a-list\n", { ...emptySelection, summary: [0], experience: [0] }),
    null,
    "selecting from a wrongly typed section must be rejected",
  );
  assert.equal(buildPublishedResumeDocument("{}", emptySelection), null, "the public view path must reject the same snapshots");
});

test("selection index normalization rejects partially numeric values", () => {
  const selection = normalizeResumePresetSelection({
    experience: ["1junk", "2.9", -1, 1.5, "2", 3],
  });
  assert.deepEqual(selection.experience, [2, 3]);
});

test("published export resolver applies the snapshot selection instead of returning raw master yaml", () => {
  const server = read("app/lib/resume-server.ts");

  assert.equal(server.includes("yamlContent: activeLocaleRow.yaml_content"), false);
  const resolver = server.slice(
    server.indexOf("export async function fetchPublishedResumeExportByPublicLink"),
    server.indexOf("export async function fetchResumeExportByPresetId"),
  );
  assert.equal(resolver.includes("buildPublishedExportContent"), true);
  assert.equal(resolver.includes("return null"), true);
});

test("public view and dashboard preview apply the selection on the raw document before normalization", () => {
  const server = read("app/lib/resume-server.ts");
  const dashboard = read("app/dashboard/dashboard-client.tsx");

  assert.equal(server.includes("buildPublishedResumeDocument(yamlContent, selection)"), true);
  assert.equal(dashboard.includes("applyResumeSelectionToRawDocument(window.jsyaml.load"), true);
  assert.equal(dashboard.includes("selectByIndex(masterDocument"), false, "dashboard preview must not select from the normalized document");
});

test("text export route is snapshot-only, rate limited, and rejects preset fallback", () => {
  const route = read("app/api/resume/export/text/route.ts");

  assert.equal(route.includes("fetchPublishedResumeExportByPublicLink"), true);
  assert.equal(route.includes("fetchResumeExportByPresetId"), false);
  assert.equal(route.includes("personSlug and publicId are required"), true);
  assert.equal(route.includes("presetId"), false);
  assert.equal(route.includes("rateLimit"), true);
});

test("export routes consume the resolver's parsed resume instead of re-parsing yaml", () => {
  for (const routePath of [
    "app/api/resume/export/text/route.ts",
    "app/api/resume/export/yaml/route.ts",
    "app/api/resume/export/pdf/route.ts",
  ]) {
    const route = read(routePath);
    assert.equal(route.includes("exportData.resume"), true, `${routePath} must use exportData.resume`);
    assert.equal(route.includes("normalizeResumeDocument"), false, `${routePath} must not re-normalize the snapshot`);
    assert.equal(route.includes("yaml.load"), false, `${routePath} must not re-parse the snapshot yaml`);
  }
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
