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

test("selected records that normalization would drop are rejected instead of exported inconsistently", () => {
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

  assert.equal(
    buildPublishedExportContent("summary:\n  - bad\n", { ...emptySelection, summary: [0] }),
    null,
    "a selected non-object summary item must be rejected",
  );
  assert.equal(
    buildPublishedExportContent(
      "summary:\n  - position: A\n    description: text\nexperience:\n  - {}\n",
      { ...emptySelection, summary: [0], experience: [0] },
    ),
    null,
    "a selected empty experience record must be rejected",
  );
  assert.equal(
    buildPublishedResumeDocument("summary:\n  - bad\n", { ...emptySelection, summary: [0] }),
    null,
    "the public view path must reject dropped selected records the same way",
  );
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

test("fetchPublishedResumeExportByPublicLink applies the snapshot selection end-to-end (stubbed Supabase)", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://stub.supabase.local";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stub-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "stub-service-role-key";
  const { fetchPublishedResumeExportByPublicLink } = await import("../app/lib/resume-server.ts");

  const linkRow = {
    id: "link-1",
    document_id: "doc-1",
    user_id: "user-1",
    preset_id: "preset-1",
    slug: null,
    person_slug: "test-person",
    public_id: "abc123",
    active_published_cv_id: "cv-1",
    default_locale: "en",
    available_locales: ["en"],
    is_active: true,
    status: "active",
    allow_indexing: false,
    published_at: "2026-07-01T00:00:00Z",
    revoked_at: null,
    legacy_slug: null,
    updated_at: "2026-07-01T00:00:00Z",
  };
  const snapshotRow = {
    id: "cv-1",
    user_id: "user-1",
    preset_id: "preset-1",
    source_document_id: "doc-1",
    title: "Test CV",
    schema_version: 1,
    open_cv_yaml_contract_version: "1",
    default_locale: "en",
    published_locales: ["en"],
    available_locales: ["en"],
    selection: null,
    allow_indexing: false,
    published_at: "2026-07-01T00:00:00Z",
    created_by: null,
    created_at: "2026-07-01T00:00:00Z",
    snapshot_metadata: {},
  };
  const localeRow = {
    id: "loc-1",
    published_cv_id: "cv-1",
    user_id: "user-1",
    locale: "en",
    source_document_id: "doc-1",
    source_revision_id: null,
    source_variant_id: null,
    title: "Test CV",
    yaml_content: masterYamlWithInvalidRecords,
    schema_version: 1,
    selection: {
      summary: [0],
      experience: [2],
      education: [],
      courses: [],
      skills: [],
      interests: [],
      languages: [],
      tech_stack: [],
    },
    labels: {},
    render_data: null,
    ai_generated: false,
    created_at: "2026-07-01T00:00:00Z",
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const json = (rows) => new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.includes("/rest/v1/resume_public_links")) return json([linkRow]);
    if (url.includes("/rest/v1/resume_published_cv_locales")) return json([localeRow]);
    if (url.includes("/rest/v1/resume_published_cvs")) return json([snapshotRow]);
    return json([]);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const exportData = await fetchPublishedResumeExportByPublicLink("test-person", "abc123");
  assert.ok(exportData, "resolver must resolve the stubbed snapshot");
  assert.equal(exportData.personSlug, "test-person");
  assert.equal(exportData.locale, "en");
  assert.equal(exportData.canonicalPath, "/test-person/abc123");
  assert.equal(exportData.yamlContent.includes("PUBLIC-CORP"), true);
  assert.equal(exportData.yamlContent.includes("PRIVATE-CORP"), false, "resolver must never return unselected master content");
  assert.equal(exportData.resume.experience.length, 1);
  assert.equal(exportData.resume.experience[0].company, "PUBLIC-CORP");

  localeRow.selection = { ...localeRow.selection, experience: [9] };
  assert.equal(
    await fetchPublishedResumeExportByPublicLink("test-person", "abc123"),
    null,
    "resolver must return null (404) when the snapshot selection cannot be applied",
  );
});

test("public link hides invalid locales but preserves selectable legacy locales", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://stub.supabase.local";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stub-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "stub-service-role-key";
  const { fetchPublishedResumeExportByPublicLink, fetchPublishedResumePresetByPublicLink } =
    await import("../app/lib/resume-server.ts");

  const linkRow = {
    id: "link-multilingual", document_id: "doc-en", user_id: "user-1", preset_id: "preset-1", slug: null,
    person_slug: "test-person", public_id: "multilingual", active_published_cv_id: "cv-multilingual",
    default_locale: "en", available_locales: ["en", "es", "pl"], is_active: true, status: "active",
    allow_indexing: false, published_at: "2026-07-01T00:00:00Z", revoked_at: null, legacy_slug: null,
    updated_at: "2026-07-01T00:00:00Z",
  };
  const snapshotRow = {
    id: "cv-multilingual", user_id: "user-1", preset_id: "preset-1", source_document_id: "doc-en",
    title: "Test CV", schema_version: 1, open_cv_yaml_contract_version: "1", default_locale: "en",
    published_locales: ["en", "es", "pl"], available_locales: ["en", "es", "pl"], selection: null,
    allow_indexing: false, published_at: "2026-07-01T00:00:00Z", created_by: null,
    created_at: "2026-07-01T00:00:00Z", snapshot_metadata: {},
  };
  const selection = {
    summary: [0], experience: [2], education: [], courses: [], skills: [], interests: [], languages: [], tech_stack: [],
  };
  const localeRows = [
    {
      id: "loc-en", published_cv_id: "cv-multilingual", user_id: "user-1", locale: "en",
      source_document_id: "doc-en", source_revision_id: null, source_variant_id: null, title: "English CV",
      yaml_content: masterYamlWithInvalidRecords, schema_version: 1, selection, labels: {}, render_data: null,
      ai_generated: false, created_at: "2026-07-01T00:00:00Z",
    },
    {
      id: "loc-es", published_cv_id: "cv-multilingual", user_id: "user-1", locale: "es",
      source_document_id: "doc-es", source_revision_id: null, source_variant_id: null, title: "Spanish CV",
      yaml_content: "name: Ariana Holt\nsummary: Soy una Product Scientist creativa.\nexperience: []\neducation: []\ncourses: []\nskills: []\ninterests: []\nlanguages: []\ntech_stack: []\n",
      schema_version: 1, selection: { ...selection, experience: [] }, labels: {}, render_data: null,
      ai_generated: false, created_at: "2026-07-01T00:00:00Z",
    },
    {
      id: "loc-pl", published_cv_id: "cv-multilingual", user_id: "user-1", locale: "pl",
      source_document_id: "doc-pl", source_revision_id: null, source_variant_id: null, title: "Polish CV",
      yaml_content: masterYamlWithInvalidRecords, schema_version: 1, selection: { ...selection, summary: [9] },
      labels: {}, render_data: null, ai_generated: false, created_at: "2026-07-01T00:00:00Z",
    },
  ];

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const json = (rows) => new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
    if (url.includes("/rest/v1/resume_public_links")) return json([linkRow]);
    if (url.includes("/rest/v1/resume_published_cv_locales")) return json(localeRows);
    if (url.includes("/rest/v1/resume_published_cvs")) return json([snapshotRow]);
    return json([]);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const publicRoute = await fetchPublishedResumePresetByPublicLink("test-person", "multilingual", "pl");
  assert.ok(publicRoute, "a broken optional locale must not turn a valid public link into a 404");
  assert.equal(publicRoute.published.document.locale, "en");
  assert.deepEqual(publicRoute.published.languages.map(({ code }) => code), ["en", "es"]);
  assert.deepEqual(publicRoute.availableLocales, ["en", "es"]);

  const publicExport = await fetchPublishedResumeExportByPublicLink("test-person", "multilingual", "pl");
  assert.ok(publicExport, "public exports must use the same safe locale fallback as the page");
  assert.equal(publicExport.locale, "en");
  assert.deepEqual(publicExport.availableLocales, ["en", "es"]);

  const spanishRoute = await fetchPublishedResumePresetByPublicLink("test-person", "multilingual", "es");
  assert.ok(spanishRoute, "a valid legacy locale must remain selectable");
  assert.equal(spanishRoute.published.document.locale, "es");
  assert.equal(spanishRoute.published.resume.summary[0].description, "Soy una Product Scientist creativa.");

  linkRow.default_locale = "pl";
  snapshotRow.default_locale = "pl";
  const canonicalRoute = await fetchPublishedResumePresetByPublicLink("test-person", "multilingual");
  assert.ok(canonicalRoute, "an invalid stored default must fall back to a renderable locale");
  assert.equal(canonicalRoute.defaultLocale, "en");
  assert.equal(canonicalRoute.published.document.locale, "en");
});

test("published content treats a legacy plain-text summary as one selected record", () => {
  const legacyYaml = `
name: Ariana Holt
summary: Soy una Product Scientist creativa.
experience: []
education: []
courses: []
skills: []
interests: []
languages: []
tech_stack: []
`;
  const selection = normalizeResumePresetSelection({ summary: [0] });

  const resume = buildPublishedResumeDocument(legacyYaml, selection);
  const exported = buildPublishedExportContent(legacyYaml, selection);

  assert.ok(resume, "legacy text summary must remain renderable on the public route");
  assert.equal(resume.summary.length, 1);
  assert.equal(resume.summary[0].description, "Soy una Product Scientist creativa.");
  assert.ok(exported, "public exports must accept the same legacy summary shape");
});

test("variant import surfaces failed database writes instead of reporting success", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://stub.supabase.local";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stub-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "stub-service-role-key";
  const { importResumePresetVariant } = await import("../app/lib/resume-server.ts");
  const selection = {
    summary: [0], experience: [], education: [], courses: [], skills: [], interests: [], languages: [], tech_stack: [],
  };
  const preset = {
    id: "preset-1", document_id: "doc-en", user_id: "user-1", title: "Test preset", selection,
    is_public: false, allow_indexing: false, ai_generated: false, default_locale: "en", slug: null,
    published_at: null, created_at: "2026-07-01T00:00:00Z", updated_at: "2026-07-01T00:00:00Z",
  };
  const document = {
    id: "doc-pl", user_id: "user-1", locale: "pl", title: "Polish resume",
    yaml_content: "name: Test Person\nsummary:\n  - position: Test\n    description: Test\n", schema_version: 1,
    is_public: false, allow_indexing: false, ai_generated: false, updated_at: "2026-07-01T00:00:00Z",
  };
  const originalFetch = globalThis.fetch;
  let hasExistingVariant = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (url.includes("/rest/v1/resume_documents")) return json([document]);
    if (url.includes("/rest/v1/resume_preset_variants") && init?.method === "POST") {
      return json({ message: "variant rejected" }, 403);
    }
    if (url.includes("/rest/v1/resume_preset_variants") && init?.method === "PATCH") {
      return json({ message: "variant update rejected" }, 409);
    }
    if (url.includes("/rest/v1/resume_preset_variants")) {
      return json(hasExistingVariant ? [{ id: "variant-pl", locale: "pl", selection, is_default: false }] : []);
    }
    return json([]);
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    importResumePresetVariant("access-token", "user-1", preset, "pl", selection),
    /\[presetVariant:locale=pl:operation=insert\].*variant rejected/,
  );

  hasExistingVariant = true;
  await assert.rejects(
    importResumePresetVariant("access-token", "user-1", preset, "pl", selection),
    /\[presetVariant:locale=pl:operation=update\].*variant update rejected/,
  );
});

test("public view and dashboard preview apply the selection on the raw document before normalization", () => {
  const server = read("app/lib/resume-server.ts");
  const dashboard = read("app/dashboard/dashboard-client.tsx");

  assert.equal(server.includes("buildPublishedResumeDocument(yamlContent, selection)"), true);
  assert.equal(dashboard.includes("const rawDocument = window.jsyaml.load(yamlContent)"), true);
  assert.equal(dashboard.includes("applyResumeSelectionToRawDocument(rawDocument"), true);
  assert.equal(
    dashboard.includes("clampResumeSelectionToRawDocument(rawDocument, selection)"),
    true,
    "dashboard preview must clamp the base selection to the previewed locale document",
  );
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
