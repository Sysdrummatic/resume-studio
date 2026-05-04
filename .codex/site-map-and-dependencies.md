# Site Map and Dependency Guide (OpenCVHub, formerly resume-studio)

This document explains **what happens in the project**, how the individual pages work, and what the dependencies are between:
- the legacy static pages (`public/*.html` + `public/scripts/` + `public/styles/` + `public/data/public/*.yaml`),
- the Next.js rebuild (`app/`),
- the Supabase auth/data layer (`supabase/migrations/`).

> This repository is hybrid: the legacy app is “static-first”, while the Next.js app is a parallel track (SaaS rebuild). Avoid mixing responsibilities between these two worlds unless there is a clear need.

---

## 1) Quick overview

### Legacy (static HTML)
- Each page under `public/` (`resume.html`, `login.html`, `dashboard.html`, `master-resume.html`, `user.html`) is a separate entry point.
- Behavior is driven by browser scripts in `public/scripts/` (no bundler) and styles in `public/styles/`.
- Public/demo data lives in YAML (`public/data/public/*.yaml`) and is parsed in the browser via `public/scripts/js-yaml.min.js`.

### Next.js (App Router)
- `app/` is the target direction: React + TypeScript + API routes.
- Netlify currently provides the full compatibility redirect matrix for legacy URLs. `next.config.ts` only keeps the minimal in-app redirect.
- Auth and roles (RBAC) are based on Supabase and cookies (API routes under `app/api/auth/*`).

### Supabase
- SQL migrations in `supabase/migrations/` define tables, RLS/policies, RPC functions, and triggers.
- The project is organized into phases (B/C/D) that map to layers: YAML data layer, auth+RBAC+admin, editor/templates.

---

## 2) Site map

### Legacy: static entry pages (`public/`)
- `public/resume.html` - public resume view (public, YAML + locale switch).
- `public/login.html` - legacy login.
- `public/dashboard.html` - legacy dashboard.
- `public/master-resume.html` - legacy configuration/editing.
- `public/user.html` - legacy “user/editor mode” view.
- `public/editor-preview.html` - editor preview/canvas.
- `public/r/index.html` - legacy public share entry.

### Next.js: App Router (`app/`)
- `app/page.tsx` - home (“OpenCVHub Rebuild”).
- `app/login/page.tsx` - login UI (frontend for auth API).
- `app/dashboard/page.tsx` - post-login dashboard.
- `app/master-resume/page.tsx` - master resume (SaaS rebuild).
- `app/resume/page.tsx` - resume view in Next.
- `app/user/page.tsx` - user view in Next.
- `app/admin/page.tsx` - admin panel (RBAC).
- `app/r/[slug]/page.tsx` - public link / short resume URL (slug).

### Legacy -> Next redirects
+Source: `netlify.toml` (authoritative) and `next.config.ts` (minimal in-app fallback)
- `/index.html` -> `/`
- `/login.html` -> `/login`
- `/dashboard.html` -> `/dashboard`
- `/master-resume.html` -> `/master-resume`
- `/resume.html` -> `/resume`
- `/user.html` -> `/user`
- `/r/index.html` -> `/resume`

---

## 3) Legacy: modules and dependencies

### Key scripts
- `public/scripts/main.js`
  - the legacy “hub”: YAML loading, i18n, section rendering, language switching, resource caching, admin unlock/presets.
  - depends on `public/scripts/js-yaml.min.js` (global `jsyaml`).
  - reads `public/data/public/locales.yaml`, then uses `resume_path` and `config_path` for the active locale.
- `public/scripts/public-resume.js`
  - resume section renderer (DOM rendering: summary, contact, skills, experience, QR, etc.).
  - invoked by `scripts/main.js` after the profile is loaded.
- `public/scripts/admin-config.js`
  - configuration panel UI for section visibility and presets (localStorage).
  - coordinates with `scripts/main.js` (storage keys, preset query param `version`).
- `public/scripts/master-resume-editor.js`
  - legacy master resume editor logic.
- `public/scripts/editor-preview-renderer.js`
  - renderer for preview/canvas in `editor-preview.html`.
- `public/scripts/auth.js`, `public/scripts/protected.js`
  - legacy auth/gating (separate from Next auth).

### Data contracts (legacy YAML)
- `public/data/public/locales.yaml`
  - `default_locale`
  - `locales[]`:
    - `code`, `label`
    - `resume_path` (e.g. `data/public/resume-en.yaml`)
    - `config_path` (e.g. `data/public/config/en.yaml`)
- `public/data/public/resume-en.yaml`, `public/data/public/resume-pl.yaml`
  - profile data + section arrays (e.g. `name`, `role`, `summary`, `experience[]`, ...).
  - may include `labels` (at the resume level) that are merged with config labels.
- `public/data/public/config/<locale>.yaml` (as referenced by `locales.yaml`)
  - typically: `labels`, `locale`, `language_name`.

### i18n and fallback
- `public/scripts/main.js` defines `FALLBACK_LABELS` and builds `activeLabels` as:
  - fallback -> `resumeData.labels` -> `configData.labels`.
- The active language is stored in `localStorage` (`resume-studio:locale`).

### Resource cache
- `public/scripts/main.js` implements a cache with TTL (~10 min): prefix `resume-studio:cache:`.
- Used for fetching YAML/config so locale switching is responsive.

### Admin unlock/presets (legacy)
- Password: `window.ADMIN_PASSWORD` (normalized), unlock state and presets stored in `localStorage`.
- Storage keys (examples):
  - `resume-studio:admin-unlocked`
  - `resume-studio:presets:v2`
  - `resume-studio:active-preset:v2`
  - `resume-studio:item-visibility:v1`

---

## 4) Next.js: modules and dependencies

### Layers
- Pages/UI: `app/**/page.tsx`, client components in `app/**/**-client.tsx`.
- API: `app/api/**/route.ts`.
- Libraries: `app/lib/*` (auth cookies, RBAC, Supabase HTTP, schema, etc.).

### Auth (Next)
- API endpoints (see `docs/guides/phase-c-auth-rbac-admin.md` + `app/api/auth/*`):
  - `POST /api/auth/signup`
  - `POST /api/auth/signin`
  - `POST /api/auth/reset-password`
  - `POST /api/auth/resend-verification`
  - `POST /api/auth/signout`
  - `GET /api/auth/session`
  - `POST /api/auth/update-password`
- Cookies:
  - set/read by `app/lib/auth-cookies.ts` (used by `app/api/auth/*`).
- Session control:
  - `GET /api/auth/session` refreshes via refresh token and clears cookies when needed.
- Verification:
  - `signin` requires `email_confirmed_at` and `profiles.is_active`.

### RBAC
- Roles: `admin`, `manager`, `user`, `recruiter`.
- Enforcement:
  - in the database (RLS + guarded RPC functions),
  - in Next (route protection + role checks in pages/admin UI).

### Resume (Next)
- API endpoints:
  - `app/api/resume/document/route.ts`
  - `app/api/resume/publish/route.ts`
  - `app/api/resume/rollback/route.ts`
- Server-side domain logic: `app/lib/resume-server.ts` + `app/lib/resume-schema.ts`.

---

## 5) Supabase: schema, migrations, dependencies

### Migrations (order and intent)
Source: `README.md` + files in `supabase/migrations/`.
- `20260405_phase_c_foundation.sql`
  - foundation: base tables (e.g. `profiles`), triggers, baseline RLS.
  - the `handle_new_auth_user()` trigger creates a profile when a row is inserted into `auth.users`.
- `20260410_phase_b_yaml_data_layer.sql`
  - YAML-first: documents, revisions, public links, legacy JSON -> YAML backfill, role-aware RLS.
  - RBAC helpers: `current_user_role()`, `is_staff_user()`, etc.
- `20260410_phase_c_auth_rbac_admin.sql`
  - admin RPC + audit:
    - `log_admin_action`, `set_user_role`, `set_user_active`, `get_staff_user_overview`, `can_delete_user_account`.
- `20260409_phase_d_yaml_template_iteration.sql`
  - editor iteration built around YAML templates.

### Key logical dependencies
- Next auth works correctly only if:
  - `profiles` exists and the trigger on `auth.users` inserts is in place,
  - RLS/policies and RPC match the role model,
  - the frontend reads the profile after login (`/api/auth/session`, `signin`).
- The resume layer (YAML-first) assumes:
  - document/revision/public link tables exist,
  - publish/rollback constraints and helpers exist,
  - YAML contract is kept consistent (tests in `tests/`).

---

## 6) Dependency flow (how things connect)

### Legacy render (public resume)
1. `public/resume.html` loads `public/scripts/js-yaml.min.js` + `public/scripts/main.js` (+ renderers).
2. `public/scripts/main.js`:
   - fetches `public/data/public/locales.yaml`,
   - selects a locale (default or from `localStorage`),
   - fetches `resume_path` and `config_path`,
   - parses YAML (`jsyaml.load`) and validates basic shapes,
   - builds `activeLabels` (fallback + resume + config),
   - renders the UI and the language switcher.

### Next auth/session
1. The `/login` UI calls `POST /api/auth/signin`.
2. `signin`:
   - validates email/password,
   - calls Supabase,
   - enforces `email_confirmed_at`,
   - fetches the profile and checks `is_active`,
   - sets auth cookies.
3. Protected pages rely on cookies and `GET /api/auth/session` (refresh + profile lookup).

### Admin (Next)
- `/admin` and `/api/admin/users/*` require staff role (admin/manager) and use RPC/audit logging from Phase C migrations.

---

## 7) Where to change what (practical guide)

### You want to change resume content (public/demo)
- `public/data/public/resume-en.yaml` and `public/data/public/resume-pl.yaml`.
- If you add new label keys/fields: keep EN/PL in sync.

### You want to change legacy UI headings/labels
- `public/data/public/config/en.yaml`, `public/data/public/config/pl.yaml` (labels), or `labels` inside the resume YAML.
- Fallbacks live in `public/scripts/main.js` (`FALLBACK_LABELS`).

### You want to change locale switching or fetch/caching behavior
- `public/scripts/main.js`.

### You want to change section rendering (DOM)
- `public/scripts/public-resume.js`.

### You want to change auth / RBAC / admin in Next
- API: `app/api/auth/*`, `app/api/admin/*`.
- Libraries: `app/lib/auth-*.ts`, `app/lib/rbac.ts`.
- DB: `supabase/migrations/*phase_c*`.

---

## 8) Risks and checkpoints

- YAML contracts: key changes must be synchronized between `en` and `pl` and stay aligned with validation/tests (`tests/`, `public/scripts/phase-b/resume-yaml-contract.js`).
- Security: do not weaken RLS or `security definer` functions without fully reviewing the implications.
- Legacy vs Next: redirects suggest URL convergence, but logic is still duplicated — avoid implicitly mixing auth states.

---

## 9) Recommended tests / verifications

- Legacy smoke:
  - run a static server (`npx serve .`) and verify `public/resume.html` + locale switching.
- Next.js:
  - `npm run lint`, `npm run typecheck`, `npm test`, `npm run dev`.
- Auth flows (Next): signup -> verify email -> signin -> `/dashboard` -> `/admin` (for staff).
