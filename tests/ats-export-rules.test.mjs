import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { normalizeResumeDocument } = await import("../app/lib/resume-schema.ts");
const { convertResumeToPlainText, convertResumeToAtsYaml, getRawYamlSource } = await import(
  "../app/lib/resume-export.ts"
);

function loadArianaHolt() {
  const file = path.join(process.cwd(), "public/data/public/resume-en.yaml");
  const raw = yaml.load(fs.readFileSync(file, "utf8"));
  return normalizeResumeDocument(raw, "Ariana Holt");
}

const doc = loadArianaHolt();

test("plain text uses ALLCAPS ATS section headers without decorations", () => {
  const text = convertResumeToPlainText(doc);

  for (const header of ["SUMMARY", "WORK EXPERIENCE", "EDUCATION", "SKILLS", "CERTIFICATIONS", "LANGUAGES"]) {
    assert.equal(text.includes(header), true, `missing header ${header}`);
  }
  assert.equal(text.includes("---"), false);
  assert.equal(text.endsWith("\n"), false);
});

test("plain text merges skills and tech_stack into one line without rating leak", () => {
  const text = convertResumeToPlainText(doc);

  assert.equal(text.includes("Product Discovery, Data Storytelling, Experiment Design"), true);
  assert.equal(text.includes("Python"), true);
  assert.equal(/\(\d\/5\)/.test(text), false);
  assert.equal(text.includes("/5)"), false);
});

test("plain text omits interests and brand initials", () => {
  const text = convertResumeToPlainText(doc);

  assert.equal(text.includes("INTERESTS"), false);
  assert.equal(text.includes("Urban hiking"), false);
  assert.equal(text.includes("(AH)"), false);
});

test("plain text contact line is pipe separated without label prefixes", () => {
  const text = convertResumeToPlainText(doc);
  const contactLine = text.split("\n")[1];

  assert.equal(contactLine, "Portland, OR | +1 555 204 1130 | ariana.holt@example.com | linkedin.com/in/arianaholt | arianaholt.dev");
  assert.equal(text.includes("E-mail:"), false);
});

test("plain text normalizes open period tokens to Present and keeps MM/YYYY for closed dates", () => {
  const text = convertResumeToPlainText(doc);

  assert.equal(text.includes("03/2022 – Present"), true);
  assert.equal(text.includes("07/2019 – 02/2022"), true);
  assert.equal(text.includes("– now"), false);
});

test("open-date tokens are recognized across shipped locales", () => {
  const locales = [
    { token: "obecnie", period: "2022-03 – obecnie" },
    { token: "actual", period: "2022-03 – actual" },
    { token: "heute", period: "2022-03 – heute" },
    { token: "today", period: "2022-03 – today" },
  ];

  for (const { token, period } of locales) {
    const localized = normalizeResumeDocument(
      { ...doc, experience: [{ period, company: "Acme", role: "Engineer", highlights: [] }] },
      "Ariana Holt",
    );
    const text = convertResumeToPlainText(localized);
    assert.equal(text.includes("03/2022 – Present"), true, `token ${token} not mapped to Present`);
  }
});

test("plain text education heading uses degree | school | period order when degree is set", () => {
  const withDegree = normalizeResumeDocument(
    {
      ...doc,
      education: [{ period: "2014-09 – 2015-12", school: "NYIT", degree: "MSc HCI", detail: "" }],
    },
    "Ariana Holt",
  );
  const text = convertResumeToPlainText(withDegree);

  assert.equal(text.includes("MSc HCI | NYIT | 09/2014 – 12/2015"), true);
});

test("ats yaml strips interests, skill levels, and summary position noise", () => {
  const out = convertResumeToAtsYaml(doc, "en");
  const parsed = yaml.load(out);

  assert.equal("interests" in parsed, false);
  assert.equal(Array.isArray(parsed.skills), true);
  for (const skill of parsed.skills) {
    assert.equal("level" in skill, false);
    assert.equal(typeof skill.name, "string");
  }
  assert.equal(parsed.summary[0].position, "");
  assert.equal(parsed.summary[0].description.length > 0, true);
});

test("ats yaml preserves the rest of the document structure", () => {
  const parsed = yaml.load(convertResumeToAtsYaml(doc, "en"));

  assert.equal(parsed.first_name, "Ariana");
  assert.equal(parsed.family_name, "Holt");
  assert.equal(parsed.brand_initials, "AH");
  assert.equal(Array.isArray(parsed.experience), true);
  assert.equal(Array.isArray(parsed.education), true);
  assert.equal(Array.isArray(parsed.languages), true);
  assert.equal(Array.isArray(parsed.tech_stack), true);
  assert.equal(parsed.experience[0].period, "2022-03 – now");
});

test("getRawYamlSource returns the input untouched", () => {
  const sample = "name: Ariana Holt\ninterests:\n  - Urban hiking\n";
  assert.equal(getRawYamlSource(sample), sample);
});
