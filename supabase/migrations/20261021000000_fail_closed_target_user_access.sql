-- can_access_target_user() let anonymous callers through. For anon, auth.uid() and
-- current_user_role() are NULL, so `actor_role = 'admin'` and `actor_role <> 'manager'`
-- both evaluate to NULL (not true) and the function fell through to the manager branch,
-- returning true for every target whose role is user/recruiter. Policies built on it
-- (resume_public_links insert/delete, profiles select/update) therefore applied to anon.
-- `is distinct from` makes a missing actor role fail closed.
create or replace function public.can_access_target_user(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  actor_role text;
  target_role text;
begin
  if target_user_id is null then
    return false;
  end if;

  if target_user_id = auth.uid() then
    return true;
  end if;

  actor_role := public.current_user_role();

  if actor_role = 'admin' then
    return true;
  end if;

  if actor_role is distinct from 'manager' then
    return false;
  end if;

  select p.role
  into target_role
  from public.profiles p
  where p.id = target_user_id;

  return coalesce(target_role in ('user', 'recruiter'), false);
end;
$function$;
