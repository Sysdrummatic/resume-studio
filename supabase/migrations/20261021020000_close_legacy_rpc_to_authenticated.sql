-- 20261021010000 closed the legacy resumes/public_links RPCs to anon, but left them executable by
-- `authenticated`. They are SECURITY DEFINER, so they skip the table policies and ownership checks:
-- any signed-in user could read another account's legacy resume (get_public_resume_by_slug), inflate
-- view counters (increment_public_link_view) or list accounts (get_admin_user_overview checks
-- only auth.uid() = admin). The application no longer calls them; only service_role keeps access.
revoke execute on function public.get_public_resume_by_slug(text) from public, anon, authenticated;
revoke execute on function public.increment_public_link_view(text) from public, anon, authenticated;
revoke execute on function public.get_admin_user_overview() from public, anon, authenticated;
