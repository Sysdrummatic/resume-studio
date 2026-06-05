-- Add structured profile names and explicit name sync ownership.
begin;

alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists name_sync_mode text not null default 'auto';

alter table public.profiles
drop constraint if exists profiles_name_sync_mode_check;

alter table public.profiles
add constraint profiles_name_sync_mode_check
check (name_sync_mode in ('auto', 'manual'));

create or replace function public.profile_compact_person_slug(
  input_first_name text,
  input_last_name text,
  input_fallback text default 'user'
)
returns text
language sql
immutable
as $$
  with compact_slug as (
    select coalesce(
      nullif(
        regexp_replace(
          lower(coalesce(nullif(concat(coalesce(input_first_name, ''), coalesce(input_last_name, '')), ''), input_fallback, '')),
          '[^a-z0-9]+',
          '',
          'g'
        ),
        ''
      ),
      'user'
    ) as value
  )
  select left(
    case
      when char_length(value) >= 3 then value
      else concat(value, 'user')
    end,
    80
  )
  from compact_slug;
$$;

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

update public.profiles
set
  first_name = coalesce(
    nullif(first_name, ''),
    nullif(split_part(coalesce(display_name, ''), ' ', 1), '')
  ),
  last_name = coalesce(
    nullif(last_name, ''),
    nullif(btrim(substr(coalesce(display_name, ''), length(split_part(coalesce(display_name, ''), ' ', 1)) + 1)), '')
  ),
  display_name = nullif(btrim(coalesce(display_name, '')), ''),
  name_sync_mode = coalesce(nullif(name_sync_mode, ''), 'auto')
where first_name is null
   or last_name is null
   or display_name is null
   or name_sync_mode is null;

update public.profiles
set person_slug = public.profile_compact_person_slug(first_name, last_name, display_name)
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
  if new.person_slug is not null and (
    tg_op = 'INSERT'
    or old.person_slug is null
    or new.person_slug is distinct from old.person_slug
  ) then
    base_slug := public.normalize_person_slug(new.person_slug);
  elsif tg_op = 'UPDATE' and old.person_slug is not null then
    base_slug := old.person_slug;
  else
    base_slug := public.profile_compact_person_slug(new.first_name, new.last_name, coalesce(new.display_name, new.id::text));
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
before insert or update of person_slug, display_name, first_name, last_name on public.profiles
for each row execute procedure public.assign_profile_person_slug();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_display_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  parsed_first_name text := nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '');
  parsed_last_name text := nullif(
    btrim(substr(coalesce(new.raw_user_meta_data ->> 'full_name', ''), length(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)) + 1)),
    ''
  );
begin
  insert into public.profiles (id, display_name, first_name, last_name, name_sync_mode)
  values (new.id, raw_display_name, parsed_first_name, parsed_last_name, 'auto')
  on conflict (id) do nothing;
  return new;
end;
$$;

commit;
