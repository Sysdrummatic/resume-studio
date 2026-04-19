-- Phase C foundation schema for OpenCVHub.
-- Apply in Supabase SQL Editor or via Supabase CLI.

begin;

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Master resume',
  data jsonb not null default '{}'::jsonb,
  locale text not null default 'en',
  slug text not null unique,
  is_public boolean not null default true,
  allow_indexing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_configurations (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  visibility jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (resume_id, name)
);

create table if not exists public.public_links (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  configuration_id uuid references public.resume_configurations(id) on delete set null,
  slug text not null unique,
  is_active boolean not null default true,
  allow_indexing boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.uploaded_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  file_type text not null check (file_type in ('resume_pdf', 'profile_image', 'generated_pdf')),
  original_name text,
  parsed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists resumes_user_id_idx on public.resumes(user_id);
create index if not exists resumes_slug_idx on public.resumes(slug);
create index if not exists resume_configurations_resume_id_idx on public.resume_configurations(resume_id);
create index if not exists resume_configurations_user_id_idx on public.resume_configurations(user_id);
create index if not exists public_links_resume_id_idx on public.public_links(resume_id);
create index if not exists public_links_slug_idx on public.public_links(slug);
create index if not exists uploaded_files_user_id_idx on public.uploaded_files(user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.touch_updated_at();

drop trigger if exists resumes_updated_at on public.resumes;
create trigger resumes_updated_at
before update on public.resumes
for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_configurations enable row level security;
alter table public.public_links enable row level security;
alter table public.uploaded_files enable row level security;

-- Profiles policies
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Resumes policies
create policy "resumes_select_own"
on public.resumes
for select
using (auth.uid() = user_id);

create policy "resumes_insert_own"
on public.resumes
for insert
with check (auth.uid() = user_id);

create policy "resumes_update_own"
on public.resumes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "resumes_delete_own"
on public.resumes
for delete
using (auth.uid() = user_id);

create policy "resumes_select_public"
on public.resumes
for select
using (is_public = true);

-- Resume configurations policies
create policy "resume_configurations_select_own"
on public.resume_configurations
for select
using (auth.uid() = user_id);

create policy "resume_configurations_insert_own"
on public.resume_configurations
for insert
with check (auth.uid() = user_id);

create policy "resume_configurations_update_own"
on public.resume_configurations
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "resume_configurations_delete_own"
on public.resume_configurations
for delete
using (auth.uid() = user_id);

-- Public links policies
create policy "public_links_select_active"
on public.public_links
for select
using (is_active = true);

create policy "public_links_select_own"
on public.public_links
for select
using (
  exists (
    select 1
    from public.resumes r
    where r.id = public_links.resume_id
      and r.user_id = auth.uid()
  )
);

create policy "public_links_insert_own"
on public.public_links
for insert
with check (
  exists (
    select 1
    from public.resumes r
    where r.id = public_links.resume_id
      and r.user_id = auth.uid()
  )
);

create policy "public_links_update_own"
on public.public_links
for update
using (
  exists (
    select 1
    from public.resumes r
    where r.id = public_links.resume_id
      and r.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.resumes r
    where r.id = public_links.resume_id
      and r.user_id = auth.uid()
  )
);

create policy "public_links_delete_own"
on public.public_links
for delete
using (
  exists (
    select 1
    from public.resumes r
    where r.id = public_links.resume_id
      and r.user_id = auth.uid()
  )
);

-- Uploaded files policies
create policy "uploaded_files_select_own"
on public.uploaded_files
for select
using (auth.uid() = user_id);

create policy "uploaded_files_insert_own"
on public.uploaded_files
for insert
with check (auth.uid() = user_id);

create policy "uploaded_files_update_own"
on public.uploaded_files
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "uploaded_files_delete_own"
on public.uploaded_files
for delete
using (auth.uid() = user_id);

-- Admin policies (global read/write when role = admin)
create policy "admin_full_profiles"
on public.profiles
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admin_full_resumes"
on public.resumes
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admin_full_resume_configurations"
on public.resume_configurations
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admin_full_public_links"
on public.public_links
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

create policy "admin_full_uploaded_files"
on public.uploaded_files
for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

commit;
