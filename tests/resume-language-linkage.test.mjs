import test from "node:test";
import assert from "node:assert/strict";
import {
  buildResumeLanguageTemplate,
  ensureResumeEntryIds,
  hasCompleteResumeLinkage,
  inspectResumeEntryIdStability,
  inspectResumeLanguagePair,
  reconcileResumeLanguageDocument,
  validateResumeLanguagePair,
} from "../app/lib/resume-language-linkage.ts";

const source = {
  brand_initials: "LM",
  first_name: "Lukasz",
  family_name: "Michta",
  summary: [
    { position: "Technical Writer", description: "Writes docs", default: true },
    { position: "Engineer", description: "Builds tools", default: false },
  ],
  contact: [{ label: "E-mail", value: "lukasz@example.com" }],
  qr_codes: [],
  skills: [{ name: "Writing", level: 5 }],
  tech_stack: ["TypeScript"],
  languages: [{ name: "Polish", level_text: "Native", level: 5 }],
  interests: ["Music"],
  experience: [{ period: "2020 - now", company: "OpenCiVera", role: "Technical Writer", highlights: ["Docs"] }],
  education: [{ period: "2010", school: "University", degree: "MA", detail: "Detail" }],
  courses: [{ year: 2024, name: "Course" }],
  gdpr_clause: "Zgoda",
};

test("new language keeps linked rows and neutral experience fields but clears translations", () => {
  const template = buildResumeLanguageTemplate(source);

  assert.equal(template.experience[0].company, "OpenCiVera");
  assert.equal(template.experience[0].period, "2020 - now");
  assert.equal(template.experience[0].role, "");
  assert.deepEqual(template.experience[0].highlights, []);
  assert.equal(template.summary[0].position, "");
  assert.equal(template.summary[0].default, true);
  assert.equal(template.skills[0].name, "");
  assert.equal(template.tech_stack[0], "");
  assert.equal(template.gdpr_clause, "");
  assert.ok(template.summary[0].entry_id);
  assert.notEqual(template.summary[0].entry_id, template.experience[0].entry_id);
});

test("reconciliation adds missing linked rows, removes extras, and preserves translated content", () => {
  const seeded = buildResumeLanguageTemplate(source);
  seeded.experience[0].role = "Technical Writer";
  seeded.summary[0].position = "Technical Writer";
  const defaultWithNewEntry = ensureResumeEntryIds({
    ...source,
    summary: [...source.summary, { position: "Founder", description: "", default: false }],
    experience: [...source.experience, { period: "2018", company: "Earlier Co", role: "", highlights: [] }],
  });
  const sourceWithIds = ensureResumeEntryIds(source);
  defaultWithNewEntry.summary[0].entry_id = sourceWithIds.summary[0].entry_id;
  defaultWithNewEntry.summary[1].entry_id = sourceWithIds.summary[1].entry_id;
  defaultWithNewEntry.experience[0].entry_id = sourceWithIds.experience[0].entry_id;
  seeded.summary[0].entry_id = sourceWithIds.summary[0].entry_id;
  seeded.experience[0].entry_id = sourceWithIds.experience[0].entry_id;
  const reconciled = reconcileResumeLanguageDocument(defaultWithNewEntry, seeded);

  assert.equal(reconciled.experience.length, 2);
  assert.equal(reconciled.experience[0].role, "Technical Writer");
  assert.equal(reconciled.experience[1].company, "Earlier Co");
  assert.equal(reconciled.experience[1].role, "");
  assert.equal(reconciled.summary.length, 3);
  assert.equal(reconciled.summary.filter((item) => item.default).length, 1);
  assert.equal(reconciled.summary[0].default, true);
});

test("language pairing allows blank translations but rejects missing or extra records", () => {
  const sourceWithIds = ensureResumeEntryIds(source);
  const template = buildResumeLanguageTemplate(sourceWithIds);
  assert.deepEqual(validateResumeLanguagePair(sourceWithIds, template), []);

  const missing = { ...template, experience: [] };
  assert.match(validateResumeLanguagePair(sourceWithIds, missing).join("\n"), /experience\[0\]: missing linked entry/);
});

test("language pairing rejects changed and duplicate IDs with precise issues", () => {
  const sourceWithIds = ensureResumeEntryIds(source);
  const template = buildResumeLanguageTemplate(sourceWithIds);
  template.experience[0].entry_id = "changed-id";
  template.skills[0].entry_id = template.skills[0].entry_id;
  template.skills.push({ ...template.skills[0], entry_id: template.skills[0].entry_id });

  const validation = inspectResumeLanguagePair(sourceWithIds, template);

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.some((issue) => issue.kind === "changed-id" && issue.collection === "experience"));
  assert.ok(validation.issues.some((issue) => issue.kind === "duplicate-id" && issue.collection === "skills"));
});

test("ID stability allows deliberate additions and removals but rejects replacement", () => {
  const previous = ensureResumeEntryIds(source);
  const removed = { ...previous, summary: previous.summary.slice(0, 1) };
  const added = { ...previous, experience: [...previous.experience, { period: "2018", company: "Earlier Co", role: "", highlights: [] }] };
  const current = { ...previous, experience: previous.experience.slice(0, 1).map((item) => ({ ...item })) };
  current.experience[0].entry_id = "replaced-id";

  assert.equal(inspectResumeEntryIdStability(previous, removed).ok, true);
  assert.equal(inspectResumeEntryIdStability(previous, added).ok, true);
  const validation = inspectResumeEntryIdStability(previous, current);

  assert.equal(validation.ok, false);
  assert.ok(validation.issues.some((issue) => issue.kind === "changed-id" && issue.collection === "experience"));
  assert.equal(hasCompleteResumeLinkage(previous), true);
  assert.equal(hasCompleteResumeLinkage({ ...previous, experience: [{ ...previous.experience[0], entry_id: undefined }] }), false);
});
