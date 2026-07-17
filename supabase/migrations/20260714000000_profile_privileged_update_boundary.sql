-- Protect privileged profile fields at the database boundary.
-- Authenticated profile updates are limited to an explicit safe-field allowlist.
-- Application roles change role, activity, and staff/test flags only through the
-- guarded, audited RPCs. The server-only service role cannot change flags.
begin;

-- This owner is reserved for the fixed-path privileged RPCs. Keeping it
-- NOLOGIN prevents authenticated sessions and unrelated definers from entering
-- the trigger's trusted-owner path.
do $$
declare
  role_state record;
  unexpected_memberships text;
begin
  if not exists (select 1 from pg_roles where rolname = 'profile_privileged_rpc_owner') then
    create role profile_privileged_rpc_owner
      nologin
      noinherit;
  end if;

  select
    r.rolcanlogin,
    r.rolsuper,
    r.rolcreatedb,
    r.rolcreaterole,
    r.rolinherit,
    r.rolreplication,
    r.rolbypassrls
  into strict role_state
  from pg_roles r
  where r.rolname = 'profile_privileged_rpc_owner';

  if role_state.rolcanlogin
     or role_state.rolsuper
     or role_state.rolcreatedb
     or role_state.rolcreaterole
     or role_state.rolinherit
     or role_state.rolreplication
     or role_state.rolbypassrls then
    raise exception 'profile_privileged_rpc_owner has unsafe attributes.';
  end if;

  select string_agg(
    format('%s -> %s', member_role.rolname, granted_role.rolname),
    ', ' order by member_role.rolname, granted_role.rolname
  )
  into unexpected_memberships
  from pg_auth_members membership
  join pg_roles granted_role on granted_role.oid = membership.roleid
  join pg_roles member_role on member_role.oid = membership.member
  where (
    granted_role.rolname = 'profile_privileged_rpc_owner'
    and member_role.rolname <> 'postgres'
  ) or member_role.rolname = 'profile_privileged_rpc_owner';

  if unexpected_memberships is not null then
    raise exception 'profile_privileged_rpc_owner has unexpected role memberships: %',
      unexpected_memberships;
  end if;
end;
$$;

grant profile_privileged_rpc_owner to postgres;

create or replace function public.current_profile_actor_id()
returns uuid
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select auth.uid();
$$;

create or replace function public.current_active_staff_role()
returns text
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select p.role
  from public.profiles p
  where p.id = public.current_profile_actor_id()
    and p.is_active = true
    and p.role in ('admin', 'manager')
  limit 1;
$$;

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid;
  actor_role text;
  jwt_role text := coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  expected_rpc regprocedure;
  trusted_rpc boolean := false;
  privileged_field_groups integer := 0;
  changed_flags integer := 0;
begin
  if jwt_role = 'service_role' or current_user = 'service_role' then
    if new.is_test_user is distinct from old.is_test_user
       or new.is_ocv_staff is distinct from old.is_ocv_staff then
      raise exception 'Service role cannot modify privileged profile flags directly.';
    end if;
    return new;
  end if;

  actor_id := public.current_profile_actor_id();
  actor_role := public.current_active_staff_role();

  if new.role is distinct from old.role then
    expected_rpc := to_regprocedure('public.set_user_role(uuid,text)');
    privileged_field_groups := privileged_field_groups + 1;
  end if;

  if new.is_active is distinct from old.is_active then
    expected_rpc := to_regprocedure('public.set_user_active(uuid,boolean)');
    privileged_field_groups := privileged_field_groups + 1;
  end if;

  if new.is_test_user is distinct from old.is_test_user then
    changed_flags := changed_flags + 1;
  end if;
  if new.is_ocv_staff is distinct from old.is_ocv_staff then
    changed_flags := changed_flags + 1;
  end if;
  if changed_flags > 0 then
    expected_rpc := to_regprocedure('public.set_user_flag(uuid,text,boolean)');
    privileged_field_groups := privileged_field_groups + 1;
  end if;

  if privileged_field_groups > 1 or changed_flags > 1 then
    expected_rpc := to_regprocedure(
      'public.update_user_privileges(uuid,text,boolean,boolean,boolean)'
    );
  end if;

  if privileged_field_groups >= 1 and expected_rpc is not null then
    select current_user = pg_get_userbyid(p.proowner)
    into trusted_rpc
    from pg_proc p
    where p.oid = expected_rpc;
  end if;

  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.is_test_user is distinct from old.is_test_user
     or new.is_ocv_staff is distinct from old.is_ocv_staff then
    if privileged_field_groups < 1 or not trusted_rpc then
      raise exception 'Privileged profile fields must be changed through an approved RPC.';
    end if;

    if actor_role not in ('admin', 'manager') then
      raise exception 'Staff role is required.';
    end if;

    if actor_role = 'manager' then
      if old.id = actor_id then
        raise exception 'Manager cannot modify own privileged profile fields.';
      end if;
      if old.role not in ('user', 'recruiter') then
        raise exception 'Manager can modify only user/recruiter.';
      end if;
    end if;

    if new.role is distinct from old.role
       and actor_role = 'manager'
       and new.role not in ('user', 'recruiter') then
      raise exception 'Manager cannot assign manager/admin roles.';
    end if;

    if (to_jsonb(new) - array['role', 'is_active', 'is_test_user', 'is_ocv_staff', 'updated_at'])
       is distinct from
       (to_jsonb(old) - array['role', 'is_active', 'is_test_user', 'is_ocv_staff', 'updated_at']) then
      raise exception 'Privileged RPC attempted to modify non-privileged profile fields.';
    end if;

    return new;
  end if;

  if actor_id is null or actor_id <> old.id then
    raise exception 'Profile update is not allowed.';
  end if;

  expected_rpc := to_regprocedure('public.update_own_profile(jsonb)');
  if expected_rpc is not null then
    select current_user = pg_get_userbyid(p.proowner)
    into trusted_rpc
    from pg_proc p
    where p.oid = expected_rpc;
  end if;

  if trusted_rpc then
    if (to_jsonb(new) - array[
          'display_name',
          'first_name',
          'last_name',
          'person_slug',
          'name_sync_mode',
          'avatar_url',
          'bio',
          'updated_at'
        ])
       is distinct from
       (to_jsonb(old) - array[
          'display_name',
          'first_name',
          'last_name',
          'person_slug',
          'name_sync_mode',
          'avatar_url',
          'bio',
          'updated_at'
        ]) then
      raise exception 'Own-profile RPC attempted a field outside its allowlist.';
    end if;
  elsif (to_jsonb(new) - array[
          'display_name',
          'first_name',
          'last_name',
          'person_slug',
          'avatar_url',
          'bio'
        ])
       is distinct from
       (to_jsonb(old) - array[
          'display_name',
          'first_name',
          'last_name',
          'person_slug',
          'avatar_url',
          'bio'
        ]) then
    raise exception 'Profile update contains fields outside the safe allowlist.';
  end if;

  return new;
end;
$$;

create or replace function public.set_user_role(target_user_id uuid, next_role text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role text;
  previous_role text;
  normalized_next_role text;
begin
  normalized_next_role := lower(coalesce(next_role, ''));
  if normalized_next_role not in ('admin', 'manager', 'user', 'recruiter') then
    raise exception 'Invalid role value.';
  end if;

  actor_role := public.current_active_staff_role();
  if actor_role is null then
    raise exception 'Active staff role is required.';
  end if;

  select p.role
  into previous_role
  from public.profiles p
  where p.id = target_user_id
  for update;

  if previous_role is null then
    raise exception 'Target profile not found.';
  end if;

  if actor_role = 'manager' then
    if target_user_id = public.current_profile_actor_id() then
      raise exception 'Manager cannot modify own role.';
    end if;
    if previous_role not in ('user', 'recruiter') then
      raise exception 'Manager can modify only user/recruiter.';
    end if;
    if normalized_next_role not in ('user', 'recruiter') then
      raise exception 'Manager cannot assign manager/admin roles.';
    end if;
  end if;

  if previous_role = normalized_next_role then
    return;
  end if;

  perform public.log_admin_action(
    'user.role_updated',
    target_user_id,
    jsonb_build_object(
      'actor_role', actor_role,
      'previous_role', previous_role,
      'next_role', normalized_next_role
    )
  );

  update public.profiles
  set role = normalized_next_role,
      updated_at = now()
  where id = target_user_id;
end;
$$;

create or replace function public.set_user_active(target_user_id uuid, target_is_active boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role text;
  target_role text;
  previous_active boolean;
begin
  if target_is_active is null then
    raise exception 'Account activity status is required.';
  end if;

  actor_role := public.current_active_staff_role();
  if actor_role is null then
    raise exception 'Active staff role is required.';
  end if;

  select p.role, p.is_active
  into target_role, previous_active
  from public.profiles p
  where p.id = target_user_id
  for update;

  if target_role is null then
    raise exception 'Target profile not found.';
  end if;

  if actor_role = 'manager' then
    if target_user_id = public.current_profile_actor_id() then
      raise exception 'Manager cannot modify own account status.';
    end if;
    if target_role not in ('user', 'recruiter') then
      raise exception 'Manager can modify only user/recruiter.';
    end if;
  end if;

  if previous_active = target_is_active then
    return;
  end if;

  update public.profiles
  set is_active = target_is_active,
      updated_at = now()
  where id = target_user_id;

  perform public.log_admin_action(
    'user.status_updated',
    target_user_id,
    jsonb_build_object(
      'actor_role', actor_role,
      'previous_is_active', previous_active,
      'next_is_active', target_is_active
    )
  );
end;
$$;

create or replace function public.set_user_flag(target_user_id uuid, flag_name text, flag_value boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role text;
  target_role text;
  previous_value boolean;
begin
  actor_role := public.current_active_staff_role();
  if actor_role is null then
    raise exception 'Active staff role is required.';
  end if;

  if flag_name is null or flag_name not in ('is_test_user', 'is_ocv_staff') then
    raise exception 'Unknown user flag.';
  end if;

  if flag_value is null then
    raise exception 'User flag value is required.';
  end if;

  select
    p.role,
    case flag_name when 'is_test_user' then p.is_test_user else p.is_ocv_staff end
  into target_role, previous_value
  from public.profiles p
  where p.id = target_user_id
  for update;

  if target_role is null then
    raise exception 'Target profile not found.';
  end if;

  if actor_role = 'manager' then
    if target_user_id = public.current_profile_actor_id() then
      raise exception 'Manager cannot modify own account flags.';
    end if;
    if target_role not in ('user', 'recruiter') then
      raise exception 'Manager can modify only user/recruiter.';
    end if;
  end if;

  if previous_value = flag_value then
    return;
  end if;

  if flag_name = 'is_test_user' then
    update public.profiles
    set is_test_user = flag_value,
        updated_at = now()
    where id = target_user_id;
  else
    update public.profiles
    set is_ocv_staff = flag_value,
        updated_at = now()
    where id = target_user_id;
  end if;

  perform public.log_admin_action(
    'user.flag_updated',
    target_user_id,
    jsonb_build_object(
      'actor_role', actor_role,
      'flag', flag_name,
      'previous', previous_value,
      'next', flag_value
    )
  );
end;
$$;

create or replace function public.update_user_privileges(
  target_user_id uuid,
  next_role text default null,
  target_is_active boolean default null,
  target_is_test_user boolean default null,
  target_is_ocv_staff boolean default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role text;
  previous_role text;
  previous_active boolean;
  previous_test_user boolean;
  previous_ocv_staff boolean;
  desired_role text;
  desired_active boolean;
  desired_test_user boolean;
  desired_ocv_staff boolean;
begin
  actor_role := public.current_active_staff_role();
  if actor_role is null then
    raise exception 'Active staff role is required.';
  end if;

  if next_role is not null and lower(next_role) not in ('admin', 'manager', 'user', 'recruiter') then
    raise exception 'Invalid role value.';
  end if;

  select p.role, p.is_active, p.is_test_user, p.is_ocv_staff
  into previous_role, previous_active, previous_test_user, previous_ocv_staff
  from public.profiles p
  where p.id = target_user_id
  for update;

  if previous_role is null then
    raise exception 'Target profile not found.';
  end if;

  desired_role := coalesce(lower(next_role), previous_role);
  desired_active := coalesce(target_is_active, previous_active);
  desired_test_user := coalesce(target_is_test_user, previous_test_user);
  desired_ocv_staff := coalesce(target_is_ocv_staff, previous_ocv_staff);

  if actor_role = 'manager' then
    if target_user_id = public.current_profile_actor_id() then
      raise exception 'Manager cannot modify own privileged profile fields.';
    end if;
    if previous_role not in ('user', 'recruiter') then
      raise exception 'Manager can modify only user/recruiter.';
    end if;
    if desired_role not in ('user', 'recruiter') then
      raise exception 'Manager cannot assign manager/admin roles.';
    end if;
  end if;

  if previous_role = desired_role
     and previous_active = desired_active
     and previous_test_user = desired_test_user
     and previous_ocv_staff = desired_ocv_staff then
    return;
  end if;

  if previous_role is distinct from desired_role then
    perform public.log_admin_action(
      'user.role_updated',
      target_user_id,
      jsonb_build_object(
        'actor_role', actor_role,
        'previous_role', previous_role,
        'next_role', desired_role
      )
    );
  end if;

  if previous_active is distinct from desired_active then
    perform public.log_admin_action(
      'user.status_updated',
      target_user_id,
      jsonb_build_object(
        'actor_role', actor_role,
        'previous_is_active', previous_active,
        'next_is_active', desired_active
      )
    );
  end if;

  if previous_test_user is distinct from desired_test_user then
    perform public.log_admin_action(
      'user.flag_updated',
      target_user_id,
      jsonb_build_object(
        'actor_role', actor_role,
        'flag', 'is_test_user',
        'previous', previous_test_user,
        'next', desired_test_user
      )
    );
  end if;

  if previous_ocv_staff is distinct from desired_ocv_staff then
    perform public.log_admin_action(
      'user.flag_updated',
      target_user_id,
      jsonb_build_object(
        'actor_role', actor_role,
        'flag', 'is_ocv_staff',
        'previous', previous_ocv_staff,
        'next', desired_ocv_staff
      )
    );
  end if;

  update public.profiles
  set role = desired_role,
      is_active = desired_active,
      is_test_user = desired_test_user,
      is_ocv_staff = desired_ocv_staff,
      updated_at = now()
  where id = target_user_id;
end;
$$;

grant usage on schema public to profile_privileged_rpc_owner;
grant select (id, role, is_active, is_test_user, is_ocv_staff)
on table public.profiles to profile_privileged_rpc_owner;
grant update (role, is_active, is_test_user, is_ocv_staff, updated_at)
on table public.profiles to profile_privileged_rpc_owner;
grant execute on function public.current_profile_actor_id() to profile_privileged_rpc_owner;
grant execute on function public.current_active_staff_role() to profile_privileged_rpc_owner;
grant execute on function public.log_admin_action(text, uuid, jsonb) to profile_privileged_rpc_owner;

drop policy if exists profiles_privileged_rpc_owner_select on public.profiles;
create policy profiles_privileged_rpc_owner_select
on public.profiles
for select
to profile_privileged_rpc_owner
using (true);

drop policy if exists profiles_privileged_rpc_owner_update on public.profiles;
create policy profiles_privileged_rpc_owner_update
on public.profiles
for update
to profile_privileged_rpc_owner
using (true)
with check (true);

grant create on schema public to profile_privileged_rpc_owner;
alter function public.set_user_role(uuid, text) owner to profile_privileged_rpc_owner;
alter function public.set_user_active(uuid, boolean) owner to profile_privileged_rpc_owner;
alter function public.set_user_flag(uuid, text, boolean) owner to profile_privileged_rpc_owner;
alter function public.update_user_privileges(uuid, text, boolean, boolean, boolean) owner to profile_privileged_rpc_owner;
revoke create on schema public from profile_privileged_rpc_owner;

revoke execute on function public.current_profile_actor_id() from public, anon;
revoke execute on function public.current_active_staff_role() from public, anon;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
revoke execute on function public.set_user_active(uuid, boolean) from public, anon;
revoke execute on function public.set_user_flag(uuid, text, boolean) from public, anon;
revoke execute on function public.update_user_privileges(uuid, text, boolean, boolean, boolean) from public, anon;

revoke update on table public.profiles from public, anon, authenticated, service_role;
grant update (display_name, first_name, last_name, avatar_url, bio)
on table public.profiles to authenticated;
grant update (
  display_name,
  first_name,
  last_name,
  person_slug,
  name_sync_mode,
  avatar_url,
  bio,
  role,
  is_active,
  updated_at
)
on table public.profiles to service_role;

grant execute on function public.current_profile_actor_id() to authenticated, service_role;
grant execute on function public.current_active_staff_role() to authenticated, service_role;
revoke execute on function public.set_user_role(uuid, text) from service_role;
revoke execute on function public.set_user_active(uuid, boolean) from service_role;
revoke execute on function public.set_user_flag(uuid, text, boolean) from service_role;
revoke execute on function public.update_user_privileges(uuid, text, boolean, boolean, boolean) from service_role;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;
grant execute on function public.set_user_flag(uuid, text, boolean) to authenticated;
grant execute on function public.update_user_privileges(uuid, text, boolean, boolean, boolean) to authenticated;

commit;
