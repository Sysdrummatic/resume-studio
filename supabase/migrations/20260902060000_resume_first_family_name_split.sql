-- Master Resume's single `name` field is split into `first_name`/`family_name`
-- so brand-initials generation and the public person_slug can use the actual
-- given-name/surname boundary instead of guessing from word position. This is
-- the best time to do it: no real users yet, only test accounts, and the app
-- normalizer already falls back to splitting a legacy `name` field on read,
-- so existing stored documents keep working without a backfill.

create or replace function public.default_resume_yaml(input_name text default 'New User'::text)
 returns text
 language plpgsql
 immutable
as $function$
declare
  safe_name text := coalesce(nullif(btrim(input_name), ''), 'New User');
  space_pos int := position(' ' in safe_name);
  first_part text;
  family_part text;
begin
  if space_pos > 0 then
    first_part := btrim(substring(safe_name from 1 for space_pos - 1));
    family_part := btrim(substring(safe_name from space_pos + 1));
  else
    first_part := safe_name;
    family_part := '';
  end if;

  return concat(
    'brand_initials: ""', E'\n',
    'first_name: ', to_jsonb(first_part)::text, E'\n',
    'family_name: ', to_jsonb(family_part)::text, E'\n',
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
$function$;

create or replace function public.validate_resume_document_yaml(input_yaml text)
 returns boolean
 language plpgsql
 stable
as $function$
declare
  required_key text;
  required_keys text[] := array[
    'brand_initials',
    'first_name',
    'family_name',
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
$function$;
