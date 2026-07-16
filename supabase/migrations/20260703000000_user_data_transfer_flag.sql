-- Migration: Seed user_data_transfer_enabled feature flag (ADR 0018).
-- Controls dashboard Export/Import of the user's CV data bundle.
begin;

insert into public.platform_feature_flags (key, enabled, description)
values ('user_data_transfer_enabled', true, 'Allow users to export/import their CV data bundle from the dashboard. Controllable by admin.')
on conflict (key) do nothing;

commit;
