# Link crawl — 2026-10-17

`npm run build` (with `NEXT_PUBLIC_APP_BASE_URL` set; a production build fails without it by design, T01) and `next start -p 3100`, then `npm run qa:links -- http://localhost:3100` on branch `ocv-0250-allow-indexing-and-link-crawl`.

- Pages crawled: 22 (seeds `/`, `/resume`, `/docs`, `/privacy`, `/terms` plus everything they link to).
- Broken internal links (status ≥ 400 or network error): 0.
- Pages the sitemap lists that no crawled page links to: 0 (every landing, `/resume`, `/docs`, tutorial, `/privacy` and `/terms` URL in both languages is reachable by links).
- `/cv-templates` is neither linked nor in the sitemap, by decision: `noindex` (plan, decision 3). The crawler does not report it because it checks the seeds and the sitemap only.
- Not covered: public CV pages (`/{personSlug}/{publicId}`) need published data in the database; external links and `mailto:` are skipped.
