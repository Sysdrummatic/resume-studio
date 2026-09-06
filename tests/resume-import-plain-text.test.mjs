import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { parsePlainTextResume } = await import("../app/lib/resume-import/parse-plain-text.ts");
const { convertResumeToPlainText } = await import("../app/lib/resume-export.ts");
const { defaultResumeDocument } = await import("../app/lib/resume-schema.ts");

test("round-trips our own ATS .txt export losslessly (high-confidence path)", () => {
  const original = {
    ...defaultResumeDocument("Jane Doe"),
    contact: [
      { label: "E-mail", value: "jane@example.com", link: "mailto:jane@example.com" },
      { label: "LinkedIn", value: "linkedin.com/in/janedoe", link: "https://linkedin.com/in/janedoe" },
    ],
    summary: [{ position: "Default", description: "Builds humane products.", default: true }],
    experience: [
      {
        period: "2020-01 – Present",
        company: "Acme",
        role: "Senior Engineer",
        highlights: ["Shipped the thing", "Led the team"],
      },
    ],
    education: [{ period: "2014-09 – 2018-06", school: "MIT", degree: "BSc Computer Science", detail: "" }],
    skills: [{ name: "TypeScript", level: 4 }],
    courses: [{ name: "AWS Certified", year: 2022 }],
    languages: [{ name: "English", level_text: "Native", level: 5 }],
  };

  const exported = convertResumeToPlainText(original);
  const result = parsePlainTextResume(exported, "txt");

  assert.equal(result.warnings.length, 0, `unexpected warnings: ${result.warnings.join(" | ")}`);
  assert.equal(result.resume.contact?.some((item) => item.label === "E-mail" && item.value === "jane@example.com"), true);
  assert.equal(result.resume.summary?.[0].description, "Builds humane products.");
  assert.equal(result.resume.experience?.[0].company, "Acme");
  assert.equal(result.resume.experience?.[0].role, "Senior Engineer");
  assert.deepEqual(result.resume.experience?.[0].highlights, ["Shipped the thing", "Led the team"]);
  assert.equal(result.resume.education?.[0].school, "MIT");
  assert.equal(result.resume.skills?.[0].name, "TypeScript");
  assert.equal(result.resume.courses?.[0].name, "AWS Certified");
  assert.equal(result.resume.languages?.[0].name, "English");
});

test("parses a generic plain-text CV via section-header heuristics", () => {
  const text = `John Smith
john.smith@example.com | +1 555 0100 | linkedin.com/in/johnsmith

SUMMARY
Backend engineer with 8 years of experience in distributed systems.

WORK EXPERIENCE
Staff Engineer | Globex Corp | 2021 - Present
- Designed the new billing pipeline
- Mentored four engineers

Software Engineer at Initech, 2018 - 2021
- Built the internal admin tool

EDUCATION
BSc Computer Science | State University | 2014 - 2018

SKILLS
Go, Python, Kubernetes

LANGUAGES
English (Native)
Spanish (B2)
`;

  const result = parsePlainTextResume(text, "pdf");

  assert.equal(result.resume.first_name, "John");
  assert.equal(result.resume.family_name, "Smith");
  assert.equal(result.resume.contact?.some((item) => item.label === "E-mail" && item.value === "john.smith@example.com"), true);
  assert.equal(result.resume.contact?.some((item) => item.label === "LinkedIn"), true);
  assert.match(result.resume.summary?.[0].description ?? "", /distributed systems/);

  assert.equal(result.resume.experience?.length, 2);
  assert.equal(result.resume.experience?.[0].role, "Staff Engineer");
  assert.equal(result.resume.experience?.[0].company, "Globex Corp");
  // The " | "-delimited heading format is taken verbatim (it's already
  // structured), unlike the free-text heading below it that goes through
  // extractDateRange's hyphen -> en dash normalisation.
  assert.equal(result.resume.experience?.[0].period, "2021 - Present");
  assert.deepEqual(result.resume.experience?.[0].highlights, ["Designed the new billing pipeline", "Mentored four engineers"]);
  assert.equal(result.resume.experience?.[1].company, "Initech");

  assert.equal(result.resume.education?.[0].school, "State University");
  assert.deepEqual(result.resume.skills?.map((s) => s.name), ["Go", "Python", "Kubernetes"]);
  assert.equal(result.resume.languages?.[0].level_text, "Native");
  assert.equal(result.resume.languages?.[0].level, 5);
  assert.equal(result.resume.languages?.[1].level_text, "B2");
});

test("a role/company heading followed by a standalone date-range line starts a new entry, not a highlight", () => {
  // Regression: this exact shape leaked "Backend Engineer at Contoso" into
  // the previous entry's highlights and produced an "Untitled role" ghost
  // entry, found via a live browser smoke test of the import banner.
  const text = `WORK EXPERIENCE
Staff Engineer | Northwind Systems | 2021 - Present
- Led the migration to event-sourced billing
- Reduced checkout latency by 40%

Backend Engineer at Contoso
2017 - 2021
- Built the fraud-detection service
`;

  const result = parsePlainTextResume(text, "txt");

  assert.equal(result.resume.experience?.length, 2);
  assert.deepEqual(result.resume.experience?.[0].highlights, [
    "Led the migration to event-sourced billing",
    "Reduced checkout latency by 40%",
  ]);
  assert.equal(result.resume.experience?.[1].role, "Backend Engineer");
  assert.equal(result.resume.experience?.[1].company, "Contoso");
  assert.equal(result.resume.experience?.[1].period, "2017 – 2021");
  assert.deepEqual(result.resume.experience?.[1].highlights, ["Built the fraud-detection service"]);
});

test("leaves unrecognised sections untouched instead of clearing them", () => {
  const result = parsePlainTextResume("SUMMARY\nJust a summary, nothing else.", "txt");

  assert.equal("experience" in result.resume, false);
  assert.equal("education" in result.resume, false);
  assert.ok(result.warnings.some((warning) => warning.includes("education")));
});

test("empty or unreadable text produces a warning, not a crash", () => {
  const result = parsePlainTextResume("   \n\n  ", "pdf");
  assert.deepEqual(result.resume, {});
  assert.match(result.warnings[0], /no readable text/);
});

// Some CV templates put a course's year and name/institution on separate
// lines (year first) instead of "Name | Year" on one.
test("a course's year on its own line is paired with the course name that follows", () => {
  const result = parsePlainTextResume(
    "COURSES\n2024\nStrategic Key Account Management – Miller Heiman Group\n2022\nNegotiation Mastery – Karrass",
    "pdf",
  );

  assert.deepEqual(result.resume.courses, [
    { name: "Strategic Key Account Management – Miller Heiman Group", year: 2024 },
    { name: "Negotiation Mastery – Karrass", year: 2022 },
  ]);
});

test("a course with no year line still parses, just without one", () => {
  const result = parsePlainTextResume("COURSES\nOn-the-job training", "pdf");
  assert.deepEqual(result.resume.courses, [{ name: "On-the-job training", year: 0 }]);
});

// Some CV templates put a language's name and its proficiency on separate
// lines instead of "Name - Level" on one.
test("a language's proficiency on its own line is paired with the name that precedes it", () => {
  const result = parsePlainTextResume("LANGUAGES\nNorwegian\nNative\nEnglish\nProfessional", "pdf");

  assert.deepEqual(result.resume.languages, [
    { name: "Norwegian", level_text: "Native", level: 5 },
    { name: "English", level_text: "Professional", level: 3 },
  ]);
});

test("a language with no recognisable proficiency line still parses, just without one", () => {
  const result = parsePlainTextResume("LANGUAGES\nFrench", "pdf");
  assert.deepEqual(result.resume.languages, [{ name: "French", level_text: "", level: 3 }]);
});
