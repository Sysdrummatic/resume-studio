import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("resume language switcher implements full-name and compact locale display rules", () => {
  const source = read("app/components/resume-language-switcher.tsx");

  assert.equal(source.includes("export function getLanguageDisplayLabel"), true);
  assert.equal(source.includes("totalLanguages <= 2"), true);
  assert.equal(source.includes("option.shortLabel || option.code.slice(0, 2).toUpperCase()"), true);
  assert.equal(source.includes("aria-current={isActive ? \"true\" : undefined}"), true);
});

test("resume badges support public draft and ai generated states", () => {
  const source = read("app/components/resume-badges.tsx");
  const styles = read("app/resume/resume.css");

  assert.equal(source.includes('status: "public" | "draft"'), true);
  assert.equal(source.includes("aiGenerated"), true);
  assert.equal(source.includes("AI generated"), true);
  assert.equal(styles.includes(".resume-badges"), true);
  assert.equal(styles.includes(".resume-badge--ai"), true);
  assert.equal(styles.includes(".resume-badge--draft"), true);
});

test("resume renderers use shared language switcher and badges", () => {
  const sample = read("app/resume/resume-view-client.tsx");
  const preview = read("app/master-resume/resume-live-preview.tsx");
  const publicRoute = read("app/r/[slug]/page.tsx");

  assert.equal(sample.includes("ResumeLanguageSwitcher"), true);
  assert.equal(sample.includes("ResumeBadges"), true);
  assert.equal(preview.includes("ResumeLanguageSwitcher"), true);
  assert.equal(preview.includes("ResumeBadges"), true);
  assert.equal(publicRoute.includes("searchParams"), true);
  assert.equal(publicRoute.includes("lang"), true);
});

test("Supabase migration prepares multilingual CV metadata", () => {
  const migration = read("supabase/migrations/20260506_resume_language_metadata.sql");
  const server = read("app/lib/resume-server.ts");

  assert.equal(migration.includes("create table if not exists public.resume_languages"), true);
  assert.equal(migration.includes("create table if not exists public.resume_preset_variants"), true);
  assert.equal(migration.includes("add column if not exists ai_generated boolean not null default false"), true);
  assert.equal(migration.includes("add column if not exists default_locale text not null default 'en'"), true);
  assert.equal(server.includes("ai_generated"), true);
  assert.equal(server.includes("default_locale"), true);
});

test("app header exposes a future-ready application language menu", () => {
  const layout = read("app/layout.tsx");
  const component = read("app/components/app-language-menu.tsx");

  assert.equal(layout.includes("AppLanguageMenu"), true);
  assert.equal(component.includes("English"), true);
  assert.equal(component.includes("aria-label=\"Application language\""), true);
});
