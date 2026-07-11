-- Migration: Add user-facing reason column to platform_feature_flags and
-- seed the login_restricted flag (Beta test mode: Restrict access).
begin;

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'platform_feature_flags' and column_name = 'reason') then
    alter table public.platform_feature_flags add column reason text;
  end if;
end;
$$;

insert into public.platform_feature_flags (key, enabled, description)
values ('login_restricted', false, 'Beta test mode: block sign-in/sign-up for non-staff users. reason column holds the user-facing message.')
on conflict (key) do nothing;

commit;
