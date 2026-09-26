-- A saved CV version without its own style publishes with its document's style.
--
-- 20260919010000 made the preset style authoritative for every snapshot, but a
-- preset that never received a style has the column default '{}', and
-- coalesce('{}', document style) picked the empty object. Code that predates
-- per-version styles never writes one, so while that code is still deployed
-- after the migration, every new version would publish with the application
-- defaults instead of its document's style. This supersedes the "application
-- defaults" note on resume_presets.style_settings from 20260919000000; the app
-- applies the same fallback through presetStyleSource() in resume-style.ts.

create or replace function public.apply_resume_preset_style_to_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  preset_style jsonb;
begin
  select nullif(p.style_settings, '{}'::jsonb)
  into preset_style
  from public.resume_published_cvs pcv
  left join public.resume_presets p on p.id = pcv.preset_id
  where pcv.id = new.published_cv_id;

  new.style_settings := coalesce(preset_style, new.style_settings, '{}'::jsonb);
  return new;
end;
$$;

revoke all on function public.apply_resume_preset_style_to_snapshot() from public, anon, authenticated;

comment on column public.resume_presets.style_settings is
  'Presentation settings owned by this saved CV version; ''{}'' means none of its own, so its document''s style applies. Shape is normalised by app/lib/resume-style.ts.';
