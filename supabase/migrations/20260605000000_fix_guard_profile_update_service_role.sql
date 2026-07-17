-- Fix guard_profile_update() so its service_role bypass actually fires.
--
-- Symptom addressed: "Profile update is not allowed." (status=400) raised during CV
-- publish when refreshProfilePersonSlugForPublish issues a service-role UPDATE on profiles.
--
-- Root cause: the trigger detected the service role via
--   current_setting('request.jwt.claim.role', true)
-- which is the deprecated per-claim GUC. PostgREST v9+ (current Supabase) no longer sets
-- request.jwt.claim.* ; claims live in the request.jwt.claims JSON GUC. As a result jwt_role
-- was NULL for genuine service-role calls, the bypass was skipped, and because auth.uid() is
-- also NULL under the service role the function fell through to its final
-- "Profile update is not allowed." exception.
--
-- Fix: read the role from request.jwt.claims (JSON) with a fallback to the legacy GUC so the
-- detection works across PostgREST versions. All other guard branches are preserved verbatim.

begin;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text := public.current_user_role();
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  if jwt_role = 'service_role' then
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

commit;
