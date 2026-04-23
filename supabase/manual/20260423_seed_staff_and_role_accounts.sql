-- Manual SQL script for PROD/TEST Supabase projects.
-- Purpose:
-- 1) Ensure required auth emails exist.
-- 2) Ensure matching public.profiles rows exist.
-- 3) Assign target RBAC roles.
--
-- Role mapping requested by product:
-- - ADMIN -> 'admin'
-- - MANAGER -> 'manager'
-- - RECRUITER -> 'recruiter'
-- - STANDARD_USER -> 'user'

begin;

create extension if not exists pgcrypto;

do $$
declare
  target record;
  target_user_id uuid;
  normalized_email text;
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
      target_user_id := gen_random_uuid();

      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      )
      values (
        target_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        normalized_email,
        crypt(gen_random_uuid()::text, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', split_part(normalized_email, '@', 1)),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        created_at,
        updated_at,
        last_sign_in_at
      )
      values (
        gen_random_uuid(),
        target_user_id,
        jsonb_build_object('sub', target_user_id::text, 'email', normalized_email),
        'email',
        normalized_email,
        now(),
        now(),
        now()
      )
      on conflict (provider, provider_id) do nothing;
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
