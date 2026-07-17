create table if not exists public.resume_presets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.resume_documents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  selection jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  allow_indexing boolean not null default false,
  slug text unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_presets_selection_object check (jsonb_typeof(selection) = 'object')
);

create index if not exists resume_presets_document_id_idx on public.resume_presets(document_id);
create index if not exists resume_presets_user_id_idx on public.resume_presets(user_id);
create index if not exists resume_presets_slug_idx on public.resume_presets(slug);

drop trigger if exists resume_presets_updated_at on public.resume_presets;
create trigger resume_presets_updated_at
before update on public.resume_presets
for each row execute procedure public.touch_updated_at();

alter table public.resume_presets enable row level security;

drop policy if exists "resume_presets_select_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_select_public" on public.resume_presets;
drop policy if exists "resume_presets_insert_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_update_own_or_staff" on public.resume_presets;
drop policy if exists "resume_presets_delete_own_or_staff" on public.resume_presets;

create policy "resume_presets_select_own_or_staff"
on public.resume_presets
for select
using (public.can_access_target_user(user_id));

create policy "resume_presets_select_public"
on public.resume_presets
for select
using (is_public = true);

create policy "resume_presets_insert_own_or_staff"
on public.resume_presets
for insert
with check (
  public.can_manage_target_user(user_id)
  and exists (
    select 1
    from public.resume_documents d
    where d.id = resume_presets.document_id
      and d.user_id = resume_presets.user_id
  )
);

create policy "resume_presets_update_own_or_staff"
on public.resume_presets
for update
using (public.can_access_target_user(user_id))
with check (
  public.can_manage_target_user(user_id)
  and exists (
    select 1
    from public.resume_documents d
    where d.id = resume_presets.document_id
      and d.user_id = resume_presets.user_id
  )
);

create policy "resume_presets_delete_own_or_staff"
on public.resume_presets
for delete
using (public.can_manage_target_user(user_id));
