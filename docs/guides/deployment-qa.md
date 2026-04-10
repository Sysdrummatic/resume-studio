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

## Post-deploy

- [ ] Validate Netlify deploy serves latest build.
- [ ] Confirm legacy redirects (`*.html`) still resolve.
- [ ] Run smoke checks for `/login`, `/dashboard`, `/admin`, `/master-resume`, `/r/{slug}`.
- [ ] Capture screenshots/PDF evidence for release notes if needed.

## Future React rollout QA

- [ ] Route parity checks between static and migrated pages.
- [ ] Hydration/runtime console error checks in preview.
- [ ] Component-level regression checks for migrated flows.
