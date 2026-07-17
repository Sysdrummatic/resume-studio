create or replace function public.build_empty_resume_yaml(fallback_name text default 'New User')
returns text
language plpgsql
stable
as $$
declare
  safe_name text := coalesce(nullif(btrim(fallback_name), ''), 'New User');
begin
  return concat(
    'brand_initials: ""', E'\n',
    'name: ', to_jsonb(safe_name)::text, E'\n',
    'role: ""', E'\n',
    'summary:', E'\n',
    '  - position: ""', E'\n',
    '    description: ""', E'\n',
    '    default: true', E'\n',
    'contact: []', E'\n',
    'qr_codes: []', E'\n',
    'skills: []', E'\n',
    'tech_stack: []', E'\n',
    'languages: []', E'\n',
    'interests: []', E'\n',
    'experience: []', E'\n',
    'education: []', E'\n',
    'courses: []', E'\n'
  );
end;
$$;

create or replace function public.coerce_legacy_resume_to_yaml(input_data jsonb, fallback_name text default 'New User')
returns text
language plpgsql
stable
as $$
declare
  payload jsonb := coalesce(input_data, '{}'::jsonb);
  name_value text;
  role_value text;
  summary_value text;
  summary_payload jsonb;
  initials_value text;
begin
  name_value := coalesce(
    nullif(payload ->> 'name', ''),
    nullif(payload #>> '{personal,name}', ''),
    fallback_name,
    'New User'
  );
  role_value := coalesce(
    nullif(payload ->> 'role', ''),
    nullif(payload #>> '{personal,headline}', ''),
    ''
  );
  summary_value := coalesce(nullif(payload ->> 'summary', ''), nullif(payload #>> '{personal,summary}', ''), '');
  summary_payload := case
    when jsonb_typeof(payload -> 'summary') = 'array' then payload -> 'summary'
    when summary_value <> '' then jsonb_build_array(jsonb_build_object('position', 'Default', 'description', summary_value, 'default', true))
    else '[]'::jsonb
  end;
  initials_value := coalesce(
    nullif(payload ->> 'brand_initials', ''),
    upper(left(regexp_replace(name_value, '[^A-Za-z ]', '', 'g'), 2)),
    ''
  );

  return concat(
    'brand_initials: ', to_jsonb(initials_value)::text, E'\n',
    'name: ', to_jsonb(name_value)::text, E'\n',
    'role: ', to_jsonb(role_value)::text, E'\n',
    'summary: ', summary_payload::text, E'\n',
    'contact: ', coalesce((payload -> 'contact')::text, '[]'), E'\n',
    'qr_codes: ', coalesce((payload -> 'qr_codes')::text, '[]'), E'\n',
    'skills: ', coalesce((payload -> 'skills')::text, '[]'), E'\n',
    'tech_stack: ', coalesce((payload -> 'tech_stack')::text, '[]'), E'\n',
    'languages: ', coalesce((payload -> 'languages')::text, '[]'), E'\n',
    'interests: ', coalesce((payload -> 'interests')::text, '[]'), E'\n',
    'experience: ', coalesce((payload -> 'experience')::text, '[]'), E'\n',
    'education: ', coalesce((payload -> 'education')::text, '[]'), E'\n',
    'courses: ', coalesce((payload -> 'courses')::text, '[]'), E'\n'
  );
end;
$$;
