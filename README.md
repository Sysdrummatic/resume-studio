# Personal Resume

This project contains a landing page, public sample resume renderer, and SaaS transition foundations (auth + Supabase + master resume editor).

## Structure

- `index.html` - marketing landing page (Phase A entry point).
- `resume.html` - public sample renderer (Ariana Holt example, EN/PL switch).
- `login.html` - authentication page for sign in, sign up, and password reset.
- `dashboard.html` - protected dashboard after sign-in.
- `master-resume.html` - master resume editor for authenticated users.
- `user.html` - legacy local editor/config panel for static-mode workflows.
- `data/public/locales.yaml` - locale registry (code, label, resume path, config path).
- `data/public/config/*.yaml` - per-locale UI labels and language metadata.
- `data/public/resume-*.yaml` - public sample resume YAML data.
- `scripts/main.js` - locale loading + YAML renderer for `resume.html` / `user.html`.
- `scripts/auth.js` - auth flow handlers (sign in/up/reset + disposable email check).
- `scripts/protected.js` - protected route session guard + admin dashboard logic.
- `scripts/master-resume-editor.js` - YAML template-based master resume editor.
- `styles/general.css` - public/sample resume styles.
- `styles/master-resume-editor.css` - master editor styles.
- `supabase/migrations/` - SQL migrations for schema and security.
- `tests/` - automated regression checks for admin UX helpers.
- `docs/` - documentation and operational checklists.

## How to run

1. Clone the repository and install dependencies.
2. Run a static server from repo root (Live Server, `npx serve .`, or `python -m http.server`).
3. Open `index.html` for the landing page.
4. Open `resume.html` to verify the public sample renderer.
5. Open `login.html` to test auth flows.

## Future React phase (planned)

The current app remains static-first (HTML/CSS/JS), but a future phase will introduce a React frontend incrementally.

- Migration will be gradual and parity-driven (no big-bang rewrite).
- Existing YAML data contracts and Supabase flows must remain stable during transition.
- See [React Frontend Transition Plan](docs/guides/react-frontend-transition-plan.md) for the migration guardrails.

## Phase B auth configuration

1. Copy config template:

```bash
cp scripts/auth-config.example.js scripts/auth-config.js
```

2. Update `scripts/auth-config.js` with Supabase URL + anon key.
3. In Supabase Auth settings, enable email verification and redirect URLs for:
   - `https://<your-domain>/dashboard.html`
   - `https://<your-domain>/login.html`

Signup uses a free disposable-email check API (`disify.com`).

## Phase C/D database foundation

Apply migrations in order:

- `supabase/migrations/20260405_phase_c_foundation.sql`
- `supabase/migrations/20260405_phase_c_completion.sql`
- `supabase/migrations/20260406_fix_profiles_policy_recursion.sql` (only if needed)
- `supabase/migrations/20260409_phase_d_yaml_template_iteration.sql`

This enables profiles, master resume row seeding, public links, admin RPCs, RLS, and YAML template/content storage.

## Public links and SEO indexing

- Netlify serves public resumes from `/r/{slug}` via `netlify.toml` redirects.
- Indexing is controlled by:
  - `resumes.allow_indexing`
  - `public_links.allow_indexing`
- Public page sets robots to:
  - `index,follow` only when both are `true`,
  - otherwise `noindex,nofollow`.

## Master resume editor

- Open `master-resume.html` after sign-in.
- Editor loads template from DB (`resumes.template_yaml`) and edits CV sections via form fields.
- `Save draft` stores local browser draft.
- `Publish master resume` updates:
  - `resumes.data` (structured JSONB for platform use),
  - `resumes.content_yaml` (generated YAML).

## Running tests

1. `npm install`
2. `npm test`

Current automated tests cover admin login UX helpers.

## Locale management

- Register locales in `data/public/locales.yaml`.
- Provide matching `resume-*.yaml` and `config/*.yaml` files.
- App stores selected locale in `localStorage` and falls back to browser locale/default.

## Documentation

- [Documentation index](docs/README.md)
- [Local development setup](docs/guides/local-development.md)
- [Content update workflow](docs/guides/content-update-workflow.md)
- [Deployment and QA checklist](docs/guides/deployment-qa.md)
