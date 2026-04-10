# Local Development Setup

This guide covers local development for both the legacy static app and the Next.js rebuild.

## Prerequisites

- Node.js 22+.
- npm 10+.
- Supabase project (for auth/data flows).

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

## Static legacy routes (still present)

- `index.html`, `resume.html`, `login.html`, `dashboard.html`, `master-resume.html`, `user.html`

## Required migrations

Apply SQL migrations in order:

1. `supabase/migrations/20260405_phase_c_foundation.sql`
2. `supabase/migrations/20260405_phase_c_completion.sql`
3. `supabase/migrations/20260406_fix_profiles_policy_recursion.sql` (if required)
4. `supabase/migrations/20260409_phase_d_yaml_template_iteration.sql` (legacy static Phase D iteration)
5. `supabase/migrations/20260410_phase_b_yaml_data_layer.sql`
6. `supabase/migrations/20260410_phase_c_auth_rbac_admin.sql`

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
