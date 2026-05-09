const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");

function normalizeSql(sql) {
  return sql.toLowerCase().replace(/\s+/g, " ").trim();
}

function loadMigrations() {
  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => {
      const sql = fs.readFileSync(path.join(migrationsDir, fileName), "utf8");
      return {
        fileName,
        sql,
        normalized: normalizeSql(sql),
      };
    });
}

function migrationContaining(...needles) {
  return loadMigrations().find((migration) =>
    needles.every((needle) => migration.normalized.includes(needle.toLowerCase())),
  );
}

function assertHasSql(needle, message) {
  const migration = migrationContaining(needle);
  assert.ok(migration, message ?? `Expected a migration containing: ${needle}`);
  return migration;
}

function assertHasMigrationContaining(needles, message) {
  const migration = migrationContaining(...needles);
  assert.ok(migration, message ?? `Expected a migration containing: ${needles.join(", ")}`);
  return migration;
}

function assertMigrationHas(migration, needle, message) {
  assert.ok(
    migration.normalized.includes(needle.toLowerCase()),
    `${migration.fileName}: ${message ?? `expected SQL containing: ${needle}`}`,
  );
}

function assertMigrationMatches(migration, pattern, message) {
  assert.ok(pattern.test(migration.normalized), `${migration.fileName}: ${message}`);
}

function findPublishedSnapshotMigration() {
  const candidates = [
    "create table if not exists public.resume_published_cvs",
    "create table public.resume_published_cvs",
    "create table if not exists public.published_cvs",
    "create table public.published_cvs",
    "create table if not exists public.resume_publication_snapshots",
    "create table public.resume_publication_snapshots",
  ];

  return loadMigrations().find((migration) =>
    candidates.some((candidate) => migration.normalized.includes(candidate)),
  );
}

test("ADR 0001 PR 1 migration adds a Published CV snapshot table for immutable public rendering", () => {
  const migration = findPublishedSnapshotMigration();

  assert.ok(
    migration,
    "Expected ADR 0001 migration to create a Published CV snapshot table, e.g. public.resume_published_cvs.",
  );

  assertMigrationMatches(
    migration,
    /create table(?: if not exists)? public\.(resume_published_cvs|published_cvs|resume_publication_snapshots) \(/,
    "should create the Published CV snapshot table",
  );
  assertMigrationHas(migration, "yaml_content text not null", "snapshot must store the public OpenCV YAML content");
  assertMigrationHas(migration, "schema_version", "snapshot must record the OpenCV YAML schema version");
  assertMigrationHas(migration, "locale text not null", "snapshot must be locale-specific");
  assertMigrationHas(migration, "preset_id uuid", "snapshot must retain the Saved Version/resume_presets source");
  assertMigrationHas(migration, "user_id uuid", "snapshot must retain owner metadata");
  assertMigrationHas(migration, "published_at timestamptz", "snapshot must record publish time");
});

test("ADR 0001 PR 1 migration makes Published CV snapshots immutable", () => {
  const migration = findPublishedSnapshotMigration();
  assert.ok(migration, "Expected a Published CV snapshot table migration before immutability can be asserted.");

  assertMigrationMatches(
    migration,
    /create (?:or replace )?function public\.[a-z0-9_]*(published|snapshot|immutable|guard|prevent)[a-z0-9_]*(published|snapshot|immutable|guard|prevent)[a-z0-9_]*\(\)/,
    "should define a trigger function that guards snapshot immutability",
  );
  assertMigrationMatches(
    migration,
    /before update(?: or delete)? on public\.(resume_published_cvs|published_cvs|resume_publication_snapshots)/,
    "should reject updates to historical Published CV snapshots",
  );
  assertMigrationMatches(
    migration,
    /raise exception '[^']*(immutable|cannot update|cannot modify|historical snapshot)[^']*'/,
    "immutability trigger should fail loudly on mutation attempts",
  );
});

test("ADR 0001 PR 1 migration extends resume_public_links for canonical public URLs", () => {
  const migration = assertHasMigrationContaining(
    ["alter table public.resume_public_links", "public_id"],
    "Expected ADR 0001 migration to extend public.resume_public_links.",
  );

  assertMigrationHas(migration, "public_id text", "Public Link must own the generated public-id URL segment");
  assertMigrationMatches(
    migration,
    /(published_cv_id|published_snapshot_id|active_published_cv_id) uuid/,
    "Public Link must point at the active Published CV snapshot",
  );
  assertMigrationHas(migration, "default_locale text", "Public Link must store the default published locale");
  assertMigrationMatches(
    migration,
    /(available_locales|published_locales) text\[\]/,
    "Public Link must store the published locale set",
  );
  assertMigrationHas(migration, "revoked_at timestamptz", "Public Link must support unpublish/revoke lifecycle state");
  assertMigrationMatches(
    migration,
    /create (?:unique )?index(?: if not exists)? [a-z0-9_]*(public_id|person_slug)[a-z0-9_]* on public\.resume_public_links/,
    "Public Link must be indexed for public-id/person-slug resolution",
  );
});

test("ADR 0001 PR 1 migration adds profiles.person_slug with uniqueness and format protection", () => {
  const migration = assertHasSql(
    "person_slug",
    "Expected ADR 0001 migration to add public.profiles.person_slug.",
  );

  assertMigrationHas(migration, "alter table public.profiles", "person_slug must be added to public.profiles");
  assertMigrationHas(migration, "person_slug text", "profiles.person_slug must be a text column");
  assertMigrationMatches(
    migration,
    /create unique index(?: if not exists)? [a-z0-9_]*person_slug[a-z0-9_]* on public\.profiles/,
    "profiles.person_slug must be unique",
  );
  assertMigrationMatches(
    migration,
    /person_slug[^;]*~[^;]*'\^\[a-z0-9\](?:\+|\[a-z0-9-\]\*)/,
    "profiles.person_slug must reject unsafe URL characters",
  );
});

test("ADR 0001 PR 1 migration protects Public Link lifecycle and snapshot consistency", () => {
  const migration = assertHasMigrationContaining(
    ["alter table public.resume_public_links", "public_id"],
    "Expected ADR 0001 migration to extend public.resume_public_links.",
  );

  assertMigrationMatches(
    migration,
    /foreign key \((published_cv_id|published_snapshot_id|active_published_cv_id)\) references public\.(resume_published_cvs|published_cvs|resume_publication_snapshots)\(id\)/,
    "Public Links must not point to missing Published CV snapshots",
  );
  assertMigrationMatches(
    migration,
    /(is_active boolean|revoked_at timestamptz)/,
    "Public Links must represent active and revoked states",
  );
  assertMigrationMatches(
    migration,
    /check \([^)]*(array_length\((available_locales|published_locales), 1\)|default_locale)[^)]*\)/,
    "Public Links must constrain default/published locale integrity",
  );
});

test("ADR 0001 PR 1 migration enables RLS for new publication tables and limits anonymous reads", () => {
  const snapshotMigration = findPublishedSnapshotMigration();
  assert.ok(snapshotMigration, "Expected a Published CV snapshot table migration before RLS can be asserted.");

  assertMigrationMatches(
    snapshotMigration,
    /alter table public\.(resume_published_cvs|published_cvs|resume_publication_snapshots) enable row level security/,
    "Published CV snapshot table must have RLS enabled",
  );
  assertMigrationMatches(
    snapshotMigration,
    /create policy "[^"]*(select|read)[^"]*(active|public)[^"]*" on public\.(resume_published_cvs|published_cvs|resume_publication_snapshots)/,
    "anonymous/public reads must be constrained to active public snapshots",
  );

  const combinedSql = normalizeSql(loadMigrations().map((migration) => migration.sql).join("\n"));
  assert.ok(
    /create policy "[^"]*(select|read)[^"]*(active|public)[^"]*" on public\.resume_public_links/.test(
      combinedSql,
    ),
    "resume_public_links must keep an active-link public read policy",
  );
});

test("ADR 0001 PR 1 migration keeps legacy resume_presets.slug during compatibility rollout", () => {
  const combinedSql = normalizeSql(loadMigrations().map((migration) => migration.sql).join("\n"));

  assert.equal(
    /alter table public\.resume_presets drop column(?: if exists)? slug/.test(combinedSql),
    false,
    "ADR 0001 PR 1 must not drop legacy resume_presets.slug.",
  );
  assert.equal(
    /drop index(?: if exists)? resume_presets_slug_idx/.test(combinedSql),
    false,
    "ADR 0001 PR 1 must not remove the legacy resume_presets.slug index.",
  );
  assert.ok(
    /slug text unique/.test(combinedSql) || /resume_presets_slug_idx/.test(combinedSql),
    "Existing resume_presets.slug compatibility contract should remain visible in migrations.",
  );
});
