-- Phase C completion migration.
-- Adds default user seed data, admin RPC helpers, and public resume RPC helpers.

begin;

-- Enforce one master resume per user (product decision for MVP).
create unique index if not exists resumes_user_id_unique_idx on public.resumes(user_id);

create or replace function public.generate_slug(prefix text default '')
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  candidate := lower(prefix || substring(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  return candidate;
end;
$$;

create or replace function public.seed_user_master_resume()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  master_resume_id uuid;
begin
  insert into public.resumes (user_id, title, slug, locale, data, is_public, allow_indexing)
  values (
    new.id,
    'Master resume',
    public.generate_slug('cv-'),
    'en',
    jsonb_build_object(
      'personal', jsonb_build_object('name', coalesce(new.display_name, 'New User')),
      'summary', '',
      'experience', jsonb_build_array(),
      'education', jsonb_build_array(),
      'skills', jsonb_build_array()
    ),
    true,
    false
  )
  on conflict (user_id) do update
  set updated_at = now()
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

drop trigger if exists on_profile_created_seed_resume on public.profiles;
create trigger on_profile_created_seed_resume
after insert on public.profiles
for each row execute procedure public.seed_user_master_resume();

create or replace function public.get_admin_platform_stats()
returns table (
  total_users bigint,
  active_users bigint,
  total_resumes bigint,
  total_public_links bigint,
  total_public_views bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles) as total_users,
    (select count(*) from public.profiles where is_active = true) as active_users,
    (select count(*) from public.resumes) as total_resumes,
    (select count(*) from public.public_links where is_active = true) as total_public_links,
    (select coalesce(sum(view_count), 0) from public.public_links where is_active = true) as total_public_views
  where exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.get_admin_user_overview()
returns table (
  id uuid,
  email text,
  role text,
  is_active boolean,
  created_at timestamptz,
  resume_count bigint,
  public_link_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    u.email::text,
    p.role,
    p.is_active,
    p.created_at,
    (select count(*) from public.resumes r where r.user_id = p.id) as resume_count,
    (
      select count(*)
      from public.public_links pl
      inner join public.resumes r2 on r2.id = pl.resume_id
      where r2.user_id = p.id
    ) as public_link_count
  from public.profiles p
  left join auth.users u on u.id = p.id
  where exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
  order by p.created_at desc;
$$;

create or replace function public.set_user_active(target_user_id uuid, target_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  ) then
    raise exception 'Admin role is required.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Admin cannot deactivate own account from UI.';
  end if;

  update public.profiles
  set is_active = target_is_active,
      updated_at = now()
  where id = target_user_id;
end;
$$;

create or replace function public.get_public_resume_by_slug(input_slug text)
returns table (
  resume_id uuid,
  data jsonb,
  locale text,
  title text,
  allow_indexing boolean,
  view_count integer
)
language sql
security definer
set search_path = public
as $$
  select
    r.id as resume_id,
    r.data,
    r.locale,
    r.title,
    (pl.allow_indexing and r.allow_indexing) as allow_indexing,
    pl.view_count
  from public.public_links pl
  inner join public.resumes r on r.id = pl.resume_id
  where pl.slug = input_slug
    and pl.is_active = true
    and r.is_public = true
  limit 1;
$$;

create or replace function public.increment_public_link_view(input_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.public_links
  set view_count = view_count + 1
  where slug = input_slug
    and is_active = true;
end;
$$;

grant execute on function public.get_admin_platform_stats() to authenticated;
grant execute on function public.get_admin_user_overview() to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;
grant execute on function public.get_public_resume_by_slug(text) to anon, authenticated;
grant execute on function public.increment_public_link_view(text) to anon, authenticated;

commit;
