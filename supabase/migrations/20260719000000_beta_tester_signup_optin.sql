-- Capture the beta-tester opt-in from signup metadata (ADR 0020, extends ADR 0019).
-- `is_test_user` is assigned at profile INSERT time only. The privileged-field
-- boundary (`profiles_guard_update`, 20260714) fires BEFORE UPDATE, so this
-- INSERT path is not blocked by it; post-signup changes remain admin-only via
-- the guarded RPCs (`set_user_flag` / `update_user_privileges`).
begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_display_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  parsed_first_name text := nullif(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '');
  parsed_last_name text := nullif(
    btrim(substr(coalesce(new.raw_user_meta_data ->> 'full_name', ''), length(split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)) + 1)),
    ''
  );
  -- coalesce: users created without the opt-in key (direct Auth API, tests,
  -- invites) yield NULL from ->>, which must become false, not a NOT NULL violation.
  signup_beta_opt_in boolean := coalesce((new.raw_user_meta_data ->> 'wants_beta_test_user') = 'true', false);
begin
  insert into public.profiles (id, display_name, first_name, last_name, name_sync_mode, is_test_user)
  values (new.id, raw_display_name, parsed_first_name, parsed_last_name, 'auto', signup_beta_opt_in)
  on conflict (id) do nothing;
  return new;
end;
$$;

commit;
