# Local Development Setup

This guide covers local development for the active Next.js App Router app.

## Prerequisites

- Node.js 22+.
- npm 10+.
- Supabase project (for auth/data flows).

## Setup Checklist

- [x] Node.js 22+ is the expected runtime
- [x] npm 10+ is the expected package manager baseline
- [x] `.env.local` should be created from `.env.development.example`
- [x] Supabase URL, anon key, and service role key are required
- [x] `npm run dev` is the primary local app entry point
- [x] Legacy static HTML/CSS/JS files are retired from `public/`
- [x] Required migration order is documented
- [x] Validation commands are documented

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from template:

```bash
cp .env.development.example .env.local
```

3. Fill required values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Start Next.js app:

```bash
npm run dev
```

## Key routes (Next.js)

- `/login` - sign in/sign up/reset + resend verification
- `/dashboard` - protected user panel
- `/admin` - protected admin/manager panel
- `/master-resume` - canvas editor (Phase D)
- `/resume` - public sample CV
- `/{person-slug}/{public-id}` - canonical published CV

## Compatibility Redirects

Netlify keeps permanent redirects from historical `.html` URLs such as `/login.html` and `/resume.html` to their React routes. The old static files themselves are no longer present in `public/`.

## Required migrations

Apply SQL migrations in order:

1. `supabase/migrations/20260405000000_phase_c_foundation.sql`
2. `supabase/migrations/20260405010000_z_phase_c_completion.sql`
3. `supabase/migrations/20260406000000_fix_profiles_policy_recursion.sql` (if required)
4. `supabase/migrations/20260409000000_phase_d_yaml_template_iteration.sql`
5. `supabase/migrations/20260410000000_phase_b_yaml_data_layer.sql`
6. `supabase/migrations/20260410010000_phase_c_auth_rbac_admin.sql`

## Validation

```bash
npm run lint
npm run typecheck
npm test
```

If `npm test` fails in restricted shell environments with `spawn EPERM`, run suites directly:

```bash
node tests/phase-b-yaml-data-layer.test.js
node tests/phase-c-sql-migration.test.js
node tests/phase-d-editor-implementation.test.js
```
