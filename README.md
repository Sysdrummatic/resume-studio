# Personal Resume

This project currently includes a production-style landing page and an interactive résumé renderer powered by YAML data. The renderer is pure HTML/CSS/JS and loads locale-specific content from `data/public`, with language selection in the header.

## Structure

- `index.html` – marketing landing page (Phase A entry point).
- `resume.html` – recruiter-facing public resume renderer with language switcher.
- `login.html` – authentication page for sign in, sign up, and password reset.
- `dashboard.html` – protected route placeholder available only to authenticated users.
- `user.html` – editor login view and configuration panel.
- `data/public/locales.yaml` – locale registry (code, label, resume path, and config path per language).
- `data/public/config/*.yaml` – per-locale UI labels and language metadata.
- `data/public/resume-*.yaml` – per-locale public résumé data (EN/PL provided) that can be served to recruiters.
- `data/private/resume-private.yaml` – optional private résumé details (e.g. full contact info, internal notes) kept out of the public bundle. This file is distinct from `data/private/user.env`, which only stores the admin password.
- `scripts/main.js` – locale loading, DOM rendering, and UI behaviour.
- `scripts/auth.js` – authentication flow handlers (sign in/sign up/reset + disposable email check).
- `scripts/protected.js` – protected route session guard and sign-out logic.
- `scripts/auth-config.js` – public Supabase client configuration for browser auth flows.
- `scripts/admin-config.js` – runtime loader for the admin password environment file.
- `styles/general.css` – layout, timeline and sidebar styling.
- `images/qrs` – QR assets referenced by the YAML data.
- `tests/` – automated regression checks for the admin panel UX helpers.
- `docs/` – project documentation, workflows, and operational checklists.

## How to run

1. Clone the repo and install Live Server (e.g. VS Code extension “Live Server” / “Five Server”).
2. In VS Code right-click `index.html` → “Open with Live Server”. Alternatively run a static server (`npx serve .` or `python3 -m http.server`).
3. Open `resume.html` to preview the resume renderer directly.
4. Open `login.html` to test Phase B authentication flows.
5. Refresh the page after changing any YAML file – the app fetches locale files dynamically.


## Phase B auth configuration

1. Copy the config template:

```bash
cp scripts/auth-config.example.js scripts/auth-config.js
```

2. Update `scripts/auth-config.js` with your Supabase project URL and anon key.
3. In Supabase Auth settings, enable email verification and include redirect URLs for:
   - `https://<your-domain>/dashboard.html`
   - `https://<your-domain>/login.html`

Sign up uses a free disposable-email check API (`disify.com`).
For full click-by-click setup, see [Supabase UI Setup (Phase B)](docs/guides/supabase-ui-setup.md).

## Phase C database foundation

After Auth is connected and working, apply both Phase C migrations in order:

- SQL migration: `supabase/migrations/20260405_phase_c_foundation.sql`
- SQL migration: `supabase/migrations/20260405_phase_c_completion.sql`
- SQL migration (if you see policy recursion error): `supabase/migrations/20260406_fix_profiles_policy_recursion.sql`
- Click-by-click guide: [Supabase Schema Setup (Phase C)](docs/guides/phase-c-supabase-schema-setup.md)

This enables profiles, seeded master resumes, visibility configurations, public links, admin stats/actions, uploaded files, and RLS policies.

### Public links and SEO indexing

- Netlify serves public resumes from `/r/{slug}` via `netlify.toml` redirects.
- Indexing is controlled by both database flags:
  - `resumes.allow_indexing`
  - `public_links.allow_indexing`
- Public page sets `meta[name="robots"]` to:
  - `index,follow` only when both flags are `true`,
  - otherwise `noindex,nofollow`.

## Phase D master resume editor

- Open `master-resume.html` after sign-in.
- The editor provides multi-step input (personal, summary, experience, skills) with a review screen.
- `Save draft` stores in-progress form data in browser localStorage.
- `Publish master resume` updates the existing single `resumes` row for the signed-in user.

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

## Locale management

- Register new locales in `data/public/locales.yaml` by adding an entry with `code`, `label`, `resume_path`, and `config_path`.
- Provide a per-locale resume file that follows the structure in `data/public/resume-en.yaml` / `data/public/resume-pl.yaml`. Store UI labels and locale metadata in a matching file under `data/public/config`.
- The app persists the last selected locale in `localStorage` and falls back to browser language (two-letter code) or the configured default.

## Data loading safeguards

- YAML files are validated for basic schema expectations (object root, string fields, array sections). Validation errors are surfaced in the UI banner and in the console.
- Fetches are cached in `localStorage` for 10 minutes. When the network is unavailable the app falls back to the most recent cached copy and logs a warning.
- A loading overlay appears while locale data is being fetched or revalidated to prevent partial renders.

## Manual QA checklist

- Toggle between Polish and English and verify that all headings, content blocks, and sidebar cards localize correctly.
- Validate YAML via an external linter when editing locale data.

## Documentation

- [Documentation index](docs/README.md)
- [Local development setup](docs/guides/local-development.md)
- [Content update workflow](docs/guides/content-update-workflow.md)
- [Deployment and QA checklist](docs/guides/deployment-qa.md)
