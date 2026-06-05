-- Defensive re-assertion of profiles RLS policies to guarantee no self-referential
-- (recursive) policy survives in any environment.
--
-- Symptom addressed: "infinite recursion detected in policy for relation \"profiles\""
-- raised during CV publish (refreshProfilePersonSlugForPublish UPDATE on profiles).
--
-- Root cause of recursion: legacy inline policies (20260405_phase_c_foundation.sql)
-- referenced public.profiles inside their own USING/WITH CHECK. The 20260406 fix moved
-- admin checks to the SECURITY DEFINER helper public.is_admin_user(); this migration makes
-- that state idempotent and also re-asserts the own-row and manager policies via the
-- SECURITY DEFINER helpers so a user-context profiles write can never recurse.

begin;

-- Ensure the helper exists (no-op if already present from earlier migrations).
create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- Own-row access: plain auth.uid() comparison, never references the table body.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admin access routed exclusively through the SECURITY DEFINER helper (bypasses RLS).
drop policy if exists "admin_full_profiles" on public.profiles;
create policy "admin_full_profiles"
on public.profiles
for all
using (public.is_admin_user())
with check (public.is_admin_user());

-- Manager access routed through SECURITY DEFINER helpers (bypass RLS internally).
drop policy if exists "manager_profiles_select_manageable" on public.profiles;
create policy "manager_profiles_select_manageable"
on public.profiles
for select
using (public.can_access_target_user(id));

drop policy if exists "manager_profiles_update_manageable" on public.profiles;
create policy "manager_profiles_update_manageable"
on public.profiles
for update
using (public.can_access_target_user(id))
with check (public.can_manage_target_user(id) or public.is_admin_user());

-- Guard: fail the migration if any live profiles policy still references the
-- profiles table inside its own qual/with-check expression (i.e. is recursive).
do $$
declare
  recursive_policy text;
begin
  select string_agg(pol.polname, ', ')
  into recursive_policy
  from pg_policy pol
  where pol.polrelid = 'public.profiles'::regclass
    and (
      coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ~ '\mprofiles\M'
      or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ~ '\mprofiles\M'
    );

  if recursive_policy is not null then
    raise exception 'Recursive profiles RLS policy still present: %', recursive_policy;
  end if;
end;
$$;

commit;
