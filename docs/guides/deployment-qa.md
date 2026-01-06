# Deployment and QA Checklist

Use this checklist when preparing a release or validating changes after deployment. Run through it after regenerating metadata or updating locale content.

## Pre-Deployment

- [ ] Ensure GitHub Actions workflows pass (`workflow-deploy-pages.yml`).
- [ ] Confirm `npm test` succeeds locally.
- [ ] Run `npm run build:metadata` and commit the updated `index.html`, `robots.txt`, and `sitemap.xml` artifacts.
- [ ] Verify private files (`data/private/*`) are excluded from commits.
- [ ] Update documentation or changelog entries linked in the README.
- [ ] Adjust canonical/base URLs in `data/public/seo-config.yaml` when deploying to a new domain and rerun the metadata build.
- [ ] Validate structured data (Person + FAQ) via Google’s Rich Results Test.

## Manual QA

1. Open the live preview (or staging environment) in Chrome and Firefox.
2. Switch between English and Polish to validate localization.
3. Confirm the head `<title>`, `meta` tags, and canonical link reflect the active locale metadata.
4. Test the admin login flow:
   - Enter the password from `data/private/user.env`.
   - Toggle visibility of optional sections and confirm layout updates.
5. Inspect the responsive layout at widths 1280px, 1024px, 768px, and 480px.
6. Generate a print preview and confirm print-specific styles hide admin-only controls.
7. Expand FAQ entries and confirm localized copy is accurate for each locale.
8. Trigger the “Download ATS text” action in each locale and review the exported headings/content.
9. Verify `robots.txt` points to the expected sitemap URL.

## Post-Deployment

- [ ] Confirm the GitHub Pages URL (or hosting target) serves the latest build.
- [ ] Re-run the admin tests if any environment variables changed.
- [ ] Spot-check the live site with browser dev tools to ensure structured data includes the canonical URL and `sameAs` entries.
- [ ] Capture screenshots or PDFs for archival records.
- [ ] Close related issues and note outstanding follow-ups in the tracker.
