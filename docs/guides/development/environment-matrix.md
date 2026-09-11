# Environment Matrix (Next.js on Netlify)

This file defines the runtime configuration contract for local development, Deploy Previews, and production.

## Environments

- `development` runs locally with `npm run dev` and `.env.local` based on `.env.development.example`.
- `preview` runs as a Netlify Deploy Preview for a pull request and uses variables scoped to Deploy Previews.
- `production` runs from the protected default branch (`master` currently) and uses variables scoped to Production.

## Required runtime variables

Every hosted scope requires:

- `NEXT_PUBLIC_APP_ENV` — exactly `preview` or `production`, matching the scope.
- `NEXT_PUBLIC_SUPABASE_URL` — HTTPS URL of the Supabase project for that scope.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public key for the same Supabase project.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only service role key for the same Supabase project.

Optional variables:

- `NEXT_PUBLIC_APP_BASE_URL` — explicit canonical application URL. Netlify's `URL` is the runtime fallback.
- `NEXT_PUBLIC_COOKIE_DOMAIN` — production-only shared cookie domain when one is required.
- `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` — optional e-mail delivery configuration; set both or neither.
- `DISPOSABLE_EMAIL_CHECK_URL` and `DISPOSABLE_EMAIL_CHECK_TIMEOUT_MS` — optional disposable-email check overrides.

Sentry is not part of the current runtime contract: no Sentry SDK or integration is installed. Add provider-specific variables only together with an approved instrumentation implementation.

Templates:

- `.env.development.example`
- `.env.preview.example`
- `.env.production.example`

## Readiness gate

Run the gate inside the target environment before smoke testing:

```powershell
npm.cmd run qa:env -- --target=preview
npm.cmd run qa:env -- --target=production
```

The command exits with code `1` for missing values, placeholders, a target mismatch, non-HTTPS hosted URLs, or an incomplete e-mail pair. Reports contain variable names and reasons only; they never print configured values.

Passing the local unit tests proves the validator contract. It does not prove that Netlify or Supabase contain the correct secrets. Run the command separately in each real hosting scope and record the result in the release evidence.

## Supabase project split

Use separate Supabase projects:

- Production deploys use the production Supabase project.
- Deploy Previews use the test Supabase project.
- Local development uses the test Supabase project.

The retired static HTML app and its redirects have been removed. Active public routes are implemented by the Next.js application.

## CI policy

GitHub Actions workflow `ci.yml` runs on pull requests and pushes to `main` or `master`:

1. install from lockfile with `npm ci`;
2. audit production dependencies;
3. lint, typecheck, test, and build;
4. start local Supabase and verify the PostgREST profile security boundary.

Do not merge when any required CI or Deploy Preview check fails.
