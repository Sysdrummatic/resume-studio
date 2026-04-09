# Local Development Setup

This guide explains how to run and iterate on ResumeStudio locally.

## Prerequisites

- Node.js 22 or newer.
- A static HTTP server (Live Server extension, `npx serve`, or `python -m http.server`).
- Git access to this repository.

## First-Time Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd plm-resume
   npm install
   ```

2. Configure auth client settings:

   ```bash
   cp scripts/auth-config.example.js scripts/auth-config.js
   ```

   Then edit `scripts/auth-config.js` with Supabase URL and anon key.

3. Start a static server from repository root.
4. Open `index.html` for landing page, `resume.html` for public sample preview.

## Supabase Migrations (Phase C + D)

Run migrations in order:

1. `supabase/migrations/20260405_phase_c_foundation.sql`
2. `supabase/migrations/20260405_phase_c_completion.sql`
3. `supabase/migrations/20260406_fix_profiles_policy_recursion.sql` (only if recursion issue appears)
4. `supabase/migrations/20260409_phase_d_yaml_template_iteration.sql`

This adds profile/auth-backed data model and YAML template/content fields used by `master-resume.html`.

## Working with YAML Content

- Public sample CV content lives in `data/public/resume-en.yaml` and `data/public/resume-pl.yaml`.
- The public sample is available from home page links and `resume.html`.
- Master resume editor (`master-resume.html`) uses DB template/content fields:
  - `resumes.template_yaml` as base template,
  - `resumes.content_yaml` as editable YAML output,
  - `resumes.data` as structured JSON mirror.

## Running Automated Tests

- Run `npm test` to execute jsdom-based regression checks.
- Use `npm test -- --watch` while iterating.

## Troubleshooting

- If auth pages redirect unexpectedly, verify `scripts/auth-config.js` values.
- If master editor shows missing row errors, confirm all Phase C/D migrations are applied.
- If YAML parsing fails, check generated YAML preview in editor and browser console.
- To clear local draft/cache state, remove keys from `localStorage` for your local domain.
