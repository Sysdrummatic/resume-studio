-- Migration: Add is_test_user / is_ocv_staff flags to profiles,
-- exclude flagged accounts from platform stats, expose flags in staff overview.
begin;

-- 1. Add flag columns if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_test_user') then
    alter table public.profiles add column is_test_user boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_ocv_staff') then
    alter table public.profiles add column is_ocv_staff boolean not null default false;
  end if;
end;
$$;

-- 2. Setter RPC (same boundaries as set_user_active), audited via log_admin_action
create or replace function public.set_user_flag(target_user_id uuid, flag_name text, flag_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
  previous_value boolean;
begin
  actor_role := public.current_user_role();
  if actor_role not in ('admin', 'manager') then
    raise exception 'Staff role is required.';
  end if;

  if flag_name not in ('is_test_user', 'is_ocv_staff') then
    raise exception 'Unknown user flag.';
  end if;

  select p.role,
         case flag_name when 'is_test_user' then p.is_test_user else p.is_ocv_staff end
  into target_role, previous_value
  from public.profiles p
  where p.id = target_user_id
  for update;

  if target_role is null then
    raise exception 'Target profile not found.';
  end if;

  if actor_role = 'manager' then
    if target_user_id = auth.uid() then
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
    update public.profiles set is_test_user = flag_value, updated_at = now() where id = target_user_id;
  else
    update public.profiles set is_ocv_staff = flag_value, updated_at = now() where id = target_user_id;
  end if;

  perform public.log_admin_action(
    'user.flag_updated',
    target_user_id,
    jsonb_build_object('flag', flag_name, 'previous', previous_value, 'next', flag_value)
  );
end;
$$;

-- 3. Staff overview includes the flags
drop function if exists public.get_staff_user_overview();

create or replace function public.get_staff_user_overview()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  bio text,
  is_active boolean,
  is_test_user boolean,
  is_ocv_staff boolean,
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
    p.bio,
    p.is_active,
    p.is_test_user,
    p.is_ocv_staff,
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

-- 4. Platform stats exclude flagged accounts and report the excluded counts
drop function if exists public.get_admin_platform_stats();

create or replace function public.get_admin_platform_stats()
returns table (
  total_users bigint,
  active_users bigint,
  total_resumes bigint,
  total_public_links bigint,
  total_public_views bigint,
  excluded_test_users bigint,
  excluded_staff_users bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.profiles where not (is_test_user or is_ocv_staff)) as total_users,
    (select count(*) from public.profiles where is_active = true and not (is_test_user or is_ocv_staff)) as active_users,
    (select count(*)
       from public.resume_documents d
       join public.profiles p on p.id = d.user_id
      where not (p.is_test_user or p.is_ocv_staff)) as total_resumes,
    (select count(*)
       from public.resume_public_links l
       join public.resume_documents d on d.id = l.document_id
       join public.profiles p on p.id = d.user_id
      where l.is_active = true and not (p.is_test_user or p.is_ocv_staff)) as total_public_links,
    (select coalesce(sum(l.view_count), 0)
       from public.resume_public_links l
       join public.resume_documents d on d.id = l.document_id
       join public.profiles p on p.id = d.user_id
      where l.is_active = true and not (p.is_test_user or p.is_ocv_staff)) as total_public_views,
    (select count(*) from public.profiles where is_test_user) as excluded_test_users,
    (select count(*) from public.profiles where is_ocv_staff) as excluded_staff_users
  where public.is_staff_user();
$$;

grant execute on function public.set_user_flag(uuid, text, boolean) to authenticated;
grant execute on function public.get_staff_user_overview() to authenticated;
grant execute on function public.get_admin_platform_stats() to authenticated;

commit;
