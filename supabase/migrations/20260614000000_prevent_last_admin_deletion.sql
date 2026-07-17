-- Migration: Prevent the system from ever reaching a zero-admin state.
-- Adds a BEFORE DELETE trigger on public.profiles as a path-independent
-- backstop, covering both the admin-panel "delete user" flow and
-- self-service account deletion (DELETE /api/user/account).
begin;

create or replace function public.is_last_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = p_user_id and role = 'admin'
  )
  and not exists (
    select 1 from public.profiles where role = 'admin' and id <> p_user_id
  );
$$;

create or replace function public.is_only_profile(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where id <> p_user_id
  );
$$;

create or replace function public.prevent_last_admin_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_last_admin(old.id) then
    raise exception 'Cannot delete the last admin account. Promote another account to admin first.';
  end if;

  return old;
end;
$$;

drop trigger if exists profiles_prevent_last_admin_deletion on public.profiles;
create trigger profiles_prevent_last_admin_deletion
before delete on public.profiles
for each row
when (old.role = 'admin')
execute procedure public.prevent_last_admin_deletion();

grant execute on function public.is_last_admin(uuid) to authenticated;
grant execute on function public.is_only_profile(uuid) to authenticated;

commit;
