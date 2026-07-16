-- Migration: Platform feature flags table with admin-managed RLS.
-- Seeds pdf_draft_enabled controlling draft CV PDF export.
begin;

create table if not exists public.platform_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

alter table public.platform_feature_flags enable row level security;

drop policy if exists "feature_flags_select_authenticated" on public.platform_feature_flags;
create policy "feature_flags_select_authenticated"
  on public.platform_feature_flags for select
  using (auth.role() = 'authenticated');

drop policy if exists "feature_flags_all_admin" on public.platform_feature_flags;
create policy "feature_flags_all_admin"
  on public.platform_feature_flags for all
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

insert into public.platform_feature_flags (key, enabled, description)
values ('pdf_draft_enabled', true, 'Allow PDF export for unpublished draft CVs. Controllable by admin.')
on conflict (key) do nothing;

commit;
