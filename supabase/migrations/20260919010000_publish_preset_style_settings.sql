-- Freeze the saved CV version's appearance into its immutable publication
-- snapshot. The existing publish RPC is intentionally left byte-compatible;
-- this trigger keeps the preset-level style authoritative for every locale
-- row it inserts.

update public.resume_presets p
set style_settings = coalesce(nullif(p.style_settings, '{}'::jsonb), d.style_settings, '{}'::jsonb)
from public.resume_documents d
where d.id = p.document_id
  and p.style_settings = '{}'::jsonb;

create or replace function public.apply_resume_preset_style_to_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select coalesce(p.style_settings, new.style_settings, '{}'::jsonb)
  into new.style_settings
  from public.resume_published_cvs pcv
  left join public.resume_presets p on p.id = pcv.preset_id
  where pcv.id = new.published_cv_id;

  return new;
end;
$$;

drop trigger if exists resume_published_cv_locales_apply_preset_style
  on public.resume_published_cv_locales;

create trigger resume_published_cv_locales_apply_preset_style
before insert on public.resume_published_cv_locales
for each row
execute function public.apply_resume_preset_style_to_snapshot();

revoke all on function public.apply_resume_preset_style_to_snapshot() from public, anon, authenticated;
