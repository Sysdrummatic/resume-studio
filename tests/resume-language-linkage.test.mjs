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

// Legacy fixtures: a legacy default (no IDs) and a translation holding only the
// collections under test; an empty translation collection has nothing to pair.
const legacyEnglish = (parts = {}) => ({ ...source, summary: [source.summary[0]], ...parts });
const legacyPolish = (parts = {}) => ({
  brand_initials: "LM", first_name: "Lukasz", family_name: "Michta", gdpr_clause: "",
  summary: [], contact: [], qr_codes: [], skills: [], tech_stack: [], languages: [], interests: [], experience: [], education: [], courses: [],
  ...parts,
});
const experience = (company, period, role) => ({ period, company, role, highlights: [] });

async function legacyConflicts(defaultValue, localeValue, options) {
  const { ResumeLegacyPairingError } = await import("../app/lib/resume-language-linkage.ts");
  try {
    reconcileResumeLanguageDocument(ensureResumeEntryIds(defaultValue), localeValue, options);
    return [];
  } catch (error) {
    assert.ok(error instanceof ResumeLegacyPairingError, error);
    return error.conflicts;
  }
}

test("a single legacy entry pairs automatically only when its neutral fields confirm it", async () => {
  const english = legacyEnglish({ experience: [experience("OpenCiVera", "2020 - now", "Writer")] });
  const same = legacyPolish({ experience: [experience("OpenCiVera", "2020 - obecnie", "Pisarz")] });

  assert.deepEqual(await legacyConflicts(english, same), [], "company and start year confirm the identity");
  assert.equal(reconcileResumeLanguageDocument(ensureResumeEntryIds(english), same).experience[0].role, "Pisarz");
});

test("a single legacy entry whose neutral fields contradict is refused, even when confirmed", async () => {
  const english = legacyEnglish({ experience: [experience("Alpha", "2020 - now", "Engineer")] });
  const other = legacyPolish({ experience: [experience("Beta", "2018 - 2019", "Inżynier")] });
  const contact = [legacyEnglish({ contact: [{ label: "E-mail", value: "jan@example.com" }] }), legacyPolish({ contact: [{ label: "E-mail", value: "jan@example.pl" }] })];
  const original = structuredClone(other);

  for (const confirmLegacyPairing of [false, true]) {
    assert.deepEqual(await legacyConflicts(english, other, { confirmLegacyPairing }), [{ collection: "experience", reason: "mismatch", index: 0 }]);
    assert.deepEqual(await legacyConflicts(...contact, { confirmLegacyPairing }), [{ collection: "contact", reason: "mismatch", index: 0 }]);
  }
  assert.deepEqual(other, original, "nothing is changed");
});

test("one matching and one contradicting experience entry are refused, even when confirmed", async () => {
  const english = legacyEnglish({ experience: [experience("Alpha", "2020 - 2021", "Engineer A"), experience("Beta", "2021 - 2022", "Engineer B")] });
  const polish = legacyPolish({ experience: [experience("Alpha", "2020 - 2021", "Inżynier A"), experience("Gamma", "2019 - 2020", "Inżynier G")] });

  for (const confirmLegacyPairing of [false, true]) {
    assert.deepEqual(await legacyConflicts(english, polish, { confirmLegacyPairing }), [{ collection: "experience", reason: "mismatch", index: 1 }]);
  }
});

test("a single legacy entry without a comparable field needs the user's confirmation", async () => {
  const english = legacyEnglish({ interests: ["Music"], tech_stack: ["TypeScript"] });
  const summaryOnly = legacyPolish({ summary: [{ position: "Redaktor", description: "Opis", default: true }] });
  const translatedInterest = legacyPolish({ interests: ["Muzyka"] });

  assert.deepEqual(await legacyConflicts(english, summaryOnly), [{ collection: "summary", reason: "ambiguous" }]);
  assert.deepEqual(await legacyConflicts(english, translatedInterest), [{ collection: "interests", reason: "ambiguous" }]);
  assert.deepEqual(await legacyConflicts(english, legacyPolish({ tech_stack: ["TypeScript"] })), [], "identical text confirms the identity");
  assert.deepEqual(await legacyConflicts(english, summaryOnly, { confirmLegacyPairing: true }), []);
  assert.equal(reconcileResumeLanguageDocument(ensureResumeEntryIds(english), summaryOnly, { confirmLegacyPairing: true }).summary[0].description, "Opis");
});

test("a confirmed legacy translation keeps its tech_stack and interests values", async () => {
  const english = ensureResumeEntryIds(legacyEnglish({ tech_stack: ["TypeScript", "React"], interests: ["Music", "Chess"] }));
  const polish = legacyPolish({ tech_stack: ["TypeScript", "React"], interests: ["Muzyka", "Szachy"] });

  assert.deepEqual(await legacyConflicts(english, polish), [{ collection: "interests", reason: "ambiguous" }], "translated interests have no key to compare");
  const reconciled = reconcileResumeLanguageDocument(english, polish, { confirmLegacyPairing: true });

  assert.deepEqual(reconciled.tech_stack, ["TypeScript", "React"]);
  assert.deepEqual(reconciled.interests, ["Muzyka", "Szachy"]);
});

test("legacy documents receive the same position-derived IDs each time they are parsed", () => {
  // The server, the editor and a later sync each parse a legacy document
  // independently; random IDs there cannot pair the language versions.
  const first = ensureResumeEntryIds(source);
  const second = ensureResumeEntryIds(structuredClone(source));
  assert.deepEqual(second, first);
});

test("Alpha/Beta: two experiences with the same start year in swapped order are never paired", async () => {
  const english = legacyEnglish({ experience: [experience("Alpha", "2020 - 2021", "Engineer A"), experience("Beta", "2020 - 2022", "Engineer B")] });
  const polish = legacyPolish({ experience: [experience("Beta", "2020 - 2022", "Inżynier B"), experience("Alpha", "2020 - 2021", "Inżynier A")] });

  for (const confirmLegacyPairing of [false, true]) {
    assert.deepEqual(await legacyConflicts(english, polish, { confirmLegacyPairing }), [{ collection: "experience", reason: "order", index: 0 }]);
  }
});

test("positions without a reliable comparison are ambiguous until the user confirms them", async () => {
  const noYear = [experience("Alpha", "", "Engineer A"), experience("Beta", "", "Engineer B")];
  const sameKey = [experience("Alpha", "2020", "Engineer A"), experience("Alpha", "2020 - 2021", "Engineer B")];
  for (const [label, rows] of [["a missing start year", noYear], ["two entries with the same key", sameKey]]) {
    const english = legacyEnglish({ experience: rows });
    const polish = legacyPolish({ experience: rows.map((row) => ({ ...row, role: "PL" })) });
    assert.deepEqual(await legacyConflicts(english, polish), [{ collection: "experience", reason: "ambiguous" }], label);
    assert.deepEqual(await legacyConflicts(english, polish, { confirmLegacyPairing: true }), [], `${label}: confirmed`);
  }
});

test("a legacy translation with a different number of entries is not linked, even when confirmed", async () => {
  const english = legacyEnglish({ experience: [experience("OpenCiVera", "2020 - now", "Writer")] });
  const polish = legacyPolish({ experience: [experience("OpenCiVera", "2020 - now", "Pisarz"), experience("Earlier Co", "2016 - 2019", "Redaktor")] });
  const expected = [{ collection: "experience", reason: "count", defaultCount: 1, translationCount: 2 }];

  assert.deepEqual(await legacyConflicts(english, polish), expected);
  assert.deepEqual(await legacyConflicts(english, polish, { confirmLegacyPairing: true }), expected);
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

test("the editor does not block a stored legacy translation on its own position-derived IDs", async () => {
  const { inspectTranslationLinkage } = await import("../app/lib/resume-language-linkage.ts");
  const uuidDefault = ensureResumeEntryIds(legacyEnglish());
  uuidDefault.summary = uuidDefault.summary.map((row) => ({ ...row, entry_id: "7d9c1e3a-uuid-summary" }));
  const storedLegacy = legacyPolish({ summary: [{ position: "Redaktor", description: "Opis", default: true }] });
  const editorBuffer = ensureResumeEntryIds(storedLegacy);

  assert.equal(inspectTranslationLinkage(uuidDefault, editorBuffer, storedLegacy).ok, true, "the server checks the content and asks for confirmation");
  const linkedStored = buildResumeLanguageTemplate(uuidDefault);
  assert.equal(inspectTranslationLinkage(uuidDefault, editorBuffer, linkedStored).ok, false, "a linked translation keeps the strict ID check");
});

test("the editor can tell when a save gave its rows different linkage IDs", async () => {
  const { resumeEntryIdsDiffer } = await import("../app/lib/resume-language-linkage.ts");
  const editorBuffer = ensureResumeEntryIds(legacyPolish({ summary: [{ position: "Redaktor", description: "Opis", default: true }], interests: ["Muzyka"] }));
  const storedCanonical = structuredClone(editorBuffer);
  storedCanonical.summary[0].entry_id = "uuid-summary";
  storedCanonical.__ocv.entries.interests = ["uuid-interest"];
  const reformatted = { ...structuredClone(editorBuffer), gdpr_clause: "" };

  assert.equal(resumeEntryIdsDiffer(editorBuffer, storedCanonical), true);
  assert.equal(resumeEntryIdsDiffer(editorBuffer, reformatted), false, "formatting alone does not replace the buffer");
});

test("a Date value in a schema-unknown extension field survives ensureResumeEntryIds unchanged", () => {
  // js-yaml parses an unquoted date-shaped scalar (e.g. "2024-05-01") into a
  // real Date, not a string. A JSON round-trip clone would silently rewrite
  // it to an ISO string on every save/reconcile; structuredClone must not.
  const startedOn = new Date("2024-05-01T00:00:00.000Z");
  const withExtensionDate = { ...source, experience: [{ ...source.experience[0], started_on: startedOn }] };

  const linked = ensureResumeEntryIds(withExtensionDate);

  assert.ok(linked.experience[0].started_on instanceof Date, "extension field must stay a Date instance");
  assert.equal(linked.experience[0].started_on.getTime(), startedOn.getTime());
});
