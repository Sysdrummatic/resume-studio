import test from "node:test";
import assert from "node:assert/strict";

import { mergeImportedResume } from "../app/lib/resume-import/merge-imported-resume.ts";
import { defaultResumeDocument } from "../app/lib/resume-schema.ts";

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
  const withName = mergeImportedResume(defaultResumeDocument("Ariana Holt"), { name: "Steeve Tatums" });
  assert.equal(withName.name, "Ariana Holt");

  const withoutName = mergeImportedResume(defaultResumeDocument(""), { name: "Steeve Tatums" });
  assert.equal(withoutName.name, "Steeve Tatums");
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
  assert.equal(merged.name, "Ariana Holt");
});
