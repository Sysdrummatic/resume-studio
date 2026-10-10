-- A saved CV version with an active public link must be marked public.
--
-- Until ocv-0214, editing a published version sent isPublic=false and
-- saveResumePreset wrote it, so the version looked private in the dashboard
-- while its link stayed active. publish_resume_saved_version sets is_public
-- and unpublish_resume_saved_version clears it together with revoking the
-- link, so "active link" and "is_public" must always agree. The application no
-- longer resets the flag on edit; this repairs rows damaged before that fix.
-- Idempotent: it only touches presets that disagree with their active link.

update public.resume_presets p
set is_public = true
where p.is_public = false
  and exists (
    select 1
    from public.resume_public_links l
    where l.preset_id = p.id
      and l.status = 'active'
      and l.is_active = true
  );
