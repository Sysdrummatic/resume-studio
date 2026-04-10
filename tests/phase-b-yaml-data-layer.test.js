const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createEmptyResumeDocument,
  coerceLegacyResumeData,
  validateResumeDocumentShape,
  validateResumeYamlContent,
  serializeResumeDocument,
} = require("../scripts/phase-b/resume-yaml-contract");

const { buildMigrationPlan, buildDryRunReport, generateSqlBackfill } = require("../scripts/phase-b/legacy-data-migrator");

test("empty resume template is schema-valid", () => {
  const template = createEmptyResumeDocument("Ariana Holt");
  const validation = validateResumeDocumentShape(template);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
});

test("legacy JSON payload is coerced into canonical YAML schema", () => {
  const legacy = {
    personal: {
      name: "Ariana Holt",
      headline: "Lead Product Scientist",
      email: "ariana.holt@example.com",
      location: "Portland, OR",
    },
    summary: "Building humane AI products.",
    skills: ["UX research", { name: "Experimentation", level: 5 }],
    experience: [
      {
        company: "Nova Labs",
        title: "Lead Product Scientist",
        period: "2022-now",
        highlights: ["Built experimentation platform"],
      },
    ],
  };

  const canonical = coerceLegacyResumeData(legacy, { fallbackName: "Fallback Name" });
  assert.equal(canonical.name, "Ariana Holt");
  assert.equal(canonical.role, "Lead Product Scientist");
  assert.equal(Array.isArray(canonical.contact), true);
  assert.equal(canonical.skills.length, 2);
  assert.equal(canonical.experience.length, 1);

  const yaml = serializeResumeDocument(canonical);
  const yamlValidation = validateResumeYamlContent(yaml);
  assert.equal(yamlValidation.valid, true);
});

test("invalid YAML payload reports schema and parse failures", () => {
  const missingKeys = `
name: "No Arrays"
summary: "Missing required keys"
`;

  const malformed = `
name: "Broken
role: "Invalid
`;

  const missingValidation = validateResumeYamlContent(missingKeys);
  assert.equal(missingValidation.valid, false);
  assert.equal(missingValidation.errors.some((message) => message.includes("brand_initials")), true);

  const malformedValidation = validateResumeYamlContent(malformed);
  assert.equal(malformedValidation.valid, false);
  assert.equal(malformedValidation.errors[0].startsWith("YAML parse error:"), true);
});

test("migration plan creates EN/PL documents, revisions, and links", () => {
  const snapshot = {
    profiles: [
      {
        id: "ac0ea445-1f3f-42dc-a81b-4bec690528b6",
        email: "opencvproject+testuser@proton.me",
        display_name: "Test User",
      },
    ],
    resumes: [
      {
        id: "9d759ef1-c67f-46bf-a813-1db381c86b12",
        user_id: "ac0ea445-1f3f-42dc-a81b-4bec690528b6",
        title: "Master resume",
        locale: "en",
        is_public: true,
        allow_indexing: false,
        slug: "r-test-user",
        data: {
          name: "Ariana Holt",
          role: "Lead Product Scientist",
          summary: "Testing migration path.",
          contact: [{ label: "Email", value: "ariana.holt@example.com" }],
          qr_codes: [],
          skills: [],
          tech_stack: [],
          languages: [],
          interests: [],
          experience: [],
          education: [],
          courses: [],
        },
      },
    ],
    public_links: [
      {
        resume_id: "9d759ef1-c67f-46bf-a813-1db381c86b12",
        slug: "r-test-user",
        is_active: true,
        allow_indexing: false,
        view_count: 7,
      },
    ],
  };

  const plan = buildMigrationPlan(snapshot);
  assert.equal(plan.metrics.users_in_scope, 1);
  assert.equal(plan.metrics.migrated_documents, 2);
  assert.equal(plan.metrics.generated_default_documents, 1);
  assert.equal(plan.metrics.migrated_revisions, 2);
  assert.equal(plan.metrics.migrated_links >= 1, true);

  const report = buildDryRunReport(plan);
  assert.equal(typeof report.generated_at, "string");
  assert.equal(Array.isArray(report.warnings), true);

  const sql = generateSqlBackfill(plan);
  assert.equal(sql.includes("insert into public.resume_documents"), true);
  assert.equal(sql.includes("insert into public.resume_revisions"), true);
  assert.equal(sql.includes("insert into public.resume_public_links"), true);
  assert.equal(sql.includes("commit;"), true);
});
