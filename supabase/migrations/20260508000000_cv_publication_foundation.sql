-- ADR 0001 CV publication schema foundation.
-- Additive, backwards-compatible foundation for Saved Version -> Published CV -> Public Link.

begin;

create extension if not exists pgcrypto;

create or replace function public.is_resume_locale(input_locale text)
returns boolean
language sql
immutable
as $$
  select coalesce(input_locale ~ '^[a-z]{2}(-[a-z]{2})?$', false);
$$;

create or replace function public.are_resume_locales(input_locales text[])
returns boolean
language sql
immutable
as $$
  select
    input_locales is not null
    and cardinality(input_locales) > 0
    and array_position(input_locales, null) is null
    and not exists (
      select 1
      from unnest(input_locales) as locale_value(code)
      where not public.is_resume_locale(locale_value.code)
    );
$$;

create or replace function public.normalize_person_slug(input_value text)
returns text
language sql
immutable
as $$
  select left(
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(coalesce(input_value, '')), '[^a-z0-9]+', '-', 'g')), ''),
      'user'
    ),
    80
  );
$$;

create or replace function public.generate_public_id()
returns text
language sql
volatile
as $$
  select lower(substring(replace(gen_random_uuid()::text, '-', ''), 1, 14));
$$;

alter table public.profiles
add column if not exists person_slug text;

alter table public.profiles
drop constraint if exists profiles_person_slug_format;

alter table public.profiles
add constraint profiles_person_slug_format
check (
  person_slug is null
  or (
    char_length(person_slug) between 3 and 80
    and person_slug ~ '^[a-z0-9][a-z0-9-]*$'
    and person_slug !~ '-$'
  )
);

do $$
begin
  if exists (
    select 1
    from pg_trigger t
    where t.tgname = 'profiles_guard_update'
      and t.tgrelid = 'public.profiles'::regclass
      and not t.tgisinternal
  ) then
    alter table public.profiles disable trigger profiles_guard_update;
  end if;
end;
$$;

update public.profiles p
set person_slug = left(
  concat(
    left(public.normalize_person_slug(coalesce(p.display_name, u.email, 'user')), 71),
    '-',
    substring(replace(p.id::text, '-', ''), 1, 8)
  ),
  80
)
from auth.users u
where u.id = p.id
  and p.person_slug is null;

update public.profiles
set person_slug = left(
  concat(
    left(public.normalize_person_slug(coalesce(display_name, 'user')), 71),
    '-',
    substring(replace(id::text, '-', ''), 1, 8)
  ),
  80
)
where person_slug is null;

do $$
begin
  if exists (
    select 1
    from pg_trigger t
    where t.tgname = 'profiles_guard_update'
      and t.tgrelid = 'public.profiles'::regclass
      and not t.tgisinternal
  ) then
    alter table public.profiles enable trigger profiles_guard_update;
  end if;
end;
$$;

create unique index if not exists profiles_person_slug_unique_idx
on public.profiles(person_slug)
where person_slug is not null;

create or replace function public.assign_profile_person_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_slug text;
  candidate_slug text;
  suffix integer := 0;
begin
  if new.person_slug is not null and btrim(new.person_slug) <> '' then
    base_slug := public.normalize_person_slug(new.person_slug);
  elsif tg_op = 'UPDATE' and old.person_slug is not null then
    base_slug := old.person_slug;
  else
    base_slug := public.normalize_person_slug(coalesce(new.display_name, new.id::text));
  end if;

  candidate_slug := left(base_slug, 80);

  while exists (
    select 1
    from public.profiles p
    where p.person_slug = candidate_slug
      and p.id <> new.id
  ) loop
    suffix := suffix + 1;
    candidate_slug := concat(left(base_slug, greatest(3, 79 - char_length(suffix::text))), '-', suffix::text);
  end loop;

  new.person_slug := candidate_slug;
  return new;
end;
$$;

drop trigger if exists profiles_assign_person_slug on public.profiles;
create trigger profiles_assign_person_slug
before insert or update of person_slug, display_name on public.profiles
for each row execute procedure public.assign_profile_person_slug();

create table if not exists public.resume_published_cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preset_id uuid references public.resume_presets(id) on delete set null,
  source_document_id uuid references public.resume_documents(id) on delete set null,
  source_revision_id uuid references public.resume_revisions(id) on delete set null,
  title text not null default 'Published CV',
  schema_version integer not null default 1 check (schema_version >= 1),
  open_cv_yaml_contract_version text not null default '1',
  default_locale text not null default 'en' check (public.is_resume_locale(default_locale)),
  published_locales text[] not null default array[]::text[],
  available_locales text[] not null default array['en']::text[],
  selection jsonb not null default '{}'::jsonb,
  allow_indexing boolean not null default false,
  published_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  snapshot_metadata jsonb not null default '{}'::jsonb,
  constraint resume_published_cvs_id_user_id_unique unique (id, user_id),
  constraint resume_published_cvs_selection_object check (jsonb_typeof(selection) = 'object'),
  constraint resume_published_cvs_snapshot_metadata_object check (jsonb_typeof(snapshot_metadata) = 'object'),
  constraint resume_published_cvs_available_locales_valid check (public.are_resume_locales(available_locales)),
  constraint resume_published_cvs_default_locale_available check (default_locale = any(available_locales))
);

create table if not exists public.resume_published_cv_locales (
  id uuid primary key default gen_random_uuid(),
  published_cv_id uuid not null,
  user_id uuid not null,
  locale text not null check (public.is_resume_locale(locale)),
  source_document_id uuid references public.resume_documents(id) on delete set null,
  source_revision_id uuid references public.resume_revisions(id) on delete set null,
  source_variant_id uuid references public.resume_preset_variants(id) on delete set null,
  title text not null,
  yaml_content text not null,
  schema_version integer not null default 1 check (schema_version >= 1),
  selection jsonb not null default '{}'::jsonb,
  labels jsonb not null default '{}'::jsonb,
  render_data jsonb,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  constraint resume_published_cv_locales_parent_fk
    foreign key (published_cv_id, user_id)
    references public.resume_published_cvs(id, user_id)
    on delete cascade,
  constraint resume_published_cv_locales_unique_locale unique (published_cv_id, locale),
  constraint resume_published_cv_locales_yaml_present check (
    btrim(yaml_content) <> '' and char_length(yaml_content) <= 250000
  ),
  constraint resume_published_cv_locales_selection_object check (jsonb_typeof(selection) = 'object'),
  constraint resume_published_cv_locales_labels_object check (jsonb_typeof(labels) = 'object'),
  constraint resume_published_cv_locales_render_data_object check (
    render_data is null or jsonb_typeof(render_data) = 'object'
  )
);

create index if not exists resume_published_cvs_user_id_idx on public.resume_published_cvs(user_id);
create index if not exists resume_published_cvs_preset_id_idx on public.resume_published_cvs(preset_id);
create index if not exists resume_published_cvs_source_document_id_idx on public.resume_published_cvs(source_document_id);
create index if not exists resume_published_cvs_published_at_idx on public.resume_published_cvs(published_at desc);
create index if not exists resume_published_cv_locales_published_cv_id_idx on public.resume_published_cv_locales(published_cv_id);
create index if not exists resume_published_cv_locales_user_id_idx on public.resume_published_cv_locales(user_id);
create index if not exists resume_published_cv_locales_locale_idx on public.resume_published_cv_locales(locale);

create or replace function public.assert_published_cv_locale_snapshot()
returns trigger
language plpgsql
as $$
declare
  parent_row public.resume_published_cvs%rowtype;
begin
  select *
  into parent_row
  from public.resume_published_cvs pcv
  where pcv.id = new.published_cv_id;

  if parent_row.id is null then
    raise exception 'Published CV snapshot does not exist.';
  end if;

  if parent_row.user_id <> new.user_id then
    raise exception 'Published CV locale owner does not match snapshot owner.';
  end if;

  if new.locale <> any(parent_row.available_locales) then
    raise exception 'Published CV locale is not listed in available_locales.';
  end if;

  return new;
end;
$$;

drop trigger if exists resume_published_cv_locales_assert_snapshot on public.resume_published_cv_locales;
create trigger resume_published_cv_locales_assert_snapshot
before insert on public.resume_published_cv_locales
for each row execute procedure public.assert_published_cv_locale_snapshot();

create or replace function public.prevent_published_cv_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  raise exception 'Published CV snapshots are immutable. Create a new snapshot instead.';
end;
$$;

drop trigger if exists resume_published_cvs_prevent_update on public.resume_published_cvs;
create trigger resume_published_cvs_prevent_update
before update or delete on public.resume_published_cvs
for each row execute procedure public.prevent_published_cv_mutation();

drop trigger if exists resume_published_cv_locales_prevent_update on public.resume_published_cv_locales;
create trigger resume_published_cv_locales_prevent_update
before update or delete on public.resume_published_cv_locales
for each row execute procedure public.prevent_published_cv_mutation();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.resume_documents'::regclass
      and conname = 'resume_documents_id_user_id_unique'
  ) then
    alter table public.resume_documents
      add constraint resume_documents_id_user_id_unique unique (id, user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.resume_presets'::regclass
      and conname = 'resume_presets_id_user_id_unique'
  ) then
    alter table public.resume_presets
      add constraint resume_presets_id_user_id_unique unique (id, user_id);
  end if;
end;
$$;

alter table public.resume_public_links
add column if not exists user_id uuid references public.profiles(id) on delete cascade,
add column if not exists preset_id uuid references public.resume_presets(id) on delete set null,
add column if not exists person_slug text,
add column if not exists public_id text,
add column if not exists active_published_cv_id uuid,
add column if not exists default_locale text,
add column if not exists available_locales text[] not null default array['en']::text[],
add column if not exists status text not null default 'active',
add column if not exists revoked_at timestamptz,
add column if not exists published_at timestamptz,
add column if not exists legacy_slug text;

update public.resume_public_links pl
set preset_id = rp.id
from public.resume_presets rp
where pl.preset_id is null
  and rp.slug = pl.slug;

update public.resume_public_links pl
set
  user_id = coalesce(
    pl.user_id,
    (select rp.user_id from public.resume_presets rp where rp.id = pl.preset_id),
    d.user_id
  ),
  person_slug = coalesce(
    pl.person_slug,
    (
      select p.person_slug
      from public.profiles p
      where p.id = coalesce(
        pl.user_id,
        (select rp.user_id from public.resume_presets rp where rp.id = pl.preset_id),
        d.user_id
      )
    )
  ),
  legacy_slug = coalesce(pl.legacy_slug, pl.slug),
  public_id = coalesce(pl.public_id, lower(substring(replace(pl.id::text, '-', ''), 1, 14))),
  default_locale = coalesce(
    pl.default_locale,
    (select rp.default_locale from public.resume_presets rp where rp.id = pl.preset_id),
    d.locale,
    'en'
  ),
  available_locales = case
    when public.are_resume_locales(pl.available_locales) then pl.available_locales
    else array[
      coalesce(
        pl.default_locale,
        (select rp.default_locale from public.resume_presets rp where rp.id = pl.preset_id),
        d.locale,
        'en'
      )
    ]
  end,
  status = case when pl.is_active then 'active' else 'revoked' end,
  published_at = case
    when pl.is_active then coalesce(pl.published_at, pl.created_at, now())
    else pl.published_at
  end,
  revoked_at = case
    when pl.is_active then null
    else coalesce(pl.revoked_at, pl.updated_at, pl.created_at, now())
  end
from public.resume_documents d
where pl.document_id = d.id;

update public.resume_public_links pl
set available_locales = preset_locales.locales
from (
  select
    rp.id as preset_id,
    array_agg(distinct rpv.locale order by rpv.locale) as locales
  from public.resume_presets rp
  inner join public.resume_preset_variants rpv on rpv.preset_id = rp.id
  group by rp.id
) preset_locales
where pl.preset_id = preset_locales.preset_id
  and public.are_resume_locales(preset_locales.locales);

insert into public.resume_public_links (
  document_id,
  user_id,
  preset_id,
  slug,
  is_active,
  allow_indexing,
  view_count,
  person_slug,
  public_id,
  default_locale,
  available_locales,
  status,
  published_at,
  legacy_slug,
  created_at,
  updated_at
)
select
  rp.document_id,
  rp.user_id,
  rp.id,
  rp.slug,
  true,
  rp.allow_indexing,
  0,
  p.person_slug,
  lower(substring(replace(rp.id::text, '-', ''), 1, 14)),
  rp.default_locale,
  coalesce(preset_locales.locales, array[rp.default_locale]),
  'active',
  coalesce(rp.published_at, rp.updated_at, rp.created_at, now()),
  rp.slug,
  coalesce(rp.published_at, rp.created_at, now()),
  now()
from public.resume_presets rp
inner join public.profiles p on p.id = rp.user_id
left join (
  select
    rpv.preset_id,
    array_agg(distinct rpv.locale order by rpv.locale) as locales
  from public.resume_preset_variants rpv
  group by rpv.preset_id
) preset_locales on preset_locales.preset_id = rp.id
where rp.is_public = true
  and rp.slug is not null
on conflict (slug) do update
set
  user_id = coalesce(public.resume_public_links.user_id, excluded.user_id),
  preset_id = coalesce(public.resume_public_links.preset_id, excluded.preset_id),
  person_slug = coalesce(public.resume_public_links.person_slug, excluded.person_slug),
  public_id = coalesce(public.resume_public_links.public_id, excluded.public_id),
  default_locale = coalesce(public.resume_public_links.default_locale, excluded.default_locale),
  available_locales = case
    when public.are_resume_locales(public.resume_public_links.available_locales) then public.resume_public_links.available_locales
    else excluded.available_locales
  end,
  status = case when public.resume_public_links.is_active then 'active' else 'revoked' end,
  published_at = coalesce(public.resume_public_links.published_at, excluded.published_at),
  legacy_slug = coalesce(public.resume_public_links.legacy_slug, excluded.legacy_slug),
  updated_at = now();

create or replace function public.assign_resume_public_link_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inferred_user_id uuid;
  inferred_default_locale text;
  inferred_person_slug text;
  snapshot_user_id uuid;
  base_public_id text;
  candidate_public_id text;
begin
  if new.user_id is null and new.preset_id is not null then
    select rp.user_id, rp.default_locale
    into inferred_user_id, inferred_default_locale
    from public.resume_presets rp
    where rp.id = new.preset_id;

    new.user_id := inferred_user_id;
    new.default_locale := coalesce(new.default_locale, inferred_default_locale);
  end if;

  if new.user_id is null and new.document_id is not null then
    select d.user_id, d.locale
    into inferred_user_id, inferred_default_locale
    from public.resume_documents d
    where d.id = new.document_id;

    new.user_id := inferred_user_id;
    new.default_locale := coalesce(new.default_locale, inferred_default_locale);
  end if;

  if new.default_locale is null then
    new.default_locale := 'en';
  end if;

  if not public.are_resume_locales(new.available_locales) then
    new.available_locales := array[new.default_locale];
  end if;

  if new.default_locale <> any(new.available_locales) then
    new.available_locales := array_prepend(new.default_locale, new.available_locales);
  end if;

  if new.user_id is not null and new.person_slug is null then
    select p.person_slug
    into inferred_person_slug
    from public.profiles p
    where p.id = new.user_id;

    new.person_slug := inferred_person_slug;
  end if;

  if new.active_published_cv_id is not null then
    select pcv.user_id
    into snapshot_user_id
    from public.resume_published_cvs pcv
    where pcv.id = new.active_published_cv_id;

    if snapshot_user_id is null then
      raise exception 'Active Published CV snapshot does not exist.';
    end if;

    if new.user_id is null then
      new.user_id := snapshot_user_id;
    elsif new.user_id <> snapshot_user_id then
      raise exception 'Public Link owner does not match active Published CV owner.';
    end if;
  end if;

  if new.person_slug is not null then
    new.person_slug := public.normalize_person_slug(new.person_slug);
  end if;

  if new.public_id is null or btrim(new.public_id) = '' then
    base_public_id := public.generate_public_id();
  else
    base_public_id := public.normalize_person_slug(new.public_id);
  end if;

  candidate_public_id := base_public_id;
  while new.person_slug is not null and exists (
    select 1
    from public.resume_public_links pl
    where pl.person_slug = new.person_slug
      and pl.public_id = candidate_public_id
      and pl.id <> new.id
  ) loop
    candidate_public_id := public.generate_public_id();
  end loop;
  new.public_id := candidate_public_id;

  new.legacy_slug := coalesce(new.legacy_slug, new.slug);

  if new.status = 'revoked' or new.is_active = false then
    new.status := 'revoked';
    new.is_active := false;
    new.revoked_at := coalesce(new.revoked_at, now());
  else
    new.status := 'active';
    new.is_active := true;
    new.revoked_at := null;
    new.published_at := coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists resume_public_links_assign_metadata on public.resume_public_links;
create trigger resume_public_links_assign_metadata
before insert or update of user_id, preset_id, document_id, person_slug, public_id, default_locale, available_locales, status, is_active, revoked_at, published_at, legacy_slug
on public.resume_public_links
for each row execute procedure public.assign_resume_public_link_metadata();

alter table public.resume_public_links
drop constraint if exists resume_public_links_person_slug_format,
drop constraint if exists resume_public_links_public_id_format,
drop constraint if exists resume_public_links_default_locale_format,
drop constraint if exists resume_public_links_available_locales_valid,
drop constraint if exists resume_public_links_default_locale_available,
drop constraint if exists resume_public_links_status_supported,
drop constraint if exists resume_public_links_status_active_consistent,
drop constraint if exists resume_public_links_revoked_at_consistent,
drop constraint if exists resume_public_links_active_snapshot_has_owner;

alter table public.resume_public_links
add constraint resume_public_links_person_slug_format
check (
  person_slug is null
  or (
    char_length(person_slug) between 3 and 80
    and person_slug ~ '^[a-z0-9][a-z0-9-]*$'
    and person_slug !~ '-$'
  )
),
add constraint resume_public_links_public_id_format
check (
  public_id is null
  or (
    char_length(public_id) between 6 and 80
    and public_id ~ '^[a-z0-9][a-z0-9-]*$'
    and public_id !~ '-$'
  )
),
add constraint resume_public_links_default_locale_format
check (default_locale is null or public.is_resume_locale(default_locale)),
add constraint resume_public_links_available_locales_valid
check (public.are_resume_locales(available_locales)),
add constraint resume_public_links_default_locale_available
check (default_locale is null or default_locale = any(available_locales)),
add constraint resume_public_links_status_supported
check (status in ('active', 'revoked')),
add constraint resume_public_links_status_active_consistent
check ((status = 'active') = is_active),
add constraint resume_public_links_revoked_at_consistent
check ((status = 'active' and revoked_at is null) or status = 'revoked'),
add constraint resume_public_links_active_snapshot_has_owner
check (active_published_cv_id is null or user_id is not null);

do $$
begin
  alter table public.resume_public_links
    drop constraint if exists resume_public_links_active_published_cv_owner_fk;

  alter table public.resume_public_links
    drop constraint if exists resume_public_links_active_published_cv_fk;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'resume_public_links_active_published_cv_fk'
      and conrelid = 'public.resume_public_links'::regclass
  ) then
    alter table public.resume_public_links
      add constraint resume_public_links_active_published_cv_fk
      foreign key (active_published_cv_id)
      references public.resume_published_cvs(id)
      on delete set null;
  end if;

end;
$$;

create unique index if not exists resume_public_links_person_public_unique_idx
on public.resume_public_links(person_slug, public_id)
where person_slug is not null and public_id is not null;

create index if not exists resume_public_links_user_id_idx on public.resume_public_links(user_id);
create index if not exists resume_public_links_preset_id_idx on public.resume_public_links(preset_id);
create index if not exists resume_public_links_person_slug_idx on public.resume_public_links(person_slug);
create index if not exists resume_public_links_public_id_idx on public.resume_public_links(public_id);
create index if not exists resume_public_links_active_published_cv_id_idx on public.resume_public_links(active_published_cv_id);
create index if not exists resume_public_links_legacy_slug_idx on public.resume_public_links(legacy_slug);
create index if not exists resume_public_links_status_idx on public.resume_public_links(status);
create index if not exists resume_public_links_active_indexable_idx
on public.resume_public_links(is_active, allow_indexing)
where is_active = true;

alter table public.resume_published_cvs enable row level security;
alter table public.resume_published_cv_locales enable row level security;
alter table public.resume_public_links enable row level security;

drop policy if exists "resume_documents_select_public" on public.resume_documents;

drop policy if exists "resume_published_cvs_select_owner" on public.resume_published_cvs;
drop policy if exists "resume_published_cvs_select_active_public" on public.resume_published_cvs;
drop policy if exists "resume_published_cvs_insert_owner" on public.resume_published_cvs;

create policy "resume_published_cvs_select_owner"
on public.resume_published_cvs
for select
using (auth.uid() = user_id);

create policy "resume_published_cvs_select_active_public"
on public.resume_published_cvs
for select
using (
  exists (
    select 1
    from public.resume_public_links pl
    where pl.active_published_cv_id = resume_published_cvs.id
      and pl.is_active = true
      and pl.status = 'active'
      and pl.revoked_at is null
      and pl.published_at is not null
  )
);

create policy "resume_published_cvs_insert_owner"
on public.resume_published_cvs
for insert
with check (auth.uid() = user_id);

drop policy if exists "resume_published_cv_locales_select_owner" on public.resume_published_cv_locales;
drop policy if exists "resume_published_cv_locales_select_active_public" on public.resume_published_cv_locales;
drop policy if exists "resume_published_cv_locales_insert_owner" on public.resume_published_cv_locales;

create policy "resume_published_cv_locales_select_owner"
on public.resume_published_cv_locales
for select
using (auth.uid() = user_id);

create policy "resume_published_cv_locales_select_active_public"
on public.resume_published_cv_locales
for select
using (
  exists (
    select 1
    from public.resume_public_links pl
    where pl.active_published_cv_id = resume_published_cv_locales.published_cv_id
      and pl.is_active = true
      and pl.status = 'active'
      and pl.revoked_at is null
      and pl.published_at is not null
      and resume_published_cv_locales.locale = any(pl.available_locales)
  )
);

create policy "resume_published_cv_locales_insert_owner"
on public.resume_published_cv_locales
for insert
with check (auth.uid() = user_id);

drop policy if exists "resume_public_links_select_active" on public.resume_public_links;
drop policy if exists "resume_public_links_select_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_insert_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_update_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_delete_own_or_staff" on public.resume_public_links;
drop policy if exists "resume_public_links_select_owner_by_user" on public.resume_public_links;
drop policy if exists "resume_public_links_select_active_public" on public.resume_public_links;
drop policy if exists "resume_public_links_insert_owner_by_user" on public.resume_public_links;
drop policy if exists "resume_public_links_update_owner_by_user" on public.resume_public_links;
drop policy if exists "resume_public_links_delete_owner_by_user" on public.resume_public_links;
drop policy if exists "resume_public_links_select_admin_metadata" on public.resume_public_links;

create policy "resume_public_links_select_active_public"
on public.resume_public_links
for select
using (
  is_active = true
  and status = 'active'
  and revoked_at is null
);

create policy "resume_public_links_select_owner_by_user"
on public.resume_public_links
for select
using (
  (user_id is not null and public.can_access_target_user(user_id))
  or exists (
    select 1
    from public.resume_documents d
    where d.id = resume_public_links.document_id
      and public.can_access_target_user(d.user_id)
  )
);

create policy "resume_public_links_select_admin_metadata"
on public.resume_public_links
for select
using (public.is_admin_user());

create policy "resume_public_links_insert_owner_by_user"
on public.resume_public_links
for insert
with check (
  user_id is not null
  and public.can_manage_target_user(user_id)
  and (
    document_id is null
    or exists (
      select 1
      from public.resume_documents d
      where d.id = resume_public_links.document_id
        and d.user_id = resume_public_links.user_id
    )
  )
  and (
    active_published_cv_id is null
    or exists (
      select 1
      from public.resume_published_cvs pcv
      where pcv.id = resume_public_links.active_published_cv_id
        and pcv.user_id = resume_public_links.user_id
    )
  )
);

create policy "resume_public_links_update_owner_by_user"
on public.resume_public_links
for update
using (user_id is not null and public.can_access_target_user(user_id))
with check (
  user_id is not null
  and public.can_manage_target_user(user_id)
  and (
    document_id is null
    or exists (
      select 1
      from public.resume_documents d
      where d.id = resume_public_links.document_id
        and d.user_id = resume_public_links.user_id
    )
  )
  and (
    active_published_cv_id is null
    or exists (
      select 1
      from public.resume_published_cvs pcv
      where pcv.id = resume_public_links.active_published_cv_id
        and pcv.user_id = resume_public_links.user_id
    )
  )
);

create policy "resume_public_links_delete_owner_by_user"
on public.resume_public_links
for delete
using (user_id is not null and public.can_manage_target_user(user_id));

commit;
