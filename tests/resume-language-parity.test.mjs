import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const {
  applyStructuralOpToAll,
  buildLanguageTemplate,
  inspectParity,
  matchOthersToVersion,
  parityDifference,
  rowHasTranslatedContent,
  stripEntryIds,
  untranslatedFieldCount,
} = await import("../app/lib/resume-language-parity.ts");

function english() {
  return {
    first_name: "Jan", family_name: "Kowalski", brand_initials: "JK", gdpr_clause: "Consent",
    summary: [{ position: "Engineer", description: "Builds", default: true }, { position: "Lead", description: "Leads", default: false }],
    contact: [{ label: "E-mail", value: "jan@example.com" }],
    qr_codes: [],
    skills: [{ name: "Writing", level: 4 }, { name: "Testing", level: 3 }],
    languages: [{ name: "Polish", level_text: "Native", level: 5 }],
    tech_stack: ["TypeScript", "React"],
    interests: ["Music"],
    experience: [
      { period: "2020 - now", company: "Acme", role: "Engineer", highlights: ["Built the editor", "Wrote docs"] },
      { period: "2018 - 2019", company: "Beta", role: "Dev", highlights: ["Shipped"] },
    ],
    education: [{ period: "2010", school: "Uni", degree: "MA", detail: "Thesis" }],
    courses: [{ year: 2024, name: "Course" }],
  };
}

const polish = () => {
  const doc = buildLanguageTemplate(english());
  doc.skills[0].name = "Pisanie";
  doc.skills[1].name = "Testowanie";
  doc.experience[0].role = "Inżynier";
  doc.experience[0].highlights = ["Zbudowałem edytor", "Napisałem dokumentację"];
  doc.experience[1].role = "Programista";
  return doc;
};

test("a new language template has the same number of entries and bullets, empty translatable values and copied neutral fields", () => {
  const template = buildLanguageTemplate(english());

  assert.equal(template.summary.length, 2);
  assert.deepEqual(template.summary.map((row) => [row.position, row.description, row.default]), [["", "", true], ["", "", false]]);
  assert.deepEqual(template.skills, [{ name: "", level: 4 }, { name: "", level: 3 }]);
  assert.deepEqual(template.tech_stack, ["", ""]);
  assert.deepEqual(template.interests, [""]);
  assert.deepEqual(template.experience[0], { period: "2020 - now", company: "Acme", role: "", highlights: ["", ""] });
  assert.deepEqual(template.experience[1].highlights, [""]);
  assert.equal(template.contact[0].value, "jan@example.com");
  assert.equal(template.gdpr_clause, "");
  assert.equal(inspectParity({ en: english(), pl: template }, "en").length, 0);
});

test("adding an entry in any version appends a blank slot with the neutral fields to the others", () => {
  const docs = { en: english(), pl: polish() };

  const next = applyStructuralOpToAll(docs, "pl", { kind: "add", collection: "experience", item: { period: "2025", company: "Gamma", role: "Tester", highlights: ["Tests"] } });

  assert.equal(next.pl.experience.length, 3);
  assert.deepEqual(next.en.experience[2], { period: "2025", company: "Gamma", role: "", highlights: [""] });
  assert.equal(inspectParity(next, "en").length, 0);
  assert.equal(docs.en.experience.length, 2, "inputs are not mutated");
});

test("removing an entry removes the same index everywhere and keeps the other translations in place", () => {
  const next = applyStructuralOpToAll({ en: english(), pl: polish() }, "en", { kind: "remove", collection: "skills", index: 0 });

  assert.deepEqual(next.en.skills.map((row) => row.name), ["Testing"]);
  assert.deepEqual(next.pl.skills.map((row) => row.name), ["Testowanie"]);
});

test("moving an entry moves the same index everywhere with its translation", () => {
  const next = applyStructuralOpToAll({ en: english(), pl: polish() }, "pl", { kind: "move", collection: "experience", from: 1, to: 0 });

  assert.deepEqual(next.en.experience.map((row) => row.company), ["Beta", "Acme"]);
  assert.deepEqual(next.pl.experience.map((row) => row.role), ["Programista", "Inżynier"]);
});

test("a bullet is added, removed and moved in every version of that experience entry", () => {
  const docs = { en: english(), pl: polish() };

  const added = applyStructuralOpToAll(docs, "en", { kind: "highlight-add", entryIndex: 1, item: "Another bullet" });
  assert.deepEqual(added.en.experience[1].highlights, ["Shipped", "Another bullet"]);
  assert.deepEqual(added.pl.experience[1].highlights, ["", ""]);

  const removed = applyStructuralOpToAll(docs, "pl", { kind: "highlight-remove", entryIndex: 0, index: 0 });
  assert.deepEqual(removed.en.experience[0].highlights, ["Wrote docs"]);
  assert.deepEqual(removed.pl.experience[0].highlights, ["Napisałem dokumentację"]);

  const moved = applyStructuralOpToAll(docs, "en", { kind: "highlight-move", entryIndex: 0, from: 0, to: 1 });
  assert.deepEqual(moved.pl.experience[0].highlights, ["Napisałem dokumentację", "Zbudowałem edytor"]);
});

test("inspectParity names the section, the version and what differs", () => {
  const broken = polish();
  broken.experience.pop();
  broken.skills[0].level = 1;
  broken.experience[0].company = "Other";
  broken.experience[0].highlights.pop();
  broken.summary[0].default = false;

  const issues = inspectParity({ en: english(), pl: broken }, "en");

  assert.ok(issues.some((issue) => issue.kind === "count" && issue.collection === "experience" && issue.locale === "pl" && issue.expected === 2 && issue.actual === 1));
  assert.ok(issues.some((issue) => issue.kind === "neutral" && issue.collection === "skills" && issue.index === 0));
  assert.ok(issues.some((issue) => issue.kind === "neutral" && issue.collection === "experience" && issue.index === 0));
  assert.ok(issues.some((issue) => issue.kind === "highlights" && issue.index === 0 && issue.expected === 2 && issue.actual === 1));
  assert.ok(issues.some((issue) => issue.kind === "summary-default"));
});

test("parityDifference is 0 for matching versions and reports the worst version otherwise", () => {
  assert.equal(parityDifference(english(), { pl: polish() }).percent, 0);

  const shorter = polish();
  shorter.skills.pop();
  const other = polish();
  other.tech_stack = [];
  const result = parityDifference(english(), { pl: shorter, de: other });

  assert.ok(result.percent > 0 && result.percent <= 100);
  assert.equal(result.worst, result.perLocale.reduce((worst, entry) => (entry.percent > worst.percent ? entry : worst)).locale);
  assert.deepEqual(result.perLocale.map((entry) => entry.locale).sort(), ["de", "pl"]);
});

test("matching the others to a version pads with blank slots or truncates the tail and reports translated content that is cut", () => {
  const source = english();
  source.skills.push({ name: "Reviewing", level: 5 });
  source.experience.pop();
  source.experience[0].highlights.push("Third bullet");

  const result = matchOthersToVersion({ en: source, pl: polish() }, "en");

  assert.deepEqual(result.documents.pl.skills.map((row) => row.name), ["Pisanie", "Testowanie", ""]);
  assert.equal(result.documents.pl.skills[2].level, 5);
  assert.equal(result.documents.pl.experience.length, 1);
  assert.deepEqual(result.documents.pl.experience[0].highlights, ["Zbudowałem edytor", "Napisałem dokumentację", ""]);
  assert.deepEqual(result.truncated, [{ locale: "pl", collection: "experience", index: 1, hasContent: true }]);
  assert.equal(inspectParity(result.documents, "en").length, 0);
  assert.equal(result.documents.en, source, "the source version is returned as is");
});

test("neutral fields of the source win when the others are matched", () => {
  const source = english();
  source.experience[0].company = "Acme Corp";
  const result = matchOthersToVersion({ en: source, pl: polish() }, "en");

  assert.equal(result.documents.pl.experience[0].company, "Acme Corp");
  assert.equal(result.documents.pl.experience[0].role, "Inżynier");
});

test("rowHasTranslatedContent ignores neutral fields", () => {
  assert.equal(rowHasTranslatedContent("experience", { period: "2020", company: "Acme", role: "", highlights: [""] }), false);
  assert.equal(rowHasTranslatedContent("experience", { period: "2020", company: "Acme", role: "", highlights: ["x"] }), true);
  assert.equal(rowHasTranslatedContent("skills", { name: "", level: 4 }), false);
  assert.equal(rowHasTranslatedContent("tech_stack", "React"), true);
  assert.equal(rowHasTranslatedContent("tech_stack", " "), false);
});

test("untranslatedFieldCount counts what is filled in the source but empty in the version", () => {
  const template = buildLanguageTemplate(english());

  // summary 4, languages 2, tech 2, interests 1, education 2, courses 1, one experience bullet = 13
  assert.equal(untranslatedFieldCount(english(), polish()), 13);
  // an empty template adds skills 2, experience roles 2 and bullets 2 = 19
  assert.equal(untranslatedFieldCount(english(), template), 19);
  assert.equal(untranslatedFieldCount(english(), english()), 0);
});

test("stripEntryIds removes entry_id from rows and the __ocv block and keeps everything else", () => {
  const dirty = { ...english(), __ocv: { entries: { tech_stack: ["a", "b"] } }, skills: [{ entry_id: "x", name: "Writing", level: 4 }] };

  const clean = stripEntryIds(dirty);

  assert.equal("__ocv" in clean, false);
  assert.deepEqual(clean.skills, [{ name: "Writing", level: 4 }]);
  assert.deepEqual(clean.tech_stack, ["TypeScript", "React"]);
  assert.equal("entry_id" in dirty.skills[0], true, "the input is not mutated");
});
