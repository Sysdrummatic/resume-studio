# Deployment and QA Checklist

Use this checklist for PR previews and production release validation.

## Pre-deploy checks

- [ ] CI workflow `.github/workflows/ci.yml` is green.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes (or documented environment constraint).
- [ ] Required Supabase migrations are applied:
  - Phase B YAML data layer migration.
  - Phase C auth/RBAC/admin migration.

## Functional QA (Phase C baseline)

1. Auth:
   - sign up with permanent email,
   - verify email,
   - sign in,
   - sign out,
   - sign in again with same account.
2. Protected routes:
   - unauthenticated access to `/dashboard` redirects to `/login`,
   - inactive account cannot access protected routes.
3. Admin panel:
   - admin sees user list and can update role/status/delete users,
   - manager cannot modify or delete admin/manager accounts.
4. Audit:
   - privileged operations create rows in `admin_audit_logs`.
5. Editor canvas (Phase D):
   - open `/master-resume` and verify split form + live preview.
   - switch locale EN/PL and verify separate content.
   - save draft, reload page, restore draft.
   - publish and verify new revision appears.
   - rollback to an earlier revision and verify preview updates.

## Post-deploy

- [ ] Validate Netlify production deploy serves Next.js app correctly.
- [ ] Confirm legacy redirects (`*.html`) still resolve.
- [ ] Run smoke check for `/login`, `/dashboard`, `/admin`, `/r/{slug}`.
