# Environment Matrix (Next.js on Netlify)

This file defines how to run and deploy the app in three environments.

## Environments

- `dev`:
  - Runs on your machine with `npm run dev`.
  - Fastest feedback loop for coding and debugging.
  - Uses local `.env.local` based on `.env.development.example`.
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

## Supabase Project Split

Use separate Supabase projects:

- Production deploy (`main` on Netlify): production Supabase project.
- Deploy Preview (PR builds on Netlify): test Supabase project.
- Local development (`npm run dev`): test Supabase project.

For the Next.js app (`/login`, `/dashboard`, API routes), this split is handled by Netlify environment scoping:

- Production scope values should point to production Supabase.
- Deploy Previews scope values should point to test Supabase.
- Local `.env.local` should point to test Supabase.

The retired static auth pages no longer require browser-side environment files. Historical `.html` URLs are handled by Netlify redirects to the active React routes.

## CI Policy

GitHub Actions workflow `ci.yml` runs on PR and push to `main/master`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

Merge rule:

- Do not merge when any required CI check fails.
