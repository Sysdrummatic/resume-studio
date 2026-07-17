-- Per-user locale ownership and overrides.
-- Keeps the global resume_languages catalog as metadata while moving
-- user-facing locale membership, default selection, and label editing
-- into an owner-scoped table.

begin;

insert into public.resume_languages (code, label, short_label, labels, sort_order)
select
  missing.code,
  upper(missing.code),
  upper(left(missing.code, 2)),
  '{}'::jsonb,
  1000 + missing.position * 10
from (
  select distinct
    d.locale as code,
    row_number() over (order by d.locale) as position
  from public.resume_documents d
  left join public.resume_languages rl on rl.code = d.locale
  where rl.code is null
    and d.locale ~ '^[a-z]{2}$'
) as missing
on conflict (code) do nothing;

create table if not exists public.resume_user_locales (
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale text not null references public.resume_languages(code),
  label_override text,
  short_label_override text,
  is_default boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_user_locales_pkey primary key (user_id, locale),
  constraint resume_user_locales_label_override_not_blank check (label_override is null or btrim(label_override) <> ''),
  constraint resume_user_locales_short_label_override_format check (short_label_override is null or short_label_override ~ '^[A-Z]{2}$')
);

create unique index if not exists resume_user_locales_default_unique_idx
  on public.resume_user_locales (user_id)
  where is_default;

create index if not exists resume_user_locales_locale_idx
  on public.resume_user_locales (locale);

drop trigger if exists resume_user_locales_updated_at on public.resume_user_locales;
create trigger resume_user_locales_updated_at
before update on public.resume_user_locales
for each row execute procedure public.touch_updated_at();

with ranked_documents as (
  select
    d.user_id,
    d.locale,
    row_number() over (
      partition by d.user_id
      order by
        case when d.locale = 'en' then 0 else 1 end,
        d.updated_at desc,
        d.locale asc
    ) as locale_rank,
    row_number() over (
      partition by d.user_id
      order by
        case
          when d.locale = coalesce(
            (
              select rp.default_locale
              from public.resume_presets rp
              where rp.user_id = d.user_id
              order by rp.updated_at desc nulls last, rp.created_at desc nulls last
              limit 1
            ),
            (
              select case
                when exists (
                  select 1
                  from public.resume_documents preferred
                  where preferred.user_id = d.user_id
                    and preferred.locale = 'en'
                ) then 'en'
                else fallback.locale
              end
              from public.resume_documents fallback
              where fallback.user_id = d.user_id
              order by
                case when fallback.locale = 'en' then 0 else 1 end,
                fallback.updated_at desc,
                fallback.locale asc
              limit 1
            ),
            'en'
          ) then 0
          else 1
        end,
        case when d.locale = 'en' then 0 else 1 end,
        d.updated_at desc,
        d.locale asc
    ) as default_rank
  from public.resume_documents d
)
insert into public.resume_user_locales (
  user_id,
  locale,
  label_override,
  short_label_override,
  is_default,
  sort_order
)
select
  ranked_documents.user_id,
  ranked_documents.locale,
  null,
  null,
  ranked_documents.default_rank = 1,
  ranked_documents.locale_rank * 10
from ranked_documents
on conflict (user_id, locale) do nothing;

insert into public.resume_user_locales (
  user_id,
  locale,
  label_override,
  short_label_override,
  is_default,
  sort_order
)
select
  p.id,
  'en',
  null,
  null,
  true,
  10
from public.profiles p
where not exists (
  select 1
  from public.resume_user_locales rul
  where rul.user_id = p.id
)
on conflict (user_id, locale) do nothing;

insert into public.resume_documents (
  user_id,
  locale,
  title,
  yaml_content,
  schema_version,
  is_public,
  allow_indexing,
  ai_generated,
  created_by
)
select
  p.id,
  'en',
  'Master resume',
  public.default_resume_yaml(coalesce(p.display_name, split_part(u.email, '@', 1), 'New User')),
  1,
  false,
  false,
  false,
  p.id
from public.profiles p
left join auth.users u on u.id = p.id
where exists (
  select 1
  from public.resume_user_locales rul
  where rul.user_id = p.id
    and rul.locale = 'en'
)
and not exists (
  select 1
  from public.resume_documents d
  where d.user_id = p.id
    and d.locale = 'en'
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
  d.created_by,
  'Initial seed'
from public.resume_documents d
where not exists (
  select 1
  from public.resume_revisions r
  where r.document_id = d.id
)
and exists (
  select 1
  from public.resume_user_locales rul
  where rul.user_id = d.user_id
    and rul.locale = d.locale
);

alter table public.resume_user_locales enable row level security;

drop policy if exists "resume_user_locales_select_owner" on public.resume_user_locales;
drop policy if exists "resume_user_locales_insert_owner" on public.resume_user_locales;
drop policy if exists "resume_user_locales_update_owner" on public.resume_user_locales;
drop policy if exists "resume_user_locales_delete_owner" on public.resume_user_locales;

create policy "resume_user_locales_select_owner"
on public.resume_user_locales
for select
using (auth.uid() = user_id);

create policy "resume_user_locales_insert_owner"
on public.resume_user_locales
for insert
with check (auth.uid() = user_id);

create policy "resume_user_locales_update_owner"
on public.resume_user_locales
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "resume_user_locales_delete_owner"
on public.resume_user_locales
for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.resume_user_locales to authenticated;

create or replace function public.seed_user_resume_documents()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.resume_user_locales (
    user_id,
    locale,
    label_override,
    short_label_override,
    is_default,
    sort_order
  )
  values (
    new.id,
    'en',
    null,
    null,
    true,
    10
  )
  on conflict (user_id, locale) do nothing;

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
  values (
    new.id,
    'en',
    'Master resume',
    public.default_resume_yaml(coalesce(new.display_name, 'New User')),
    1,
    false,
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
    and d.locale = 'en'
    and not exists (
      select 1
      from public.resume_revisions r
      where r.document_id = d.id
    );

  return new;
end;
$$;

commit;
