-- Migration: Seed beta_test_scenarios_visible feature flag (ADR 0020).
-- Master kill-switch for the Test Scenarios docs category. UX gate only —
-- per-user is_test_user remains the access gate. Admin flips it via SQL,
-- matching the user_data_transfer_enabled precedent (ADR 0018).
begin;

insert into public.platform_feature_flags (key, enabled, description)
values ('beta_test_scenarios_visible', true, 'Show the Test Scenarios docs category to beta-test accounts. Controllable by admin via SQL.')
on conflict (key) do nothing;

commit;
