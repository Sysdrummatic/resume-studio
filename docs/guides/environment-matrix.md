# Environment Matrix (Next.js on Netlify)

This file defines how to run and deploy the app in three environments.

## Environments

- `dev`:
  - Runs on your machine with `npm run dev`.
  - Fastest feedback loop for coding and debugging.
  - Uses local `.env.development` (not committed).
- `preview`:
  - Netlify Deploy Preview per pull request.
  - Safe place to review features before merge.
  - Uses Netlify environment variables scoped to `Deploy Previews`.
- `prod`:
  - Netlify production deploy from `main`.
  - Uses Netlify environment variables scoped to `Production`.

## Required Variables

- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`

Templates:

- `.env.development.example`
- `.env.preview.example`
- `.env.production.example`

## Supabase project split (production vs preview/local)

Use separate Supabase projects:

- **Production deploy** (`main` on Netlify) → production Supabase project.
- **Deploy Preview** (PR builds on Netlify) → test Supabase project.
- **Local development** (`npm run dev`) → test Supabase project.

For the Next.js app (`/login`, `/dashboard`, API routes), this split is handled by Netlify environment scoping:

- Production scope values should point to production Supabase.
- Deploy Previews scope values should point to test Supabase.
- Local `.env.local` (based on `.env.development.example`) should point to test Supabase.

For legacy static auth pages (`login.html`, `dashboard.html`) configure `window.RESUME_STUDIO_AUTH_ENV` (see `scripts/auth-config.example.js`) and set:

- `production.supabaseUrl` / `production.supabaseAnonKey` → production.
- `preview.*` and `development.*` → test.

Runtime host detection in `scripts/auth-config.js` maps:

- `localhost` / `127.0.0.1` → `development`
- `*.netlify.app` preview-like hosts (for example `deploy-preview-*` or branch aliases) → `preview`
- all other hosts → `production`

## CI Policy

GitHub Actions workflow `ci.yml` runs on PR and push to `main/master`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

Merge rule:

- Do not merge when any required CI check fails.

## Auth troubleshooting

- `POST /api/auth/signin` invalid credential responses now include `Auth project: <project-ref>`.
- If user exists in Supabase UI but sign-in still fails, first compare this project ref with the Supabase project you are inspecting; preview deploys must point to test Supabase variables.
