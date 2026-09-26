# Documentation content

The `/docs` route keeps the URL stable and selects Markdown content from the
application locale. Localized content is organized as:

```text
content/docs/
  locales/
    en/
      docs-overview.md
      tutorials/<slug>/<slug>.md
      test-scenarios/<slug>/<slug>.md
    pl/
      docs-overview.md
      tutorials/<slug>/<slug>.md
      test-scenarios/<slug>/<slug>.md
```

Use the same slug and frontmatter order in both locales so navigation stays
consistent. Put article-specific images in the locale that owns the article;
the resource route falls back to English assets when a localized asset is not
available.

The English locale is the content fallback. A missing Polish translation is
therefore visible, but the UI marks the article as a fallback instead of
silently pretending it was translated.

## Workflow and navigation

`app/lib/docs/presentation.ts` defines the four main steps: master resume,
tailored version, publication, and PDF/ATS export. Both the hub and sidebar use
this order. The first-CV article is a short process map, not a second walkthrough.
Language, transfer and revision guides are supporting topics; troubleshooting,
limits and privacy are grouped as help. Test scenarios remain access-gated.

Each authorized article occurs once in sidebar navigation and search results.
The optional language link is also shown after step one. Main-step articles
include a goal, prerequisites, instructions and a result checklist. Previous/next
links come from the same workflow list. Keep EN/PL content and UI labels aligned.

Validate navigation and access with `node --test tests/docs-workspace.test.mjs
tests/docs-routes.test.mjs tests/beta-docs-site.test.mjs`. For isolated browser QA,
set `$env:DOCS_BROWSER_TEST='1'` and run `node --test tests/docs-browser.test.mjs`.
This checks real components in desktop/mobile, EN/PL and both themes; it does not
exercise live authentication or Supabase.
