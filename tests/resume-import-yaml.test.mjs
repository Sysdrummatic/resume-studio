import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { parseYamlCv } = await import("../app/lib/resume-import/parse-yaml-cv.ts");

test("JSON Resume detection wins over section names shared with the native schema", () => {
  const result = parseYamlCv(`
basics:
  name: Jane Doe
  email: jane@example.com
work:
  - name: Acme
    position: Engineer
education: []
skills: []
languages: []
interests: []
`);
  assert.equal(result.resume.first_name, "Jane");
  assert.equal(result.resume.experience[0].company, "Acme");
  assert.equal(result.resume.contact[0].value, "jane@example.com");
});

test("generic CVs with education keep their top-level identity and experience", () => {
  const result = parseYamlCv(`
full_name: Jane Doe
email: jane@example.com
experience:
  - employer: Acme
    role: Engineer
education:
  - school: University
    degree: BSc
`);
  assert.equal(result.resume.first_name, "Jane");
  assert.equal(result.resume.experience[0].company, "Acme");
  assert.equal(result.resume.education[0].school, "University");
});

test("partial native imports never invent identity or sections absent from the file", () => {
  const result = parseYamlCv("brand_initials: ''\nsummary: []\nskills: [Go]\ntech_stack: [Node.js]\n");
  assert.equal(result.resume.first_name, undefined);
  assert.equal(result.resume.family_name, undefined);
  assert.equal(result.resume.experience, undefined);
  assert.deepEqual(result.resume.skills, [{ name: "Go", level: 3 }]);
});

test("recognises OpenCiVera's own schema and normalizes it losslessly", () => {
  const yamlText = `
brand_initials: "JD"
first_name: "Jane"
family_name: "Doe"
summary:
  - position: "Engineer"
    description: "Builds things."
    default: true
contact:
  - label: "E-mail"
    value: "jane@example.com"
    link: "mailto:jane@example.com"
qr_codes: []
skills:
  - name: "TypeScript"
    level: 4
tech_stack: ["Node.js"]
languages:
  - name: "English"
    level_text: "Native"
    level: 5
interests: ["Chess"]
experience:
  - period: "2020 – Present"
    company: "Acme"
    role: "Engineer"
    highlights: ["Shipped things"]
education: []
courses: []
gdpr_clause: ""
`;

  const result = parseYamlCv(yamlText);
  assert.equal(result.sourceKind, "yaml");
  assert.equal(result.resume.first_name, "Jane");
  assert.equal(result.resume.family_name, "Doe");
  assert.equal(result.resume.experience?.[0].company, "Acme");
  assert.equal(result.warnings.length, 0);
});

test("maps a JSON Resume-shaped YAML CV onto the schema", () => {
  const yamlText = `
basics:
  name: John Smith
  label: Senior Developer
  email: john@example.com
  phone: "+1 555 0100"
  summary: Experienced backend engineer.
  location:
    city: Berlin
  profiles:
    - network: LinkedIn
      url: https://linkedin.com/in/johnsmith
work:
  - name: Globex
    position: Backend Engineer
    startDate: "2019-01"
    endDate: "2022-06"
    highlights:
      - Built the payments service
education:
  - institution: MIT
    studyType: BSc
    area: Computer Science
    startDate: "2013-09"
    endDate: "2017-06"
skills:
  - name: Go
    level: Master
languages:
  - language: German
    fluency: Native
`;

  const result = parseYamlCv(yamlText);
  assert.equal(result.resume.first_name, "John");
  assert.equal(result.resume.family_name, "Smith");
  assert.equal(result.resume.contact?.some((item) => item.label === "E-mail" && item.value === "john@example.com"), true);
  assert.equal(result.resume.contact?.some((item) => item.label === "LinkedIn"), true);
  assert.equal(result.resume.experience?.[0].company, "Globex");
  assert.equal(result.resume.experience?.[0].role, "Backend Engineer");
  assert.equal(result.resume.experience?.[0].period, "2019-01 – 2022-06");
  assert.equal(result.resume.education?.[0].school, "MIT");
  assert.equal(result.resume.languages?.[0].name, "German");
  assert.equal(result.resume.languages?.[0].level, 5);
  assert.match(result.warnings[0], /JSON Resume/);
});

test("falls back to generic key-alias guessing for an unrecognised YAML shape", () => {
  const yamlText = `
full_name: Alex Doe
email: alex@example.com
experience:
  - role: Consultant
    employer: Foo Corp
    start: "2018"
    end: "2020"
skills:
  - Python
  - SQL
`;

  const result = parseYamlCv(yamlText);
  assert.equal(result.resume.first_name, "Alex");
  assert.equal(result.resume.family_name, "Doe");
  assert.equal(result.resume.contact?.[0].label, "E-mail");
  assert.equal(result.resume.experience?.[0].company, "Foo Corp");
  assert.equal(result.resume.experience?.[0].role, "Consultant");
  assert.deepEqual(result.resume.skills?.map((skill) => skill.name), ["Python", "SQL"]);
  assert.match(result.warnings[0], /did not match a known CV schema/);
});

test("rejects invalid YAML and non-object documents without throwing", () => {
  assert.deepEqual(parseYamlCv("not: [valid yaml").resume, {});
  assert.match(parseYamlCv("not: [valid yaml").warnings[0], /not valid YAML/);

  const listResult = parseYamlCv("- one\n- two");
  assert.match(listResult.warnings[0], /does not contain a CV record/);
});

test("a merge-key bomb is rejected instead of expanded (GHSA-h67p-54hq-rp68 shape)", () => {
  const bomb = `
base: &base
  a: 1
  b: 2
  c: 3
list:
  - <<: [*base, *base, *base, *base, *base, *base, *base, *base, *base, *base,
         *base, *base, *base, *base, *base, *base, *base, *base, *base, *base,
         *base, *base, *base, *base, *base, *base, *base, *base, *base, *base,
         *base, *base, *base, *base, *base, *base, *base, *base, *base, *base,
         *base, *base, *base, *base, *base, *base, *base, *base, *base, *base,
         *base]
`;
  const result = parseYamlCv(bomb);
  assert.equal(Object.keys(result.resume).length, 0);
  assert.match(result.warnings[0], /not valid YAML/);
});
