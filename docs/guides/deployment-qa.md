# Deployment and QA Checklist

Use this checklist when preparing a release or validating changes after deployment.

## Pre-Deployment

- [ ] Ensure GitHub Actions workflows pass (`workflow-deploy-pages.yml`).
- [ ] Confirm `npm test` succeeds locally.
- [ ] Verify private files (`data/private/*`) are excluded from commits.
- [ ] Update documentation or changelog entries linked in the README.

## Manual QA

1. Open the live preview (or staging environment) in Chrome and Firefox.
2. Switch between English and Polish to validate localization.
3. Test the admin login flow:
   - Enter the password from `data/private/user.env`.
   - Toggle visibility of optional sections and confirm layout updates.
4. Inspect the responsive layout at widths 1280px, 1024px, 768px, and 480px.
5. Generate a print preview and confirm print-specific styles hide admin-only controls.

## Post-Deployment

- [ ] Confirm the GitHub Pages URL (or hosting target) serves the latest build.
- [ ] Re-run the admin tests if any environment variables changed.
- [ ] Capture screenshots or PDFs for archival records.
- [ ] Close related issues and note outstanding follow-ups in the tracker.
