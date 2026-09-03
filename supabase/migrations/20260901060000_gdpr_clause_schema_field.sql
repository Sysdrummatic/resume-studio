-- Migration: Add 'gdpr_clause' as a top-level ResumeDocument field.
-- Free text, rendered as a small footer on the CV. Both DB-side YAML helpers
-- must stay in sync with app/lib/resume-schema.ts's RESUME_REQUIRED_KEYS —
-- default_resume_yaml() seeds every new user's first document via the
-- handle_new_auth_user()/backfill triggers in 20260603000000_resume_user_locales.sql,
-- so both functions need the new key or every signup would start failing the
-- resume_documents_validate_yaml trigger.

begin;

create or replace function public.validate_resume_document_yaml(input_yaml text)
returns boolean
language plpgsql
stable
as $$
declare
  required_key text;
  required_keys text[] := array[
    'brand_initials',
    'name',
    'summary',
    'contact',
    'qr_codes',
    'skills',
    'tech_stack',
    'languages',
    'interests',
    'experience',
    'education',
    'courses',
    'gdpr_clause'
  ];
begin
  if input_yaml is null or btrim(input_yaml) = '' then
    return false;
  end if;

  if length(input_yaml) > 250000 then
    return false;
  end if;

  foreach required_key in array required_keys loop
    if input_yaml !~ format('(?m)^%s\s*:', required_key) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.default_resume_yaml(input_name text default 'New User')
returns text
language plpgsql
immutable
as $$
declare
  safe_name text := coalesce(nullif(btrim(input_name), ''), 'New User');
begin
  return concat(
    'brand_initials: ""', E'\n',
    'name: ', to_jsonb(safe_name)::text, E'\n',
    'summary: ""', E'\n',
    'contact: []', E'\n',
    'qr_codes: []', E'\n',
    'skills: []', E'\n',
    'tech_stack: []', E'\n',
    'languages: []', E'\n',
    'interests: []', E'\n',
    'experience: []', E'\n',
    'education: []', E'\n',
    'courses: []', E'\n',
    'gdpr_clause: ""'
  );
end;
$$;

commit;
