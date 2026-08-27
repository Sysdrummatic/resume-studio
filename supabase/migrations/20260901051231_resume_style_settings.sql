-- Phase 2, step A: per-document CV style settings.
--
-- Holds the user's Style tab choices (text size, density, detail toggles) for
-- the working Master Resume document, one row per language version — the same
-- place `allow_indexing` and `ai_generated` already live, because all three are
-- document-level presentation settings rather than CV content. Keeping them out
-- of `yaml_content` matters: that column is the OpenCV data format (ADR
-- 0002/0008) and must stay a portable description of the person, not of how one
-- app chose to draw them.
--
-- The default is an empty object rather than a populated one so that
-- `normalizeResumeStyle()` (app/lib/resume-style.ts) stays the single place the
-- defaults are defined. Every existing row therefore keeps rendering exactly as
-- it does today.

alter table public.resume_documents
  add column if not exists style_settings jsonb not null default '{}'::jsonb;

-- Guards the shape only. The individual keys are deliberately not constrained:
-- the application normalises unknown or missing values, and a strict check here
-- would turn any future style option into a migration-blocking schema change.
alter table public.resume_documents
  drop constraint if exists resume_documents_style_settings_object;

alter table public.resume_documents
  add constraint resume_documents_style_settings_object
  check (jsonb_typeof(style_settings) = 'object');

comment on column public.resume_documents.style_settings is
  'CV style settings (text size, density, detail toggles). Shape normalised by app/lib/resume-style.ts; {} means "all defaults".';
