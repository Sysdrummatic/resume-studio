-- Existing documents and immutable revisions can still contain the legacy
-- name field. Accept that complete shape for rollback and metadata updates;
-- application save/import boundaries upgrade it to first_name/family_name.
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
  has_first_name boolean;
  has_family_name boolean;
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

  has_first_name := input_yaml ~ '(?m)^first_name\s*:';
  has_family_name := input_yaml ~ '(?m)^family_name\s*:';

  return (has_first_name and has_family_name)
    or (not has_first_name and not has_family_name and input_yaml ~ '(?m)^name\s*:');
end;
$$;

commit;
