# Post-mortem: anonymous callers passed `can_access_target_user()` (2026-10-21)

- **Severity:** high (unauthenticated write access to public links, read access to profiles).
- **Status:** fixed on `test` and `prod` on 2026-10-21 by migration
  `20261021000000_fail_closed_target_user_access` (applied with `apply_migration`, same name and SQL
  on both projects). Regression tests: `tests/rls-cross-account-postgrest.test.mjs`.

## Impact

For an anonymous PostgREST caller (the public anon key ships in the front end),
`can_access_target_user(<user or recruiter id>)` returned `true`. Policies that call it, directly or
through `can_manage_target_user()`, therefore applied to anon:

- `resume_public_links` DELETE and INSERT: anon could delete any user/recruiter's public link
  (taking a published CV offline) and create links for another account.
- `profiles` SELECT: anon could read the profile rows of every user/recruiter account.
- `create_resume_revision()` and `rollback_resume_document()` authorize through the same function, so anon
  could create revisions and **roll back any user/recruiter's document to an older revision**
  (overwriting `resume_documents.yaml_content`). This is the most damaging path.
- `profiles` UPDATE was not reachable: anon has no `UPDATE` privilege on the table.

CV content (`resume_documents`, snapshots) was not exposed: those tables are owner-only.

Whether it was exploited is unknown. The Supabase API logs only reach back 24 hours; in that
window (checked after the fix) there was no `DELETE` on `resume_public_links`. Older activity cannot be
reconstructed because deleted rows leave no trace.

## Timeline (UTC, 2026-10-21)

- CI for the new cross-account RLS tests failed: `anon DELETE resume_public_links` returned the deleted row.
- Reproduced on `test` inside a rolled-back transaction; the function and policies on `prod` were
  confirmed identical by a read-only query (including `EXECUTE` for `anon`).
- Fix migration applied to `test` and verified, then to `prod` on the owner's instruction; verified
  read-only there (anon `false`, admin `true`).

## Root cause

For anon, `auth.uid()` and `current_user_role()` are `NULL`. In PL/pgSQL, `if NULL then` is not taken,
so both `if actor_role = 'admin'` and `if actor_role <> 'manager'` were skipped and the function fell
through to the manager branch, which returns `true` for any target whose role is `user`/`recruiter`.
The function dates from `20260410000000_phase_b_yaml_data_layer.sql`.

## Why it was not caught

No test exercised anon against policies built on `can_*_target_user()`. The earlier
`tests/profile-privileged-fields-postgrest.test.mjs` covered authenticated roles only, and the first
manual probe used an admin target by mistake and falsely showed the policy as safe.

## Fix

`if actor_role is distinct from 'manager' then return false;` so a missing role fails closed.
Admin and manager behaviour is unchanged (verified on both projects).

## Related finding closed the same day: legacy tables

The follow-up anon audit found `resumes` (18 rows, all `is_public = true`) and `public_links` (18) readable by
anon through `resumes_select_public` / `public_links_select_active`, plus anon-executable legacy RPCs
(`get_public_resume_by_slug`, `increment_public_link_view`, `get_admin_user_overview`). The app no longer uses
them. Migration `20261021010000_close_legacy_resume_tables_to_anon` dropped the two policies, revoked anon
access to both tables and `EXECUTE` from `public`/`anon` on the three functions (functions are executable
by PUBLIC by default, so revoking from `anon` alone is not enough). Applied to `test` and `prod`; verified
with `has_*_privilege`, and published CVs with a snapshot still return 200 on production.

## Follow-ups

- Prefer `is distinct from` / explicit `is null` handling in every role check inside policies and
  `security definer` functions; review `can_manage_target_user`, `is_staff_user`, `is_admin_user`
  and `current_user_role` for the same NULL pattern.
- `anon` still holds table privileges beyond what the app needs (`INSERT`/`DELETE` on `profiles`,
  `INSERT`/`UPDATE`/`DELETE` on several CV tables); RLS is the only barrier. Revoking unused anon
  privileges is a defence-in-depth candidate (tracked in [TECH_DEBT.md](../../TECH_DEBT.md)).
- Staff (admin; manager for user/recruiter targets) can create and delete other accounts' public
  links by design (`can_manage_target_user`); confirm this is intended.
