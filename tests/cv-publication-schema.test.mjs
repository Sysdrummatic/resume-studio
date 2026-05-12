import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260508_cv_publication_foundation.sql",
);

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function migration() {
  return fs.readFileSync(migrationPath, "utf8");
}

test("ADR 0001 documents the publication domain model and test contracts", () => {
  const adr = read("docs/adr/0001-cv-publication-model.md");
  const contracts = read("docs/guides/cv-publication-test-contracts.md");

  assert.equal(adr.includes("Saved Version"), true);
  assert.equal(adr.includes("Published CV"), true);
  assert.equal(adr.includes("Public Link"), true);
  assert.equal(adr.includes("OpenCV YAML"), true);
  assert.equal(adr.includes("/{person-slug}/{public-id}?lang=pl"), true);

  for (const heading of [
    "Publish Contract",
    "Draft Isolation Contract",
    "Public Link Lifecycle Contract",
    "Public Read Contract",
    "Locale Contract",
    "SEO And Indexing Contract",
    "Authorization Contract",
    "RLS And Service Role Contract",
    "Compatibility Contract",
  ]) {
    assert.equal(contracts.includes(`## ${heading}`), true);
  }
});

test("publication foundation migration adds person slugs and immutable snapshot tables", () => {
  const sql = migration();

  assert.equal(sql.includes("add column if not exists person_slug text"), true);
  assert.equal(sql.includes("profiles_person_slug_format"), true);
  assert.equal(sql.includes("profiles_person_slug_unique_idx"), true);
  assert.equal(sql.includes("create table if not exists public.resume_published_cvs"), true);
  assert.equal(sql.includes("create table if not exists public.resume_published_cv_locales"), true);
  assert.equal(sql.includes("open_cv_yaml_contract_version text not null default '1'"), true);
  assert.equal(sql.includes("published_locales text[] not null default array[]::text[]"), true);
  assert.equal(sql.includes("yaml_content text not null"), true);
  assert.equal(sql.includes("resume_published_cv_locales_unique_locale"), true);
  assert.equal(sql.includes("prevent_published_cv_mutation"), true);
  assert.equal(sql.includes("before update or delete on public.resume_published_cvs"), true);
  assert.equal(sql.includes("before update or delete on public.resume_published_cv_locales"), true);
});

test("publication foundation extends resume_public_links without removing legacy preset slugs", () => {
  const sql = migration();
  const presetMigration = read("supabase/migrations/20260505_resume_presets.sql");

  assert.equal(presetMigration.includes("slug text unique"), true);
  assert.equal(sql.includes("alter table public.resume_public_links"), true);
  assert.equal(sql.includes("add column if not exists user_id uuid"), true);
  assert.equal(sql.includes("add column if not exists preset_id uuid"), true);
  assert.equal(sql.includes("add column if not exists person_slug text"), true);
  assert.equal(sql.includes("add column if not exists public_id text"), true);
  assert.equal(sql.includes("add column if not exists active_published_cv_id uuid"), true);
  assert.equal(sql.includes("add column if not exists default_locale text"), true);
  assert.equal(sql.includes("add column if not exists available_locales text[]"), true);
  assert.equal(sql.includes("add column if not exists status text not null default 'active'"), true);
  assert.equal(sql.includes("add column if not exists revoked_at timestamptz"), true);
  assert.equal(sql.includes("add column if not exists published_at timestamptz"), true);
  assert.equal(sql.includes("add column if not exists legacy_slug text"), true);
  assert.equal(sql.includes("resume_public_links_active_published_cv_fk"), true);
  assert.equal(sql.includes("resume_public_links_person_public_unique_idx"), true);
  assert.equal(sql.includes("resume_public_links_legacy_slug_idx"), true);
});

test("publication foundation defines RLS around active public snapshots and owner metadata", () => {
  const sql = migration();

  assert.equal(sql.includes("alter table public.resume_published_cvs enable row level security"), true);
  assert.equal(sql.includes("alter table public.resume_published_cv_locales enable row level security"), true);
  assert.equal(sql.includes("resume_published_cvs_select_owner"), true);
  assert.equal(sql.includes("resume_published_cvs_select_active_public"), true);
  assert.equal(sql.includes("resume_published_cv_locales_select_owner"), true);
  assert.equal(sql.includes("resume_published_cv_locales_select_active_public"), true);
  assert.equal(sql.includes("pl.active_published_cv_id = resume_published_cvs.id"), true);
  assert.equal(sql.includes("resume_published_cv_locales.locale = any(pl.available_locales)"), true);
  assert.equal(sql.includes("resume_public_links_select_owner_by_user"), true);
  assert.equal(sql.includes("resume_public_links_insert_owner_by_user"), true);
  assert.equal(sql.includes("resume_public_links_update_owner_by_user"), true);
});

test("publication foundation is additive and keeps current public route runtime untouched", () => {
  const sql = migration();
  const publicRoute = read("app/r/[slug]/page.tsx");

  assert.equal(sql.includes("drop table"), false);
  assert.equal(sql.includes("drop column"), false);
  assert.equal(sql.includes("drop policy if exists \"resume_presets"), false);
  assert.equal(publicRoute.includes("fetchPublishedResumePresetBySlug"), true);
});
