# Deployment and QA Checklist

Use this checklist for preview and production validation.

## Pre-deploy checks

- [ ] CI workflow `.github/workflows/ci.yml` is green.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes (or environment limitation is documented).
- [ ] Required Supabase migrations are applied.

## Functional QA (Phase C/D baseline)

1. Auth:
   - sign up with permanent email,
   - verify email,
   - sign in,
   - sign out,
   - sign in again.
2. Protected routes:
   - unauthenticated access to `/dashboard`/`/master-resume`/`/admin` redirects to `/login`,
   - inactive account cannot access protected routes.
3. Admin panel:
   - admin can update role/status/delete users,
   - manager cannot modify/delete admin or manager.
4. Audit:
   - privileged operations create rows in `admin_audit_logs`.
5. Editor canvas:
   - open `/master-resume` and verify split form + live preview,
   - switch EN/PL and verify separate locale content,
   - save/restore/clear draft,
   - publish creates a revision,
   - rollback restores selected revision.
6. Public-link management:
   - published CV Versions show canonical `/{person-slug}/{public-id}` before compatibility `/r/[slug]`,
   - private CV Versions do not expose copyable public URLs,
   - copy/open actions target the canonical public URL,
   - editor Public Link panel can publish a Saved Version with selected languages, default locale, and indexing,
   - unpublish revokes the active Public Link and removes active link actions without deleting the CV Version,
   - public route still renders the immutable Published CV snapshot after private draft edits.
   - editor Public Link panel and dashboard Saved Version list show consistent state after publish/unpublish.

## Post-deploy

- [ ] Validate Netlify deploy serves latest build.
- [ ] Confirm legacy redirects (`*.html`) still resolve.
- [ ] Run smoke checks for `/login`, `/dashboard`, `/admin`, `/master-resume`, `/{person-slug}/{public-id}`, `/r/{slug}`.
- [ ] Capture screenshots/PDF evidence for release notes if needed.

## Future React rollout QA

- [ ] Route parity checks between static and migrated pages.
- [ ] Hydration/runtime console error checks in preview.
- [ ] Component-level regression checks for migrated flows.
