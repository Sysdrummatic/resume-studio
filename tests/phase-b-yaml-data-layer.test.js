const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const {
  createEmptyResumeDocument,
  normalizeLocale,
  coerceLegacyResumeData,
  validateResumeDocumentShape,
  validateResumeYamlContent,
  serializeResumeDocument,
} = require("../public/scripts/phase-b/resume-yaml-contract");

const {
  buildMigrationPlan,
  buildDryRunReport,
  generateSqlBackfill,
  parseCliArgs,
} = require("../public/scripts/phase-b/legacy-data-migrator");

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
  assert.deepEqual(canonical.summary, [{ position: "Default", description: "Building humane AI products.", default: true }]);
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

test("normalizeLocale handles BCP47-like values and unsupported locales", () => {
  assert.equal(normalizeLocale("PL_pl"), "pl");
  assert.equal(normalizeLocale("en-US"), "en");
  assert.equal(normalizeLocale("de-DE"), "de");
  assert.equal(normalizeLocale(null), "en");
});

test("createEmptyResumeDocument keeps Unicode initials for localized names", () => {
  const template = createEmptyResumeDocument("Łukasz Żółć");
  assert.equal(template.brand_initials, "ŁŻ");
});

test("coerceLegacyResumeData drops incomplete qr_codes entries", () => {
  const canonical = coerceLegacyResumeData(
    {
      name: "Ariana Holt",
      qr_codes: [
        { label: "Profile only label" },
        { image: "/images/qr.png" },
        { label: "LinkedIn", image: "/images/linkedin.png", size: 140 },
      ],
    },
    { fallbackName: "Fallback Name" },
  );

  assert.equal(canonical.qr_codes.length, 1);
  assert.deepEqual(canonical.qr_codes[0], { label: "LinkedIn", image: "/images/linkedin.png", size: 140 });
});

test("validateResumeDocumentShape rejects non-string experience highlights items", () => {
  const template = createEmptyResumeDocument("Ariana Holt");
  template.experience = [
    {
      period: "2022-2026",
      company: "Nova Labs",
      role: "Lead Product Scientist",
      highlights: ["Delivered launch", 123],
    },
  ];

  const validation = validateResumeDocumentShape(template);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors.some((message) => message.includes("experience[0].highlights[1]")), true);
});

test("migration plan keeps the newest duplicate locale and creates unique fallback slugs", () => {
  const snapshot = {
    profiles: [
      { id: "user-alpha", email: "alpha@example.com" },
      { id: "user_alpha", email: "beta@example.com" },
    ],
    resumes: [
      {
        id: "legacy-older",
        user_id: "user-alpha",
        locale: "en",
        title: "Old Title",
        updated_at: "2026-01-01T00:00:00Z",
        data: { name: "Alpha Candidate" },
      },
      {
        id: "legacy-newer",
        user_id: "user-alpha",
        locale: "en",
        title: "New Title",
        updated_at: "2026-03-01T00:00:00Z",
        data: { name: "Alpha Candidate" },
      },
    ],
    public_links: [],
  };

  const plan = buildMigrationPlan(snapshot);
  const alphaEnDocument = plan.documents.find((document) => document.user_id === "user-alpha" && document.locale === "en");
  assert.ok(alphaEnDocument);
  assert.equal(alphaEnDocument.title, "New Title");
  assert.equal(plan.metrics.duplicate_locale_conflicts, 1);
  assert.equal(plan.warnings.some((warning) => warning.includes("Duplicate locale document for user-alpha:en")), true);

  const enLinks = plan.links.filter((link) => link.locale === "en");
  assert.equal(enLinks.length, 2);
  assert.equal(new Set(enLinks.map((link) => link.slug)).size, 2);
});

test("generateSqlBackfill escapes apostrophes and avoids dollar-tag collisions", () => {
  const yamlWithTagCollision = `name: "O'Connor"\nsummary: "$yaml0$ already present"\n`;
  const plan = {
    documents: [
      {
        user_id: "user-1",
        locale: "en",
        title: "O'Connor CV",
        yaml_content: yamlWithTagCollision,
        schema_version: 1,
        is_public: true,
        allow_indexing: false,
        created_by: "user-1",
        legacy_resume_id: "legacy-1",
      },
    ],
    revisions: [],
    links: [],
  };

  const sql = generateSqlBackfill(plan);
  assert.equal(sql.includes("O''Connor CV"), true);
  assert.equal(sql.includes("$yaml1$"), true);
});

test("parseCliArgs keeps defaults and applies overrides", () => {
  const defaults = parseCliArgs([]);
  assert.equal(defaults.input, "");
  assert.equal(defaults.report, path.join("reports", "phase-b-migration-dry-run.json"));
  assert.equal(defaults.sql, "");

  const custom = parseCliArgs(["--input", "snapshot.json", "--report", "reports/custom.json", "--sql", "out/backfill.sql"]);
  assert.equal(custom.input, "snapshot.json");
  assert.equal(custom.report, "reports/custom.json");
  assert.equal(custom.sql, "out/backfill.sql");
});
