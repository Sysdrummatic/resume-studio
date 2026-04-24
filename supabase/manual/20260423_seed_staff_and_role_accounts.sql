-- Manual SQL script for PROD/TEST Supabase projects.
-- Purpose:
-- 1) Require that required auth emails already exist.
-- 2) Ensure matching public.profiles rows exist.
-- 3) Assign target RBAC roles.
--
-- Role mapping requested by product:
-- - ADMIN -> 'admin'
-- - MANAGER -> 'manager'
-- - RECRUITER -> 'recruiter'
-- - STANDARD_USER -> 'user'

begin;

-- Required because public.guard_profile_update() allows profile role/activity updates
-- only for admin/manager actors, or when jwt role is service_role.
select set_config('request.jwt.claim.role', 'service_role', true);

do $$
declare
  target record;
  target_user_id uuid;
  normalized_email text;
  missing_emails text[] := array[]::text[];
begin
  for target in
    select *
    from (
      values
        ('opencvproject+admin@proton.me', 'admin'),
        ('opencvproject+manager@proton.me', 'manager'),
        ('opencvproject+recruiter@proton.me', 'recruiter'),
        ('opencvproject+user@proton.me', 'user')
    ) as seed(email, app_role)
  loop
    normalized_email := lower(trim(target.email));

    select u.id
    into target_user_id
    from auth.users u
    where lower(u.email) = normalized_email
    limit 1;

    if target_user_id is null then
      missing_emails := array_append(missing_emails, normalized_email);
      continue;
    end if;

    insert into public.profiles (id, display_name, role, is_active)
    values (
      target_user_id,
      split_part(normalized_email, '@', 1),
      target.app_role,
      true
    )
    on conflict (id) do update
      set role = excluded.role,
          is_active = true,
          updated_at = now();
  end loop;

  if array_length(missing_emails, 1) > 0 then
    raise exception
      'Missing auth.users rows for required staff emails: %. Create these users with known passwords (signup/admin invite), then rerun this script.',
      array_to_string(missing_emails, ', ');
  end if;
end
$$;

commit;

-- Verification helper:
-- select u.email, p.role, p.is_active
-- from auth.users u
-- join public.profiles p on p.id = u.id
-- where lower(u.email) in (
--   'opencvproject+admin@proton.me',
--   'opencvproject+manager@proton.me',
--   'opencvproject+recruiter@proton.me',
--   'opencvproject+user@proton.me'
-- )
-- order by u.email;
