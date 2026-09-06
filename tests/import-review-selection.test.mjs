import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

register(pathToFileURL(path.join(process.cwd(), "tests/helpers/ts-extension-resolve.mjs")), import.meta.url);

const { filterSelectedImportSections, isSectionFound } = await import(
  pathToFileURL(path.join(process.cwd(), "app/master-resume/import-review-modal.tsx"))
);

test("keeps only the checked entries of a list section", () => {
  const resume = {
    experience: [
      { period: "2020 – Present", company: "Acme", role: "Engineer", highlights: [] },
      { period: "2015 – 2019", company: "Globex", role: "Junior Engineer", highlights: [] },
    ],
  };

  const filtered = filterSelectedImportSections(resume, { experience: [true, false] });

  assert.equal(filtered.experience.length, 1);
  assert.equal(filtered.experience[0].company, "Acme");
});

test("drops the whole section when every entry is unchecked", () => {
  const resume = { skills: [{ name: "TypeScript", level: 4 }, { name: "Go", level: 3 }] };

  const filtered = filterSelectedImportSections(resume, { skills: [false, false] });

  assert.deepEqual(filtered.skills, []);
});

test("leaves a section untouched when it has no selection entry", () => {
  const resume = { interests: ["Chess", "Running"] };

  const filtered = filterSelectedImportSections(resume, {});

  assert.deepEqual(filtered.interests, ["Chess", "Running"]);
});

test("leaves scalar fields untouched — nothing to select for a single value", () => {
  const resume = { first_name: "Ariana", family_name: "Holt", experience: [{ period: "", company: "Acme", role: "", highlights: [] }] };

  const filtered = filterSelectedImportSections(resume, { experience: [false] });

  assert.equal(filtered.first_name, "Ariana");
  assert.equal(filtered.family_name, "Holt");
  assert.deepEqual(filtered.experience, []);
});

test("filters independently across multiple sections", () => {
  const resume = {
    skills: [{ name: "TypeScript", level: 4 }, { name: "Go", level: 3 }],
    languages: [{ name: "English", level_text: "Native", level: 5 }, { name: "Polish", level_text: "Native", level: 5 }],
  };

  const filtered = filterSelectedImportSections(resume, { skills: [true, false], languages: [false, true] });

  assert.deepEqual(filtered.skills.map((s) => s.name), ["TypeScript"]);
  assert.deepEqual(filtered.languages.map((l) => l.name), ["Polish"]);
});

test("isSectionFound: a populated list is found", () => {
  assert.equal(isSectionFound({ skills: [{ name: "Go", level: 3 }] }, "skills"), true);
});

// A native-schema round trip fills every field via normalizeResumeDocument,
// including an empty array for a section the source file never had. Treating
// that as "found" produced a pointless, empty, expandable "0 of 0 selected"
// section in the review UI.
test("isSectionFound: an empty list is not found", () => {
  assert.equal(isSectionFound({ skills: [] }, "skills"), false);
});

test("isSectionFound: a key that was never set is not found", () => {
  assert.equal(isSectionFound({}, "skills"), false);
});

