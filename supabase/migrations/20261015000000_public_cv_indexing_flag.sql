-- Migration: seed platform_feature_flags.public_cv_indexing_enabled (default false).
-- Public CV indexing is paused (SEO plan T04). Stored allow_indexing values are
-- kept; the app treats them as effective only while this flag is enabled
-- (fail-closed: a missing row also means disabled). Re-enable with:
--   update public.platform_feature_flags set enabled = true where key = 'public_cv_indexing_enabled';
begin;

insert into public.platform_feature_flags (key, enabled, description)
values ('public_cv_indexing_enabled', false, 'Allow public CVs to be indexed by search engines (links with allow_indexing=true). Paused by default.')
on conflict (key) do nothing;

commit;
