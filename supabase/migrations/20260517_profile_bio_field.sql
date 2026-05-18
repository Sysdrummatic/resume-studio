-- Migration: Add bio field to profiles and update staff overview.
begin;

-- 1. Add bio column if not exists
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'bio') then
    alter table public.profiles add column bio text;
  end if;
end;
$$;

-- 2. Update staff overview function to include bio
drop function if exists public.get_staff_user_overview();

create or replace function public.get_staff_user_overview()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  bio text,
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
    p.bio,
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

-- 3. Ensure users can update their own bio through RLS or trigger
-- (Already handled by general profile update policy, but let's be explicit if needed)

commit;
