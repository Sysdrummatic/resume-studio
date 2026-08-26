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
5. Open the React routes, for example `/`, `/resume`, `/login`, `/dashboard`, `/user`, `/admin`, `/master-resume`, `/privacy`, or canonical public `/{person-slug}/{public-id}`.

## Database migrations

Apply via `supabase db push`, which applies files from `supabase/migrations/` in version (filename) order. Every migration has a unique 14-digit version, so filename order is the execution order.

1. `supabase/migrations/20260405000000_phase_c_foundation.sql`
2. `supabase/migrations/20260405010000_z_phase_c_completion.sql`
3. `supabase/migrations/20260406000000_fix_profiles_policy_recursion.sql`
4. `supabase/migrations/20260409000000_phase_d_yaml_template_iteration.sql`
5. `supabase/migrations/20260410000000_phase_b_yaml_data_layer.sql`
6. `supabase/migrations/20260410010000_phase_c_auth_rbac_admin.sql`
7. `supabase/migrations/20260505000000_resume_presets.sql`
8. `supabase/migrations/20260505010000_summary_list_defaults.sql`
9. `supabase/migrations/20260506000000_resume_language_metadata.sql`
10. `supabase/migrations/20260508000000_cv_publication_foundation.sql`
11. `supabase/migrations/20260509000000_cv_publication_rpc_atomic.sql`
12. `supabase/migrations/20260509010000_privacy_first_admin_access.sql`
13. `supabase/migrations/20260510000000_fix_publish_rpc_variant_fallback.sql`
14. `supabase/migrations/20260510010000_schema_cleanup_role_field.sql`
15. `supabase/migrations/20260517000000_profile_bio_field.sql`
16. `supabase/migrations/20260531000000_fix_publish_rpc_person_slug_public_id.sql`
17. `supabase/migrations/20260531010000_fix_published_cv_locale_trigger.sql`
18. `supabase/migrations/20260531020000_remove_locale_auto_seed.sql`
19. `supabase/migrations/20260603000000_resume_user_locales.sql`
20. `supabase/migrations/20260603010000_z_profile_name_sync.sql`
21. `supabase/migrations/20260603020000_zz_update_own_profile_rpc.sql`
22. `supabase/migrations/20260604000000_reactivate_revoked_public_link_on_publish.sql`
23. `supabase/migrations/20260605000000_fix_guard_profile_update_service_role.sql`
24. `supabase/migrations/20260605010000_reassert_profiles_policies_no_recursion.sql`
25. `supabase/migrations/20260610000000_pdf_feature_flags.sql`
26. `supabase/migrations/20260614000000_prevent_last_admin_deletion.sql`
27. `supabase/migrations/20260703000000_user_data_transfer_flag.sql`
28. `supabase/migrations/20260711000000_profile_test_and_staff_flags.sql`
29. `supabase/migrations/20260712000000_login_restriction_flag.sql`
30. `supabase/migrations/20260713000000_content_safety_flags.sql`
31. `supabase/migrations/20260714000000_profile_privileged_update_boundary.sql`

## Tests

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run verify` - runs lint, typecheck, and test together
- `npm run ci` - runs `verify` plus `npm run build`
- `npm run test:rls` - runs the live four-role PostgREST/RPC matrix against an isolated Supabase project (see `docs/guides/test-scenarios/TEST_SCENARIOS.md`)

If `npm test` fails in restricted environments (`spawn EPERM`), run suites directly, e.g.:

- `node tests/phase-b-yaml-data-layer.test.js`
- `node tests/phase-c-sql-migration.test.js`
- `node tests/phase-d-editor-implementation.test.js`

## Documentation

- [Project status, roadmap & active sprint](docs/STATUS.md) - start here
- [Implementation guides index](docs/guides/README.md)
- [Architecture Decision Records](docs/adr/README.md)
