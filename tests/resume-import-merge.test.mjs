import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { mergeImportedResume } = await import("../app/lib/resume-import/merge-imported-resume.ts");
const { defaultResumeDocument } = await import("../app/lib/resume-schema.ts");

test("imported contact fills the existing placeholder used by the editor", () => {
  const merged = mergeImportedResume(defaultResumeDocument("Jane Doe"), {
    contact: [{ label: "E-mail", value: "jane@example.com" }],
  });
  assert.equal(merged.contact.find((item) => item.label === "E-mail").value, "jane@example.com");
  assert.equal(merged.contact.filter((item) => item.label === "E-mail").length, 1);
});

test("import preserves partially entered periods and course years", () => {
  const current = {
    ...defaultResumeDocument("Jane Doe"),
    experience: [{ period: "2020", company: "", role: "", highlights: [] }],
    education: [{ period: "2019", school: "", degree: "", detail: "" }],
    courses: [{ year: 2024, name: "" }],
  };
  const merged = mergeImportedResume(current, { experience: [], education: [], courses: [] });
  assert.deepEqual(merged.experience, current.experience);
  assert.deepEqual(merged.education, current.education);
  assert.deepEqual(merged.courses, current.courses);
});

test("an imported default summary retains its flag regardless of its position", () => {
  const merged = mergeImportedResume(defaultResumeDocument("Jane Doe"), {
    summary: [
      { position: "Alternate", description: "Alternative", default: false },
      { position: "Engineer", description: "Main", default: true },
    ],
  });
  assert.equal(merged.summary[1].default, true);
  assert.equal(merged.summary.filter((item) => item.default).length, 1);
});

test("appends experience/education/skills/etc. instead of replacing them", () => {
  const current = {
    ...defaultResumeDocument("Ariana Holt"),
    experience: [{ period: "2020 – Present", company: "Acme", role: "Engineer", highlights: ["Shipped things"] }],
    skills: [{ name: "TypeScript", level: 4 }],
  };

  const merged = mergeImportedResume(current, {
    experience: [{ period: "2015 – 2019", company: "Globex", role: "Junior Engineer", highlights: [] }],
    skills: [{ name: "Go", level: 3 }],
  });

  assert.equal(merged.experience.length, 2);
  assert.equal(merged.experience[0].company, "Acme");
  assert.equal(merged.experience[1].company, "Globex");
  assert.deepEqual(merged.skills.map((s) => s.name), ["TypeScript", "Go"]);
});

test("drops a fresh draft's blank placeholder rows before appending", () => {
  const current = defaultResumeDocument(""); // seeded with one blank experience/education/etc. entry
  const merged = mergeImportedResume(current, {
    experience: [{ period: "2020 – Present", company: "Acme", role: "Engineer", highlights: [] }],
  });

  assert.equal(merged.experience.length, 1);
  assert.equal(merged.experience[0].company, "Acme");
});

test("fills the name only when the draft doesn't already have one", () => {
  const withName = mergeImportedResume(defaultResumeDocument("Ariana Holt"), { first_name: "Steeve", family_name: "Tatums" });
  assert.equal(withName.first_name, "Ariana");
  assert.equal(withName.family_name, "Holt");

  const withoutName = mergeImportedResume(defaultResumeDocument(""), { first_name: "Steeve", family_name: "Tatums" });
  assert.equal(withoutName.first_name, "Steeve");
  assert.equal(withoutName.family_name, "Tatums");
});

test("contact: fills a label only when it isn't already set, per label", () => {
  const current = {
    ...defaultResumeDocument("Ariana Holt"),
    contact: [{ label: "E-mail", value: "ariana@example.com", link: "mailto:ariana@example.com" }],
  };

  const merged = mergeImportedResume(current, {
    contact: [
      { label: "E-mail", value: "someone-else@example.com", link: "mailto:someone-else@example.com" },
      { label: "Phone", value: "+1 555 0100", link: "tel:+15550100" },
    ],
  });

  assert.equal(merged.contact.find((c) => c.label === "E-mail")?.value, "ariana@example.com");
  assert.equal(merged.contact.find((c) => c.label === "Phone")?.value, "+1 555 0100");
});

test("skills/languages: does not duplicate an entry that already exists (case-insensitive)", () => {
  const current = { ...defaultResumeDocument(""), skills: [{ name: "TypeScript", level: 4 }] };
  const merged = mergeImportedResume(current, { skills: [{ name: "typescript", level: 2 }, { name: "Go", level: 3 }] });

  assert.equal(merged.skills.length, 2);
  assert.deepEqual(merged.skills.map((s) => s.name), ["TypeScript", "Go"]);
});

test("summary: an imported default is demoted to non-default once the draft already has one", () => {
  const current = {
    ...defaultResumeDocument(""),
    summary: [{ position: "Engineer", description: "Existing summary.", default: true }],
  };

  const merged = mergeImportedResume(current, {
    summary: [{ position: "Imported", description: "Imported summary.", default: true }],
  });

  assert.equal(merged.summary.length, 2);
  assert.equal(merged.summary[0].default, true);
  assert.equal(merged.summary[1].default, false);
});

test("fields not present in the import are left completely untouched", () => {
  const current = { ...defaultResumeDocument("Ariana Holt"), interests: ["Chess"] };
  const merged = mergeImportedResume(current, { experience: [{ period: "", company: "Acme", role: "", highlights: [] }] });

  assert.deepEqual(merged.interests, ["Chess"]);
  assert.equal(merged.first_name, "Ariana");
  assert.equal(merged.family_name, "Holt");
});
