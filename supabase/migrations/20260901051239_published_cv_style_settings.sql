-- Phase 2, step B: carry the CV style into published snapshots.
--
-- A published CV is a frozen copy, so the public link and its PDF/ATS exports
-- must not read style from the still-editable document — a later edit in the
-- editor would then silently restyle a CV somebody had already shared. The
-- style therefore travels with the snapshot, exactly like `selection` and
-- `labels` already do.
--
-- Snapshot rows stay immutable: `prevent_published_cv_mutation()` rejects every
-- UPDATE except nulling the source-pointer columns (see
-- 20260717000000_allow_snapshot_source_detach.sql). This column is written once
-- at INSERT time, which that trigger has always allowed, so no trigger change is
-- needed.
--
-- Existing snapshots default to '{}', which `normalizeResumeStyle()` reads as
-- "all defaults" — every CV published before this migration keeps rendering
-- exactly as it does today.

alter table public.resume_published_cv_locales
  add column if not exists style_settings jsonb not null default '{}'::jsonb;

alter table public.resume_published_cv_locales
  drop constraint if exists resume_published_cv_locales_style_settings_object;

alter table public.resume_published_cv_locales
  add constraint resume_published_cv_locales_style_settings_object
  check (jsonb_typeof(style_settings) = 'object');

comment on column public.resume_published_cv_locales.style_settings is
  'Frozen copy of the document style at publish time. Shape normalised by app/lib/resume-style.ts; {} means "all defaults".';
