import test from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./helpers/ts-extension-resolve.mjs", import.meta.url);

const { parseYamlCv } = await import("../app/lib/resume-import/parse-yaml-cv.ts");

test("recognises OpenCiVera's own schema and normalizes it losslessly", () => {
  const yamlText = `
brand_initials: "JD"
name: "Jane Doe"
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
  assert.equal(result.resume.name, "Jane Doe");
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
  assert.equal(result.resume.name, "John Smith");
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
  assert.equal(result.resume.name, "Alex Doe");
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
