# OpenCiVera

This repository contains the React/Next.js OpenCiVera codebase. The former static HTML/CSS/JS frontend has been retired; `public/` now holds data files, images, vendor runtime assets, and migration helpers only.

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
5. Open the React routes, for example `/`, `/resume`, `/login`, `/dashboard`, `/user`, `/admin`, `/master-resume`, `/privacy`, canonical public `/{person-slug}/{public-id}`, or compatibility `/r/{slug}`.

## Database migrations

Apply via `supabase db push`, which applies files from `supabase/migrations/` in filename order. The two `20260405_phase_c_*` migrations are the one exception: `foundation` must run before `completion` despite sorting after it alphabetically.

1. `supabase/migrations/20260405_phase_c_foundation.sql`
2. `supabase/migrations/20260405_phase_c_completion.sql`
3. `supabase/migrations/20260406_fix_profiles_policy_recursion.sql`
4. `supabase/migrations/20260409_phase_d_yaml_template_iteration.sql`
5. `supabase/migrations/20260410_phase_b_yaml_data_layer.sql`
6. `supabase/migrations/20260410_phase_c_auth_rbac_admin.sql`
7. `supabase/migrations/20260505_resume_presets.sql`
8. `supabase/migrations/20260505_summary_list_defaults.sql`
9. `supabase/migrations/20260506_resume_language_metadata.sql`
10. `supabase/migrations/20260508_cv_publication_foundation.sql`
11. `supabase/migrations/20260509_cv_publication_rpc_atomic.sql`
12. `supabase/migrations/20260509_privacy_first_admin_access.sql`
13. `supabase/migrations/20260510_fix_publish_rpc_variant_fallback.sql`
14. `supabase/migrations/20260510_schema_cleanup_role_field.sql`
15. `supabase/migrations/20260517_profile_bio_field.sql`
16. `supabase/migrations/20260531_fix_publish_rpc_person_slug_public_id.sql`
17. `supabase/migrations/20260531_fix_published_cv_locale_trigger.sql`
18. `supabase/migrations/20260531_remove_locale_auto_seed.sql`
19. `supabase/migrations/20260603_resume_user_locales.sql`
20. `supabase/migrations/20260603_z_profile_name_sync.sql`
21. `supabase/migrations/20260603_zz_update_own_profile_rpc.sql`
22. `supabase/migrations/20260604_reactivate_revoked_public_link_on_publish.sql`
23. `supabase/migrations/20260605_fix_guard_profile_update_service_role.sql`
24. `supabase/migrations/20260605_reassert_profiles_policies_no_recursion.sql`
25. `supabase/migrations/20260610_pdf_feature_flags.sql`

## Tests

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run verify` - runs lint, typecheck, and test together
- `npm run ci` - runs `verify` plus `npm run build`

If `npm test` fails in restricted environments (`spawn EPERM`), run suites directly, e.g.:

- `node tests/phase-b-yaml-data-layer.test.js`
- `node tests/phase-c-sql-migration.test.js`
- `node tests/phase-d-editor-implementation.test.js`

## Documentation

- [Documentation index](docs/README.md) - start here for the canonical guide map
- [Phase status overview](docs/PHASES.md)
- [Action plan / execution checklist](docs/action-plan.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Project roadmap](ROADMAP.md)
