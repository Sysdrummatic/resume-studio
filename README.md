# Personal Resume

This project renders an interactive résumé directly from YAML data. The page is pure HTML/CSS/JS and loads locale-specific content from `data/public`. A recruiter-facing public view is served by default with language selection in the header.

## Structure

- `index.html` – layout, markup, language switcher, and public view controls.
- `user.html` – editor login view and configuration panel.
- `data/public/locales.yaml` – locale registry (code, label, resume path, and config path per language).
- `data/public/config/*.yaml` – per-locale UI labels and language metadata.
- `data/public/seo-config.yaml` – shared SEO, social, and ATS metadata applied per locale.
- `data/public/resume-*.yaml` – per-locale public résumé data (EN/PL provided) that can be served to recruiters.
- `data/private/resume-private.yaml` – optional private résumé details (e.g. full contact info, internal notes) kept out of the public bundle. This file is distinct from `data/private/user.env`, which only stores the admin password.
- `scripts/main.js` – locale loading, DOM rendering, SEO metadata hydration, and UI behaviour.
- `scripts/build-metadata.js` – build-time task that syncs head tags, robots.txt, and sitemap.xml from the SEO config.
- `scripts/admin-config.js` – runtime loader for the admin password environment file.
- `styles/general.css` – layout, timeline and sidebar styling.
- `images/qrs` – QR assets referenced by the YAML data.
- `tests/` – automated regression checks for the admin panel UX helpers.
- `docs/` – project documentation, workflows, and operational checklists.
- `robots.txt` – crawler directives (update the sitemap URL when hosting changes).
- `sitemap.xml` – sitemap listing public pages for search engines.

## How to run

1. Clone the repo and install Live Server (e.g. VS Code extension “Live Server” / “Five Server”).
2. In VS Code right-click `index.html` → “Open with Live Server”. Alternatively run a static server (`npx serve .` or `python3 -m http.server`).
3. Refresh the page after changing any YAML file – the app fetches locale and resume files dynamically.
4. Run `npm run build:metadata` when you update `data/public/seo-config.yaml` so the canonical link, robots.txt, and sitemap.xml stay in sync.

## Configuring the admin password

The editor reads its password from `data/private/user.env` at runtime. The file is ignored by git, so create it locally with a single line:

```env
ADMIN_PASSWORD=your-strong-password
```

Reload the page after changing the file. If the password is missing or empty the admin login stays disabled.

### Windows quick setup

```powershell
New-Item -ItemType Directory -Force -Path data/private | Out-Null
Set-Content -Path data/private/user.env -Value 'ADMIN_PASSWORD=your-strong-password'
```

Start your static server (Live Server, `npx serve .`, etc.) and reload the editor view.

## Running tests

1. Install dev dependencies: `npm install`.
2. Execute the suite: `npm test`.
3. The Node test runner (with jsdom) verifies admin login focus/state behaviour.

## Metadata build workflow

- Run `npm run build:metadata` to regenerate `index.html`, `robots.txt`, and `sitemap.xml` from `data/public/seo-config.yaml`.
- The script validates the YAML payload and fails fast if required fields are missing.
- When deploying to a new domain, update the canonical/base URLs in the SEO config first, then rerun the build task.

## Locale management

- Register new locales in `data/public/locales.yaml` by adding an entry with `code`, `label`, `resume_path`, and `config_path`.
- Provide a per-locale resume file that follows the structure in `data/public/resume-en.yaml` / `data/public/resume-pl.yaml`. Store UI labels and locale metadata in a matching file under `data/public/config`.
- The app persists the last selected locale in `localStorage` and falls back to browser language (two-letter code) or the configured default.

## Data loading safeguards

## Manual QA checklist

- Toggle between Polish and English and verify that all headings, content blocks, and sidebar cards localize correctly.
- Validate YAML via an external linter when editing locale data.
- Expand the FAQ accordion in both locales to confirm localized phrasing.
- Use the “Download ATS text” button and confirm the generated file contains the latest content.

## SEO, AEO, and ATS Notes

- Meta tags and JSON-LD (Person + FAQ) are hydrated from the active locale; update `LANGUAGE_PRESETS` and the SEO config when introducing new locales.
- `robots.txt` and `sitemap.xml` are regenerated via `npm run build:metadata` and mirror the URLs in `data/public/seo-config.yaml`.
- FAQ entries help answer-engine responses—keep resume YAML rich enough (summary, location, contact, tech stack) for meaningful snippets.
- The ATS download button exports a plain-text résumé with headings pulled from the SEO config; review the output when you introduce new sections or fields.

## Documentation

- [Documentation index](docs/README.md)
- [Local development setup](docs/guides/local-development.md)
- [Content update workflow](docs/guides/content-update-workflow.md)
- [Deployment and QA checklist](docs/guides/deployment-qa.md)
