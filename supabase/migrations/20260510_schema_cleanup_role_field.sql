-- Migration: Remove redundant 'role' field from schema and existing data.
-- This aligns the database with the new 'summary[].position' based headline model.

begin;

-- 1. Update validation function to remove 'role' from required keys
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
    'courses'
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

-- 2. Update default YAML generator
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
    'courses: []'
  );
end;
$$;

-- 3. Update legacy converter
create or replace function public.legacy_resume_json_to_yaml(input_data jsonb, fallback_name text default 'New User')
returns text
language plpgsql
immutable
as $$
declare
  payload jsonb := coalesce(input_data, '{}'::jsonb);
  name_value text;
  summary_value text;
  initials_value text;
begin
  name_value := coalesce(
    nullif(payload ->> 'name', ''),
    nullif(payload #>> '{personal,name}', ''),
    fallback_name,
    'New User'
  );
  summary_value := coalesce(nullif(payload ->> 'summary', ''), '');
  initials_value := coalesce(
    nullif(payload ->> 'brand_initials', ''),
    upper(left(regexp_replace(name_value, '[^A-Za-z ]', '', 'g'), 2)),
    ''
  );

  return concat(
    'brand_initials: ', to_jsonb(initials_value)::text, E'\n',
    'name: ', to_jsonb(name_value)::text, E'\n',
    'summary: ', to_jsonb(summary_value)::text, E'\n',
    'contact: ', coalesce((payload -> 'contact')::text, '[]'), E'\n',
    'qr_codes: ', coalesce((payload -> 'qr_codes')::text, '[]'), E'\n',
    'skills: ', coalesce((payload -> 'skills')::text, '[]'), E'\n',
    'tech_stack: ', coalesce((payload -> 'tech_stack')::text, '[]'), E'\n',
    'languages: ', coalesce((payload -> 'languages')::text, '[]'), E'\n',
    'interests: ', coalesce((payload -> 'interests')::text, '[]'), E'\n',
    'experience: ', coalesce((payload -> 'experience')::text, '[]'), E'\n',
    'education: ', coalesce((payload -> 'education')::text, '[]'), E'\n',
    'courses: ', coalesce((payload -> 'courses')::text, '[]')
  );
end;
$$;

-- 4. Data Cleanup: Remove 'role' field from existing YAML content
-- We use regexp_replace with the 'g' and 'm' (multiline) flags.
-- It matches '^role: ...' and replaces it with nothing, effectively removing the line.

update public.resume_documents
set yaml_content = regexp_replace(yaml_content, '(?m)^role\s*:.*(\r?\n|$)', '', 'g');

update public.resume_revisions
set yaml_content = regexp_replace(yaml_content, '(?m)^role\s*:.*(\r?\n|$)', '', 'g');

update public.resume_published_cv_locales
set yaml_content = regexp_replace(yaml_content, '(?m)^role\s*:.*(\r?\n|$)', '', 'g');

commit;
