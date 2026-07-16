-- Fix RLS recursion for profiles/admin policies.
-- Error addressed: "infinite recursion detected in policy for relation \"profiles\""

begin;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

drop policy if exists "admin_full_profiles" on public.profiles;
drop policy if exists "admin_full_resumes" on public.resumes;
drop policy if exists "admin_full_resume_configurations" on public.resume_configurations;
drop policy if exists "admin_full_public_links" on public.public_links;
drop policy if exists "admin_full_uploaded_files" on public.uploaded_files;

create policy "admin_full_profiles"
on public.profiles
for all
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admin_full_resumes"
on public.resumes
for all
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admin_full_resume_configurations"
on public.resume_configurations
for all
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admin_full_public_links"
on public.public_links
for all
using (public.is_admin_user())
with check (public.is_admin_user());

create policy "admin_full_uploaded_files"
on public.uploaded_files
for all
using (public.is_admin_user())
with check (public.is_admin_user());

grant execute on function public.is_admin_user() to authenticated;

commit;
