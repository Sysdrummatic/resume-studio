-- Phase D iteration: YAML template-backed editor model.
-- Adds YAML template/content storage for each master resume.

begin;

create or replace function public.default_resume_template_yaml()
returns text
language sql
stable
as $$
  select trim(
    both E'\n'
    from $yaml$
brand_initials: ""
name: ""
role: ""
summary: ""
contact: []
qr_codes: []
skills: []
tech_stack: []
languages: []
interests: []
experience: []
education: []
courses: []
$yaml$
  );
$$;

alter table public.resumes
  add column if not exists template_yaml text,
  add column if not exists content_yaml text;

alter table public.resumes
  alter column template_yaml set default public.default_resume_template_yaml(),
  alter column content_yaml set default public.default_resume_template_yaml();

update public.resumes
set template_yaml = public.default_resume_template_yaml()
where template_yaml is null or btrim(template_yaml) = '';

update public.resumes
set content_yaml = public.default_resume_template_yaml()
where content_yaml is null or btrim(content_yaml) = '';

create or replace function public.seed_user_master_resume()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  master_resume_id uuid;
begin
  insert into public.resumes (
    user_id,
    title,
    slug,
    locale,
    data,
    is_public,
    allow_indexing,
    template_yaml,
    content_yaml
  )
  values (
    new.id,
    'Master resume',
    public.generate_slug('cv-'),
    'en',
    jsonb_build_object(
      'brand_initials', '',
      'name', '',
      'role', '',
      'summary', '',
      'contact', jsonb_build_array(),
      'qr_codes', jsonb_build_array(),
      'skills', jsonb_build_array(),
      'tech_stack', jsonb_build_array(),
      'languages', jsonb_build_array(),
      'interests', jsonb_build_array(),
      'experience', jsonb_build_array(),
      'education', jsonb_build_array(),
      'courses', jsonb_build_array()
    ),
    true,
    false,
    public.default_resume_template_yaml(),
    public.default_resume_template_yaml()
  )
  on conflict (user_id) do update
  set updated_at = now(),
      template_yaml = coalesce(public.resumes.template_yaml, public.default_resume_template_yaml()),
      content_yaml = coalesce(public.resumes.content_yaml, public.default_resume_template_yaml())
  returning id into master_resume_id;

  if master_resume_id is null then
    select id into master_resume_id from public.resumes where user_id = new.id limit 1;
  end if;

  insert into public.resume_configurations (resume_id, user_id, name, visibility, is_default)
  values (master_resume_id, new.id, 'Default', '{}'::jsonb, true)
  on conflict (resume_id, name) do nothing;

  insert into public.public_links (resume_id, configuration_id, slug, is_active, allow_indexing)
  values (
    master_resume_id,
    (
      select id
      from public.resume_configurations
      where resume_id = master_resume_id and is_default = true
      order by created_at asc
      limit 1
    ),
    public.generate_slug('r-'),
    true,
    false
  )
  on conflict (slug) do nothing;

  return new;
end;
$$;

commit;
