import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("resume language switcher implements full-name and compact locale display rules", () => {
  const source = read("app/components/resume-language-switcher.tsx");
  const styles = read("app/globals.css");

  assert.equal(source.includes("export function getLanguageDisplayLabel"), true);
  assert.equal(source.includes("totalLanguages <= 2"), true);
  assert.equal(source.includes("option.shortLabel || option.code.slice(0, 2).toUpperCase()"), true);
  assert.equal(source.includes("resume-language-switcher"), true);
  assert.equal(source.includes("aria-current={isActive ? \"true\" : undefined}"), true);
  assert.equal(source.includes("aria-pressed={isActive}"), true);
  assert.equal(source.includes("aria-busy={isBusy ? \"true\" : undefined}"), true);
  assert.equal(styles.includes(".resume-language-switcher,"), true);
  assert.equal(styles.includes(".resume-language-switcher__option,"), true);
  assert.equal(styles.includes("min-height: calc(var(--chip-font-size) + (2 * var(--chip-padding-y)))"), true);
});

test("resume badges support public draft and ai generated states", () => {
  const source = read("app/components/resume-badges.tsx");
  const styles = read("app/globals.css");

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
  const basicResume = read("app/components/resume-renderer/BasicResumeDocument.tsx");
  const renderer = read("app/components/resume-renderer/ResumeRenderer.tsx");
  const publicRoute = read("app/r/[slug]/page.tsx");

  assert.equal(sample.includes("BasicResumeDocument"), true);
  assert.equal(sample.includes("import ResumeRenderer"), false, "resume-view-client must not import ResumeRenderer directly");
  assert.equal(basicResume.includes("ResumeRenderer"), true);
  assert.equal(renderer.includes("ResumeLanguageSwitcher"), true);
  assert.equal(renderer.includes("ResumeBadges"), true);
  assert.equal(publicRoute.includes("searchParams"), true);
  assert.equal(publicRoute.includes("lang"), true);
  assert.equal(basicResume.includes('disabledReason: "Available after publish"'), true);
});

test("master resume preview receives all editor language options for in-CV language badges", () => {
  const editor = read("app/master-resume/editor-canvas-client.tsx");
  const preview = read("app/master-resume/resume-live-preview.tsx");
  const basicResume = read("app/components/resume-renderer/BasicResumeDocument.tsx");
  const switcher = read("app/components/resume-language-switcher.tsx");

  assert.equal(basicResume.includes("languages?: ResumeLanguageOption[]"), true);
  assert.equal(basicResume.includes("onLanguageSelect?: (locale: string) => void"), true);
  assert.equal(editor.includes("languages={languageOptions.map"), true);
  assert.equal(editor.includes("onLanguageSelect={handleLocaleSwitch}"), true);
  assert.equal(basicResume.includes("const languageOptions = languages?.length"), true);
  assert.equal(basicResume.includes("languages={languageOptions}"), true);
  assert.equal(switcher.includes("event.stopPropagation()"), true);
});

test("resume visual shell keeps full-width hero, capsule badges, and centered timeline dots", () => {
  const resumeStyles = read("app/resume/resume.css");
  const sharedStyles = read("app/globals.css");

  assert.equal(resumeStyles.includes("inline-size: calc(100% + (2 * var(--space-lg)))"), true);
  assert.equal(resumeStyles.includes("left: calc(var(--axis-position) - 1.5px)"), true);
  assert.equal(resumeStyles.includes(".hero__export-button"), true);
  assert.equal(resumeStyles.includes(".hero__export-tooltip-anchor"), true);
  assert.equal(resumeStyles.includes(".hero__export-tooltip"), true);
  assert.equal(resumeStyles.includes(".resume-editor-basic .timeline"), true);
  assert.equal(sharedStyles.includes(".resume-language-switcher,"), true);
  assert.equal(sharedStyles.includes(".resume-badge,"), true);
  assert.equal(sharedStyles.includes("font-size: var(--chip-font-size);"), true);
  assert.equal(sharedStyles.includes("box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04)"), true);
  assert.equal(sharedStyles.includes("left: calc(var(--timeline-axis-offset) - 1.5px)"), false);
});

test("disabled export actions use tooltip chrome instead of inline notes", () => {
  const renderer = read("app/components/resume-renderer/ResumeRenderer.tsx");
  const resumeStyles = read("app/resume/resume.css");

  assert.equal(renderer.includes("role=\"tooltip\""), true);
  assert.equal(renderer.includes("hero__export-tooltip-anchor"), true);
  assert.equal(renderer.includes("hero__export-note"), false);
  assert.equal(resumeStyles.includes(".hero__export-note"), false);
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
  const themeSwitch = read("app/components/app-theme-switch.tsx");

  assert.equal(layout.includes("AppLanguageMenu"), true);
  assert.equal(layout.includes("AppThemeSwitch"), true);
  assert.equal(component.includes("English"), true);
  assert.equal(component.includes("aria-label=\"Application language\""), true);
  assert.equal(themeSwitch.includes("Application theme:"), true);
  assert.equal(themeSwitch.includes("Soon"), false);
  assert.equal(themeSwitch.includes("app-theme-switch__meta"), false);
  assert.equal(themeSwitch.includes("app-theme-switch__status"), false);
});
