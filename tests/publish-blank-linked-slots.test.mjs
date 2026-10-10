import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

import yaml from "js-yaml";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { clampResumeSelectionToRawDocument, omitBlankLinkedTranslationSlots } = await import("../app/lib/preset-selection.ts");
const { buildPublishedExportContent } = await import("../app/lib/published-export.ts");
const { buildLanguageTemplate: buildResumeLanguageTemplate } = await import("../app/lib/resume-language-parity.ts");

// A language added as a template starts with a blank slot for every default
// entry (ADR 0024: "omitted by rendering"). Publishing that language with the
// version's selection must not keep indexes of blank slots: the public resolver
// would then drop them, see a count mismatch and 404 the whole language.
const english = ({
  first_name: "Jan", family_name: "Kowalski", brand_initials: "JK", gdpr_clause: "",
  summary: [{ position: "Engineer", description: "Builds", default: true }, { position: "Lead", description: "Leads", default: false }],
  contact: [{ label: "E-mail", value: "jan@example.com" }], qr_codes: [],
  skills: [{ name: "Writing", level: 4 }, { name: "Testing", level: 3 }],
  languages: [{ name: "Polish", level_text: "Native", level: 5 }],
  tech_stack: ["TypeScript", "React"], interests: ["Music", "Chess"],
  experience: [{ period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["A"] }, { period: "2018 - 2019", company: "Beta", role: "Dev", highlights: ["B"] }],
  education: [{ period: "2010", school: "Uni", degree: "MA", detail: "" }],
  courses: [{ year: 2024, name: "Course" }],
});
const everything = { summary: [0], experience: [0, 1], education: [0], courses: [0], skills: [0, 1], interests: [0, 1], languages: [0], tech_stack: [0, 1] };

function partlyTranslatedPolish() {
  const polish = buildResumeLanguageTemplate(english);
  polish.summary[0] = { ...polish.summary[0], position: "Inżynier", description: "Buduje" };
  polish.experience[0] = { ...polish.experience[0], role: "Inżynier", highlights: ["A-pl"] };
  polish.tech_stack = ["TypeScript", ""];
  return polish;
}

test("a partly translated language publishes its translated entries instead of 404ing", () => {
  const polish = partlyTranslatedPolish();
  const selection = clampResumeSelectionToRawDocument(polish, everything, { translation: true });

  assert.deepEqual(selection.tech_stack, [0], "a blank text-list slot is not selected");
  assert.deepEqual(selection.skills, [], "untranslated skills are not selected");
  assert.deepEqual(selection.interests, []);
  assert.deepEqual(selection.experience, [0], "an untranslated role is not included solely because company and period remain");
  assert.deepEqual(selection.education, [], "an untranslated degree is not included solely because school and period remain");
  assert.deepEqual(selection.courses, [], "an untranslated course is not included solely because year remains");
  const published = buildPublishedExportContent(yaml.dump(polish), selection, { translation: true });
  assert.ok(published, "the public resolver can apply the stored selection");
  assert.deepEqual(published.resume.experience.map(({ company }) => company), ["Acme"]);
  assert.deepEqual(published.resume.education, []);
  assert.deepEqual(published.resume.courses, []);
  assert.equal(published.resume.experience[0].role, "Inżynier");
  assert.doesNotMatch(published.yamlContent, /entry_id|__ocv/, "older snapshots may still carry IDs; they stay out of public exports");
});

test("a blank selected summary never falls back to an unselected translated one", () => {
  const polish = partlyTranslatedPolish();
  polish.summary[0] = { ...polish.summary[0], position: "", description: "" };
  polish.summary[1] = { ...polish.summary[1], position: "Lider", description: "Prowadzi" };
  const selection = clampResumeSelectionToRawDocument(polish, everything);
  assert.equal(selection, null);
  assert.equal(buildPublishedExportContent(yaml.dump(polish), everything), null, "an old snapshot with a blank selected summary is also rejected");

  const untranslated = buildResumeLanguageTemplate(english);
  assert.equal(clampResumeSelectionToRawDocument(untranslated, everything), null, "fail-closed: publishing reports the language instead of a 404 later");
});

test("a fully translated document keeps its whole selection", () => {
  const selection = clampResumeSelectionToRawDocument(english, everything);
  assert.deepEqual(selection, everything);
  assert.ok(buildPublishedExportContent(yaml.dump(english), selection));
});

test("an older translated snapshot omits blank linked slots without discarding the locale", () => {
  const polish = partlyTranslatedPolish();
  const published = buildPublishedExportContent(yaml.dump(polish), everything, { translation: true });
  assert.ok(published);
  assert.deepEqual(published.resume.experience.map(({ company }) => company), ["Acme"]);
  assert.deepEqual(published.resume.education, []);
  assert.deepEqual(published.resume.courses, []);
  assert.doesNotMatch(published.yamlContent, /company: Beta|school: Uni|year: 2024/);

  const base = buildPublishedExportContent(yaml.dump(english), everything);
  assert.ok(base);
  assert.equal(base.resume.experience.length, 2, "the canonical document keeps its selected entries");
});

test("sparse source entries keep their rendering, while a translation omits an entry with neutral fields only", () => {
  const source = { ...english, experience: [{ ...english.experience[0], role: "", highlights: [] }] };
  const selected = { ...everything, experience: [0] };
  const sourceExport = buildPublishedExportContent(yaml.dump(source), selected);
  assert.ok(sourceExport);
  assert.deepEqual(sourceExport.resume.experience.map(({ company }) => company), ["Acme"]);

  const translation = { ...source, experience: [{ period: "2020", company: "Legacy", role: "", highlights: [] }] };
  const translationExport = buildPublishedExportContent(yaml.dump(translation), selected, { translation: true });
  assert.ok(translationExport);
  assert.deepEqual(translationExport.resume.experience.map(({ company }) => company), [], "a translation row with neutral fields only is a blank slot");
});

test("the editor preview can hide untranslated linked slots without removing editable source rows", () => {
  const polish = partlyTranslatedPolish();
  const visible = omitBlankLinkedTranslationSlots(polish);
  assert.equal(polish.experience.length, 2, "source rows remain available in the editor");
  assert.deepEqual(visible.experience.map(({ company }) => company), ["Acme"]);
  assert.deepEqual(visible.education, []);
  assert.deepEqual(visible.courses, []);
  assert.deepEqual(visible.skills, []);
  assert.deepEqual(visible.tech_stack, ["TypeScript"]);

  polish.summary[0].position = "";
  polish.summary[0].description = "";
  assert.deepEqual(omitBlankLinkedTranslationSlots(polish).summary, [], "a blank summary must not leave an empty section in the editor preview");
});

test("the public page and exports both omit blank linked translation slots", async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://stub.supabase.local";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "stub-anon-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "stub-service-role-key";
  const { fetchPublishedResumePresetByPublicLink, fetchPublishedResumeExportByPublicLink } = await import("../app/lib/resume-server.ts");
  const link = {
    id: "link-1", document_id: "doc-en", user_id: "user-1", preset_id: "preset-1", slug: null,
    person_slug: "test-person", public_id: "abc123", active_published_cv_id: "cv-1", default_locale: "en",
    available_locales: ["en", "pl"], is_active: true, status: "active", allow_indexing: false, revoked_at: null,
  };
  const snapshot = {
    id: "cv-1", user_id: "user-1", preset_id: "preset-1", source_document_id: "doc-en", title: "Test CV",
    schema_version: 1, open_cv_yaml_contract_version: "1", default_locale: "en", available_locales: ["en", "pl"],
    selection: everything, snapshot_metadata: {},
  };
  const locales = [
    { id: "loc-en", published_cv_id: "cv-1", user_id: "user-1", locale: "en", source_document_id: "doc-en", yaml_content: yaml.dump(english), selection: everything, schema_version: 1 },
    { id: "loc-pl", published_cv_id: "cv-1", user_id: "user-1", locale: "pl", source_document_id: "doc-pl", yaml_content: yaml.dump(partlyTranslatedPolish()), selection: everything, schema_version: 1 },
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = String(input);
    const rows = url.includes("/rest/v1/resume_public_links") ? [link]
      : url.includes("/rest/v1/resume_published_cv_locales") ? locales
        : url.includes("/rest/v1/resume_published_cvs") ? [snapshot] : [];
    return new Response(JSON.stringify(rows), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const page = await fetchPublishedResumePresetByPublicLink("test-person", "abc123", "pl");
  const exported = await fetchPublishedResumeExportByPublicLink("test-person", "abc123", "pl");
  assert.ok(page && exported);
  assert.equal(page.published.document.locale, "pl");
  assert.deepEqual(page.published.resume.experience.map(({ company }) => company), ["Acme"]);
  assert.deepEqual(exported.resume.experience.map(({ company }) => company), ["Acme"]);
  assert.deepEqual(exported.resume.education, []);
  assert.deepEqual(exported.resume.courses, []);
  assert.doesNotMatch(exported.yamlContent, /company: Beta|school: Uni|year: 2024/);

  link.default_locale = "pl";
  snapshot.default_locale = "pl";
  const changedDefaultPage = await fetchPublishedResumePresetByPublicLink("test-person", "abc123");
  const changedDefaultExport = await fetchPublishedResumeExportByPublicLink("test-person", "abc123");
  assert.ok(changedDefaultPage && changedDefaultExport);
  assert.equal(changedDefaultPage.published.document.locale, "pl");
  assert.deepEqual(changedDefaultPage.published.resume.experience.map(({ company }) => company), ["Acme"]);
  assert.deepEqual(changedDefaultExport.resume.experience.map(({ company }) => company), ["Acme"]);
});
