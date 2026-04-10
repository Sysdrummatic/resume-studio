-- Phase C auth + RBAC + admin core helpers.
-- Adds staff-safe RPC functions for user management and audit logging.

begin;

create or replace function public.log_admin_action(
  input_action text,
  input_target_user_id uuid default null,
  input_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_id uuid;
begin
  if not public.is_staff_user() then
    raise exception 'Staff role is required.';
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_user_id,
    metadata
  )
  values (
    auth.uid(),
    input_action,
    input_target_user_id,
    coalesce(input_metadata, '{}'::jsonb)
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

create or replace function public.can_delete_user_account(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  actor_role text;
  target_role text;
begin
  if target_user_id is null then
    return false;
  end if;

  actor_role := public.current_user_role();

  select p.role
  into target_role
  from public.profiles p
  where p.id = target_user_id;

  if target_role is null then
    return false;
  end if;

  if actor_role = 'admin' then
    return true;
  end if;

  if actor_role = 'manager' then
    if target_user_id = auth.uid() then
      return false;
    end if;
    return target_role in ('user', 'recruiter');
  end if;

  return false;
end;
$$;

create or replace function public.set_user_role(target_user_id uuid, next_role text)
returns void
language plpgsql
security definer
set search_path = public
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

  actor_role := public.current_user_role();
  if actor_role not in ('admin', 'manager') then
    raise exception 'Staff role is required.';
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
    if target_user_id = auth.uid() then
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

  update public.profiles
  set role = normalized_next_role,
      updated_at = now()
  where id = target_user_id;

  perform public.log_admin_action(
    'user.role_updated',
    target_user_id,
    jsonb_build_object(
      'actor_role', actor_role,
      'previous_role', previous_role,
      'next_role', normalized_next_role
    )
  );
end;
$$;

create or replace function public.set_user_active(target_user_id uuid, target_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
  previous_active boolean;
begin
  actor_role := public.current_user_role();
  if actor_role not in ('admin', 'manager') then
    raise exception 'Staff role is required.';
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
    if target_user_id = auth.uid() then
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

create or replace function public.get_staff_user_overview()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    p.is_active,
    p.created_at,
    p.updated_at
  from public.profiles p
  left join auth.users u on u.id = p.id
  where
    (
      public.current_user_role() = 'admin'
      or (
        public.current_user_role() = 'manager'
        and (p.id = auth.uid() or p.role in ('user', 'recruiter'))
      )
    )
  order by p.created_at desc;
$$;

create or replace function public.get_admin_platform_stats()
returns table (
  total_users bigint,
  active_users bigint,
  total_resumes bigint,
  total_public_links bigint,
  total_public_views bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles) as total_users,
    (select count(*) from public.profiles where is_active = true) as active_users,
    (select count(*) from public.resume_documents) as total_resumes,
    (select count(*) from public.resume_public_links where is_active = true) as total_public_links,
    (select coalesce(sum(view_count), 0) from public.resume_public_links where is_active = true) as total_public_views
  where public.is_staff_user();
$$;

grant execute on function public.log_admin_action(text, uuid, jsonb) to authenticated;
grant execute on function public.can_delete_user_account(uuid) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.set_user_active(uuid, boolean) to authenticated;
grant execute on function public.get_staff_user_overview() to authenticated;
grant execute on function public.get_admin_platform_stats() to authenticated;

commit;
