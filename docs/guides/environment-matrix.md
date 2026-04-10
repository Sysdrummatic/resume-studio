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

## CI Policy

GitHub Actions workflow `ci.yml` runs on PR and push to `main/master`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test`
5. `npm run build`

Merge rule:

- Do not merge when any required CI check fails.
