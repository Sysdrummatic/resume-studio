-- Snapshots contain the full private Experience Base YAML. Only server-side
-- publication resolvers may turn them into selection-filtered public content.
drop policy if exists "resume_published_cvs_select_active_public"
  on public.resume_published_cvs;
drop policy if exists "resume_published_cv_locales_select_active_public"
  on public.resume_published_cv_locales;

-- Supabase grants anon table access by default; deny direct reads as well.
revoke select on public.resume_published_cvs from anon;
revoke select on public.resume_published_cv_locales from anon;
