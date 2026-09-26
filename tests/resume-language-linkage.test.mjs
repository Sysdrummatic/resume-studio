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

const legacyPolish = {
  ...source,
  summary: [{ position: "Redaktor techniczny", description: "Pisze dokumentację", default: true }, { position: "Inżynier", description: "Buduje narzędzia", default: false }],
  tech_stack: ["TypeScript (PL)"],
  interests: ["Muzyka"],
  experience: [{ period: "2020 - now", company: "OpenCiVera", role: "Redaktor techniczny", highlights: ["Dokumentacja"] }],
};

test("a legacy translation keeps its tech_stack and interests values when first linked to the default", () => {
  const defaultWithIds = ensureResumeEntryIds({ ...source, tech_stack: ["TypeScript", "React"], interests: ["Music", "Chess"] });
  const polish = { ...legacyPolish, tech_stack: ["TypeScript (PL)", "React (PL)"], interests: ["Muzyka", "Szachy"] };

  const reconciled = reconcileResumeLanguageDocument(defaultWithIds, polish);

  assert.deepEqual(reconciled.tech_stack, ["TypeScript (PL)", "React (PL)"]);
  assert.deepEqual(reconciled.interests, ["Muzyka", "Szachy"]);
  assert.equal(reconciled.experience[0].role, "Redaktor techniczny");
  assert.deepEqual(validateResumeLanguagePair(defaultWithIds, reconciled), []);
});

test("legacy documents receive the same position-derived IDs each time they are parsed", () => {
  // The server, the editor and a later sync each parse a legacy document
  // independently; random IDs there cannot pair the language versions.
  const first = ensureResumeEntryIds(source);
  const second = ensureResumeEntryIds(structuredClone(source));
  assert.deepEqual(second, first);
  assert.deepEqual(ensureResumeEntryIds(legacyPolish).__ocv, first.__ocv);
  assert.equal(ensureResumeEntryIds(legacyPolish).experience[0].entry_id, first.experience[0].entry_id);
});

test("a legacy translation with a different number of entries is not linked automatically", async () => {
  const { ResumeLegacyPairingError } = await import("../app/lib/resume-language-linkage.ts");
  const defaultWithIds = ensureResumeEntryIds(source);
  const polish = structuredClone({
    ...legacyPolish,
    experience: [...legacyPolish.experience, { period: "2016 - 2019", company: "Earlier Co", role: "Młodszy redaktor", highlights: ["Tłumaczenia"] }],
  });
  const original = structuredClone(polish);

  assert.throws(() => reconcileResumeLanguageDocument(defaultWithIds, polish), (error) => {
    assert.ok(error instanceof ResumeLegacyPairingError);
    assert.deepEqual(error.conflicts, [{ collection: "experience", reason: "count", defaultCount: 1, translationCount: 2 }]);
    return true;
  });
  assert.deepEqual(polish, original, "the translation is left untouched");

  const fewer = { ...legacyPolish, experience: [] , courses: [] };
  assert.doesNotThrow(() => reconcileResumeLanguageDocument(defaultWithIds, fewer), "an empty legacy collection has nothing to pair");
});

test("a legacy translation whose entries are in a different order is not linked automatically", async () => {
  const { ResumeLegacyPairingError } = await import("../app/lib/resume-language-linkage.ts");
  const english = ensureResumeEntryIds({
    ...source,
    experience: [
      { period: "2020 - now", company: "OpenCiVera", role: "Writer", highlights: [] },
      { period: "2015 - 2019", company: "Earlier Co", role: "Editor", highlights: [] },
    ],
  });
  const polish = {
    ...legacyPolish,
    experience: [
      { period: "2015 - 2019", company: "Earlier Co", role: "Redaktor", highlights: [] },
      { period: "2020 - obecnie", company: "OpenCiVera", role: "Pisarz", highlights: [] },
    ],
  };

  assert.throws(() => reconcileResumeLanguageDocument(english, polish), (error) => {
    assert.ok(error instanceof ResumeLegacyPairingError);
    assert.deepEqual(error.conflicts, [{ collection: "experience", reason: "order", index: 0 }]);
    return true;
  });
  const sameOrder = { ...polish, experience: [...polish.experience].reverse() };
  assert.equal(reconcileResumeLanguageDocument(english, sameOrder).experience[0].role, "Pisarz", "translated periods like 'obecnie' still pair by start year");
});

test("an already linked translation never has a missing ID guessed from its position", () => {
  const defaultWithIds = ensureResumeEntryIds({
    ...source,
    experience: [...source.experience, { period: "2018", company: "Earlier Co", role: "Intern", highlights: [] }],
  });
  const [first, second] = defaultWithIds.experience.map((item) => item.entry_id);
  const linkedPolish = buildResumeLanguageTemplate(defaultWithIds);
  linkedPolish.experience = [
    { ...linkedPolish.experience[1], role: "Stażysta" },
    { period: "2019", company: "Unknown", role: "Bez identyfikatora", highlights: [] },
  ];

  const reconciled = reconcileResumeLanguageDocument(defaultWithIds, linkedPolish);

  assert.deepEqual(reconciled.experience.map((item) => item.entry_id), [first, second]);
  assert.equal(reconciled.experience[1].role, "Stażysta", "the translation stays with its own entry");
  assert.equal(reconciled.experience[0].role, "", "an unidentified row is not attached to another entry");
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
