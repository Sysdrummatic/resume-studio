-- The pre-publication-snapshot tables `resumes` and `public_links` (and the RPCs built on
-- them) are no longer used by the application, but their public SELECT policies and the
-- default `anon`/PUBLIC grants left them world-readable: every account gets an
-- `is_public = true` row from seed_user_master_resume(), so anyone holding the public anon
-- key could read `resumes.data`, `content_yaml` and `template_yaml` (ADR 0008: master data
-- is never exposed publicly), and could inflate legacy view counters.
drop policy if exists "resumes_select_public" on public.resumes;
drop policy if exists "public_links_select_active" on public.public_links;

revoke all on public.resumes from anon;
revoke all on public.public_links from anon;

-- Functions are executable by PUBLIC by default, so revoking from anon alone would not help.
revoke execute on function public.get_public_resume_by_slug(text) from public, anon;
revoke execute on function public.increment_public_link_view(text) from public, anon;
revoke execute on function public.get_admin_user_overview() from public, anon;

grant execute on function public.get_public_resume_by_slug(text) to authenticated, service_role;
grant execute on function public.increment_public_link_view(text) to authenticated, service_role;
grant execute on function public.get_admin_user_overview() to authenticated, service_role;
