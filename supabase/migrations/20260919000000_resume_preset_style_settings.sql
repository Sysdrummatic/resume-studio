-- Per-saved-version presentation settings.
--
-- A preset is the user's independently editable CV version. Its template and
-- primary colour must therefore not be read from the source Master Resume at
-- preview or publish time. The empty object keeps existing versions on the
-- application defaults until they are edited or republished.

alter table public.resume_presets
  add column if not exists style_settings jsonb not null default '{}'::jsonb;

alter table public.resume_presets
  drop constraint if exists resume_presets_style_settings_object;

alter table public.resume_presets
  add constraint resume_presets_style_settings_object
  check (jsonb_typeof(style_settings) = 'object');

comment on column public.resume_presets.style_settings is
  'Presentation settings owned by this saved CV version. Shape is normalised by app/lib/resume-style.ts.';
