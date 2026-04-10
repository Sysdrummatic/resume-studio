-- Phase B YAML-first data layer.
-- Adds YAML resume documents, immutable revisions, rollback primitives,
-- role-aware RLS, and legacy JSON -> YAML backfill helpers.

begin;

create extension if not exists pgcrypto;

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

do $$
declare
  role_check_name text;
begin
  if to_regclass('public.profiles') is null then
    return;
  end if;

  select c.conname
  into role_check_name
  from pg_constraint c
  where c.conrelid = 'public.profiles'::regclass
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%role%'
  limit 1;

  if role_check_name is not null then
    execute format('alter table public.profiles drop constraint %I', role_check_name);
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.profiles'::regclass
      and c.conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'manager', 'user', 'recruiter'));
  end if;
end;
$$;

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_manager_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'manager', false);
$$;

create or replace function public.is_staff_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() in ('admin', 'manager'), false);
$$;

create or replace function public.can_access_target_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  actor_role text;
  target_role text;
begin
  if target_user_id is null then
    return false;
  end if;

  if target_user_id = auth.uid() then
    return true;
  end if;

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return true;
  end if;

  if actor_role <> 'manager' then
    return false;
  end if;

  select p.role
  into target_role
  from public.profiles p
  where p.id = target_user_id;

  return coalesce(target_role in ('user', 'recruiter'), false);
end;
$$;

create or replace function public.can_manage_target_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return public.can_access_target_user(target_user_id);
end;
$$;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.is_manager_user() to authenticated;
grant execute on function public.is_staff_user() to authenticated;
grant execute on function public.can_access_target_user(uuid) to authenticated;
grant execute on function public.can_manage_target_user(uuid) to authenticated;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  jwt_role text := current_setting('request.jwt.claim.role', true);
begin
  if coalesce(jwt_role, '') = 'service_role' then
    return new;
  end if;

  if actor_role = 'admin' then
    return new;
  end if;

  if actor_role = 'manager' then
    if old.id = actor_id then
      if new.role <> old.role then
        raise exception 'Manager cannot modify own role.';
      end if;
      return new;
    end if;

    if old.role not in ('user', 'recruiter') then
      raise exception 'Manager can manage only user and recruiter accounts.';
    end if;

    if new.role not in ('user', 'recruiter') then
      raise exception 'Manager cannot promote role above user/recruiter.';
    end if;

    return new;
  end if;

  if actor_id = old.id then
    if new.role <> old.role then
      raise exception 'Users cannot change role.';
    end if;
    if new.is_active <> old.is_active then
      raise exception 'Users cannot change account activity status.';
    end if;
    return new;
  end if;

  raise exception 'Profile update is not allowed.';
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
before update on public.profiles
for each row execute procedure public.guard_profile_update();

create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(-[a-z]{2})?$'),
  title text not null default 'Master resume',
  yaml_content text not null,
  schema_version integer not null default 1 check (schema_version >= 1),
  is_public boolean not null default true,
  allow_indexing boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  legacy_resume_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, locale)
);

create table if not exists public.resume_revisions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.resume_documents(id) on delete cascade,
  revision_number bigint not null check (revision_number >= 1),
  locale text not null check (locale ~ '^[a-z]{2}(-[a-z]{2})?$'),
  title text not null,
  yaml_content text not null,
  schema_version integer not null check (schema_version >= 1),
  is_public boolean not null default true,
  allow_indexing boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  change_note text,
  created_at timestamptz not null default now(),
  unique (document_id, revision_number)
);

create table if not exists public.resume_public_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.resume_documents(id) on delete cascade,
  slug text not null unique,
  is_active boolean not null default true,
  allow_indexing boolean not null default false,
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_document_id uuid references public.resume_documents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists resume_documents_user_id_idx on public.resume_documents(user_id);
create index if not exists resume_documents_locale_idx on public.resume_documents(locale);
create index if not exists resume_revisions_document_id_idx on public.resume_revisions(document_id);
create index if not exists resume_revisions_created_at_idx on public.resume_revisions(created_at desc);
create index if not exists resume_public_links_document_id_idx on public.resume_public_links(document_id);
create index if not exists resume_public_links_slug_idx on public.resume_public_links(slug);
create index if not exists admin_audit_logs_actor_idx on public.admin_audit_logs(actor_user_id);
create index if not exists admin_audit_logs_target_user_idx on public.admin_audit_logs(target_user_id);
create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at desc);

drop trigger if exists resume_documents_updated_at on public.resume_documents;
create trigger resume_documents_updated_at
before update on public.resume_documents
for each row execute procedure public.touch_updated_at();

drop trigger if exists resume_public_links_updated_at on public.resume_public_links;
create trigger resume_public_links_updated_at
before update on public.resume_public_links
for each row execute procedure public.touch_updated_at();

create or replace function public.normalize_resume_locale(input_locale text)
returns text
language sql
immutable
as $$
  select case
    when input_locale is null or btrim(input_locale) = '' then 'en'
    when lower(split_part(input_locale, '-', 1)) in ('pl', 'en') then lower(split_part(input_locale, '-', 1))
    else lower(split_part(input_locale, '-', 1))
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
    'role: ""', E'\n',
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

create or replace function public.legacy_resume_json_to_yaml(input_data jsonb, fallback_name text default 'New User')
returns text
language plpgsql
immutable
as $$
declare
  payload jsonb := coalesce(input_data, '{}'::jsonb);
  name_value text;
  role_value text;
  summary_value text;
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
  summary_value := coalesce(nullif(payload ->> 'summary', ''), '');
  initials_value := coalesce(
    nullif(payload ->> 'brand_initials', ''),
    upper(left(regexp_replace(name_value, '[^A-Za-z ]', '', 'g'), 2)),
    ''
  );

  return concat(
    'brand_initials: ', to_jsonb(initials_value)::text, E'\n',
    'name: ', to_jsonb(name_value)::text, E'\n',
    'role: ', to_jsonb(role_value)::text, E'\n',
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
    'role',
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

create or replace function public.assert_valid_resume_yaml_trigger()
returns trigger
language plpgsql
as $$
begin
  if not public.validate_resume_document_yaml(new.yaml_content) then
    raise exception 'Invalid resume YAML content. Required keys are missing or payload is malformed.';
  end if;
  return new;
end;
$$;

drop trigger if exists resume_documents_validate_yaml on public.resume_documents;
create trigger resume_documents_validate_yaml
before insert or update on public.resume_documents
for each row execute procedure public.assert_valid_resume_yaml_trigger();

create or replace function public.create_resume_revision(
  input_document_id uuid,
  input_change_note text default null,
  input_created_by uuid default auth.uid()
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_revision_number bigint;
begin
  if not exists (
    select 1
    from public.resume_documents d
    where d.id = input_document_id
      and public.can_access_target_user(d.user_id)
  ) then
    raise exception 'Permission denied for revision creation.';
  end if;

  insert into public.resume_revisions (
    document_id,
    revision_number,
    locale,
    title,
    yaml_content,
    schema_version,
    is_public,
    allow_indexing,
    created_by,
    change_note
  )
  select
    d.id,
    coalesce((select max(rr.revision_number) from public.resume_revisions rr where rr.document_id = d.id), 0) + 1,
    d.locale,
    d.title,
    d.yaml_content,
    d.schema_version,
    d.is_public,
    d.allow_indexing,
    coalesce(input_created_by, auth.uid()),
    input_change_note
  from public.resume_documents d
  where d.id = input_document_id
  returning revision_number into new_revision_number;

  return new_revision_number;
end;
$$;

create or replace function public.rollback_resume_document(
  input_document_id uuid,
  input_revision_number bigint,
  input_change_note text default 'Rollback'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  revision_row public.resume_revisions%rowtype;
  target_user_id uuid;
begin
  select d.user_id
  into target_user_id
  from public.resume_documents d
  where d.id = input_document_id;

  if target_user_id is null then
    raise exception 'Resume document not found.';
  end if;

  if not public.can_access_target_user(target_user_id) then
    raise exception 'Permission denied for rollback.';
  end if;

  select *
  into revision_row
  from public.resume_revisions rr
  where rr.document_id = input_document_id
    and rr.revision_number = input_revision_number
  limit 1;

  if revision_row.id is null then
    raise exception 'Revision % does not exist for document %.', input_revision_number, input_document_id;
  end if;

  update public.resume_documents d
  set locale = revision_row.locale,
      title = revision_row.title,
      yaml_content = revision_row.yaml_content,
      schema_version = revision_row.schema_version,
      is_public = revision_row.is_public,
      allow_indexing = revision_row.allow_indexing,
      updated_at = now()
  where d.id = input_document_id;

  perform public.create_resume_revision(input_document_id, coalesce(input_change_note, 'Rollback'));
  return input_document_id;
end;
$$;

grant execute on function public.validate_resume_document_yaml(text) to authenticated;
grant execute on function public.create_resume_revision(uuid, text, uuid) to authenticated;
grant execute on function public.rollback_resume_document(uuid, bigint, text) to authenticated;

create or replace function public.seed_user_resume_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  en_document_id uuid;
begin
  insert into public.resume_documents (
    user_id,
    locale,
    title,
    yaml_content,
    schema_version,
    is_public,
    allow_indexing,
    created_by
  )
  values
    (
      new.id,
      'en',
      'Master resume',
      public.default_resume_yaml(coalesce(new.display_name, 'New User')),
      1,
      true,
      false,
      new.id
    ),
    (
      new.id,
      'pl',
      'Master resume',
      public.default_resume_yaml(coalesce(new.display_name, 'New User')),
      1,
      true,
      false,
      new.id
    )
  on conflict (user_id, locale) do nothing;

  insert into public.resume_revisions (
    document_id,
    revision_number,
    locale,
    title,
    yaml_content,
    schema_version,
    is_public,
    allow_indexing,
    created_by,
    change_note
  )
  select
    d.id,
    1,
    d.locale,
    d.title,
    d.yaml_content,
    d.schema_version,
    d.is_public,
    d.allow_indexing,
    new.id,
    'Initial seed'
  from public.resume_documents d
  where d.user_id = new.id
    and not exists (
      select 1
      from public.resume_revisions rr
      where rr.document_id = d.id
    );

  select d.id
  into en_document_id
  from public.resume_documents d
  where d.user_id = new.id
    and d.locale = 'en'
  limit 1;

  if en_document_id is not null then
    insert into public.resume_public_links (
      document_id,
      slug,
      is_active,
      allow_indexing,
      view_count
    )
    values (
      en_document_id,
      public.generate_slug('r-'),
      true,
      false,
      0
    )
    on conflict (slug) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_created_seed_resume_documents on public.profiles;
create trigger on_profile_created_seed_resume_documents
after insert on public.profiles
for each row execute procedure public.seed_user_resume_documents();

do $$
begin
  if to_regclass('public.resumes') is null then
    return;
  end if;

  insert into public.resume_documents (
    user_id,
    locale,
    title,
    yaml_content,
    schema_version,
    is_public,
    allow_indexing,
    created_by,
    legacy_resume_id,
    created_at,
    updated_at
  )
  select
    r.user_id,
    public.normalize_resume_locale(r.locale),
    coalesce(nullif(r.title, ''), 'Master resume'),
    public.legacy_resume_json_to_yaml(r.data, coalesce(p.display_name, 'New User')),
    1,
    coalesce(r.is_public, true),
    coalesce(r.allow_indexing, false),
    r.user_id,
    r.id,
    coalesce(r.created_at, now()),
    coalesce(r.updated_at, now())
  from public.resumes r
  left join public.profiles p on p.id = r.user_id
  on conflict (user_id, locale) do update
  set title = excluded.title,
      yaml_content = excluded.yaml_content,
      is_public = excluded.is_public,
      allow_indexing = excluded.allow_indexing,
      updated_at = now();

  insert into public.resume_documents (
    user_id,
    locale,
    title,
    yaml_content,
    schema_version,
    is_public,
    allow_indexing,
    created_by
  )
  select
    p.id,
    required_locale.locale_code,
    'Master resume',
    public.default_resume_yaml(coalesce(p.display_name, split_part(u.email, '@', 1), 'New User')),
    1,
    true,
    false,
    p.id
  from public.profiles p
  left join auth.users u on u.id = p.id
  cross join (values ('en'), ('pl')) as required_locale(locale_code)
  where not exists (
    select 1
    from public.resume_documents d
    where d.user_id = p.id
      and d.locale = required_locale.locale_code
  )
  on conflict (user_id, locale) do nothing;
end;
$$;

insert into public.resume_revisions (
  document_id,
  revision_number,
  locale,
  title,
  yaml_content,
  schema_version,
  is_public,
  allow_indexing,
  created_by,
  change_note,
  created_at
)
select
  d.id,
  1,
  d.locale,
  d.title,
  d.yaml_content,
  d.schema_version,
  d.is_public,
  d.allow_indexing,
  d.created_by,
  'Initial migration snapshot',
  coalesce(d.created_at, now())
from public.resume_documents d
where not exists (
  select 1
  from public.resume_revisions rr
  where rr.document_id = d.id
);

do $$
begin
  if to_regclass('public.public_links') is not null and to_regclass('public.resumes') is not null then
    insert into public.resume_public_links (
      document_id,
      slug,
      is_active,
      allow_indexing,
      view_count,
      created_at,
      updated_at
    )
    select
      d.id,
      pl.slug,
      coalesce(pl.is_active, true),
      coalesce(pl.allow_indexing, false),
      coalesce(pl.view_count, 0),
      coalesce(pl.created_at, now()),
      now()
    from public.public_links pl
    inner join public.resumes r on r.id = pl.resume_id
    inner join public.resume_documents d
      on d.user_id = r.user_id
     and d.locale = public.normalize_resume_locale(r.locale)
    on conflict (slug) do update
    set is_active = excluded.is_active,
        allow_indexing = excluded.allow_indexing,
        view_count = excluded.view_count,
        updated_at = now();
  end if;
end;
$$;

insert into public.resume_public_links (
  document_id,
  slug,
  is_active,
  allow_indexing,
  view_count
)
select
  d.id,
  public.generate_slug('r-'),
  true,
  d.allow_indexing,
  0
from public.resume_documents d
where d.locale = 'en'
  and not exists (
    select 1
    from public.resume_public_links pl
    where pl.document_id = d.id
  );

alter table public.resume_documents enable row level security;
alter table public.resume_revisions enable row level security;
alter table public.resume_public_links enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "resume_documents_select_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_select_public" on public.resume_documents;
drop policy if exists "resume_documents_insert_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_update_own_or_staff" on public.resume_documents;
drop policy if exists "resume_documents_delete_own_or_staff" on public.resume_documents;

create policy "resume_documents_select_own_or_staff"
on public.resume_documents
for select
using (public.can_access_target_user(user_id));

create policy "resume_documents_select_public"
on public.resume_documents
for select
using (is_public = true);

create policy "resume_documents_insert_own_or_staff"
on public.resume_documents
for insert
with check (public.can_manage_target_user(user_id));

create policy "resume_documents_update_own_or_staff"
on public.resume_documents
for update
using (public.can_access_target_user(user_id))
with check (public.can_manage_target_user(user_id));

create policy "resume_documents_delete_own_or_staff"
on public.resume_documents
for delete
using (public.can_manage_target_user(user_id));

drop policy if exists "resume_revisions_select_own_or_staff" on public.resume_revisions;
drop policy if exists "resume_revisions_insert_own_or_staff" on public.resume_revisions;

create policy "resume_revisions_select_own_or_staff"
on public.resume_revisions
for select
using (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_revisions.document_id
      and public.can_access_target_user(d.user_id)
  )
);

create policy "resume_revisions_insert_own_or_staff"
on public.resume_revisions
for insert
with check (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_revisions.document_id
      and public.can_manage_target_user(d.user_id)
  )
);

drop policy if exists "resume_public_links_select_active" on public.resume_public_links;
drop policy if exists "resume_public_links_select_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_insert_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_update_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_delete_own_or_staff" on public.resume_public_links;

create policy "resume_public_links_select_active"
on public.resume_public_links
for select
using (is_active = true);

create policy "resume_public_links_select_own_or_staff"
on public.resume_public_links
for select
using (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_public_links.document_id
      and public.can_access_target_user(d.user_id)
  )
);

create policy "resume_public_links_insert_own_or_staff"
on public.resume_public_links
for insert
with check (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_public_links.document_id
      and public.can_manage_target_user(d.user_id)
  )
);

create policy "resume_public_links_update_own_or_staff"
on public.resume_public_links
for update
using (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_public_links.document_id
      and public.can_access_target_user(d.user_id)
  )
)
with check (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_public_links.document_id
      and public.can_manage_target_user(d.user_id)
  )
);

create policy "resume_public_links_delete_own_or_staff"
on public.resume_public_links
for delete
using (
  exists (
    select 1
    from public.resume_documents d
    where d.id = resume_public_links.document_id
      and public.can_manage_target_user(d.user_id)
  )
);

drop policy if exists "admin_audit_logs_select_staff" on public.admin_audit_logs;
drop policy if exists "admin_audit_logs_insert_staff" on public.admin_audit_logs;

create policy "admin_audit_logs_select_staff"
on public.admin_audit_logs
for select
using (public.is_staff_user());

create policy "admin_audit_logs_insert_staff"
on public.admin_audit_logs
for insert
with check (public.is_staff_user() and actor_user_id = auth.uid());

drop policy if exists "manager_profiles_select_manageable" on public.profiles;
drop policy if exists "manager_profiles_update_manageable" on public.profiles;

create policy "manager_profiles_select_manageable"
on public.profiles
for select
using (public.can_access_target_user(id));

create policy "manager_profiles_update_manageable"
on public.profiles
for update
using (public.can_access_target_user(id))
with check (public.can_manage_target_user(id) or public.is_admin_user());

commit;
