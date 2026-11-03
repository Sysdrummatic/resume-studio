-- Deactivating an account only set profiles.is_active = false, which the app
-- checks but the RLS helpers did not: a deactivated admin/manager with a still
-- valid session kept staff access through PostgREST (all profiles, audit log,
-- public-link management). current_user_role() feeds is_admin_user,
-- is_manager_user, is_staff_user and can_access_target_user, so an inactive
-- account now has no role and every one of them fails closed (NULL-safe:
-- they coalesce or compare with is distinct from).
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
  limit 1;
$$;
