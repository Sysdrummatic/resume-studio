# OpenCVHub

This repository contains the React/Next.js OpenCVHub codebase. The former static HTML/CSS/JS frontend has been retired; `public/` now holds data files, images, vendor runtime assets, and migration helpers only.

## Structure

- `app/` - Next.js App Router implementation.
- `public/data/public/` - YAML locale/content files for the public sample CV.
- `public/data/private/` - private/template YAML files consumed by the editor and server data layer.
- `public/scripts/phase-b/` - historical YAML data migration helpers.
- `public/vendor/` - browser-only vendor assets still loaded by client React screens.
- `supabase/migrations/` - SQL migrations.
- `docs/` - guides, plans, QA checklists.

## Run

1. Install deps: `npm install`
2. Create `.env.local` from `.env.development.example`
3. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Start: `npm run dev`
5. Open the React routes, for example `/`, `/resume`, `/login`, `/dashboard`, `/master-resume`, or `/r/{slug}`.

## Database migrations

Apply in order:

1. `supabase/migrations/20260405_phase_c_foundation.sql`
2. `supabase/migrations/20260405_phase_c_completion.sql`
3. `supabase/migrations/20260406_fix_profiles_policy_recursion.sql` (if needed)
4. `supabase/migrations/20260409_phase_d_yaml_template_iteration.sql`
5. `supabase/migrations/20260410_phase_b_yaml_data_layer.sql`
6. `supabase/migrations/20260410_phase_c_auth_rbac_admin.sql`

## Tests

- `npm run lint`
- `npm run typecheck`
- `npm test`

If `npm test` fails in restricted environments (`spawn EPERM`), run suites directly, e.g.:

- `node tests/phase-b-yaml-data-layer.test.js`
- `node tests/phase-c-sql-migration.test.js`
- `node tests/phase-d-editor-implementation.test.js`

## Documentation

- [Documentation index](docs/README.md)
- [Project roadmap](docs/guides/saas-transition-work-plan.md)
- [Local development setup](docs/guides/local-development.md)
- [Deployment and QA checklist](docs/guides/deployment-qa.md)
- [React frontend transition plan](docs/guides/react-frontend-transition-plan.md)
- [Phase B YAML data layer guide](docs/guides/phase-b-yaml-data-layer.md)
- [Phase C auth + RBAC guide](docs/guides/phase-c-auth-rbac-admin.md)
- [Phase D editor canvas guide](docs/guides/phase-d-editor-canvas.md)
- [AI demo resume generation workstream](docs/guides/ai-demo-resume-generation-plan.md)
