# Deployment and QA Checklist

Use this checklist for preview and production validation.

## Pre-deploy checks

- [ ] CI workflow `.github/workflows/ci.yml` is green.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes (or environment limitation is documented).
- [ ] Required Supabase migrations are applied.

## Automated preview smoke

The smoke runner uses the repository's existing Playwright dev dependency. Verify
it locally before use; do not install a different browser-test package:

```powershell
npm.cmd ls playwright --depth=0
$env:PREVIEW_URL = "https://deploy-preview.example.net"
npm.cmd run smoke:preview
Remove-Item Env:PREVIEW_URL
```

You can use `--base=<url>` instead of `PREVIEW_URL`. The base must be an explicit
HTTP(S) deployment root and cannot contain credentials. Evidence is written to
`tmp/preview-smoke/` unless `--output=<directory>` is supplied.

The anonymous suite verifies `/`, `/login`, `/privacy`, `/terms`, and `/resume`,
then confirms that `/dashboard`, `/master-resume`, and `/admin` redirect to
`/login?reason=signed-out`. It fails on an unexpected final route or status,
browser/console exceptions, same-origin server errors, and failed same-origin
resources. Expected aborted Next.js link-prefetch requests are ignored.

This is a deploy smoke gate, not an authenticated E2E suite. It does not prove
auth delivery, RBAC, RLS, persistence, publication, rollback, or exports.

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
   - published CV Versions show the canonical `/{person-slug}/{public-id}` link,
   - private CV Versions do not expose copyable public URLs,
   - copy/open actions target the canonical public URL,
   - editor Public Link panel can publish a Saved Version with selected languages, default locale, and indexing,
   - unpublish revokes the active Public Link and removes active link actions without deleting the CV Version,
   - public route still renders the immutable Published CV snapshot after private draft edits.
   - editor Public Link panel and dashboard Saved Version list show consistent state after publish/unpublish.

## Post-deploy

- [ ] Validate Netlify deploy serves latest build.
- [ ] Run smoke checks for `/login`, `/dashboard`, `/admin`, `/master-resume`, `/{person-slug}/{public-id}`.
- [ ] Capture screenshots/PDF evidence for release notes if needed.
- [ ] Confirm retired `.html` entry points and redirects were not restored; the
      canonical application routes are the supported surface.
