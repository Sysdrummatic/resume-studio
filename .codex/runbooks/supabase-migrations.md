# Runbook: Supabase migrations (safe workflow)

This runbook is for changes under `supabase/migrations/` and any corresponding frontend/server changes.

## Principles

- Prefer small, reviewable migrations.
- Avoid editing already-applied migrations for production-like environments. Add a new migration instead.
- Treat schema/RLS changes as security-sensitive.

## Before you change anything

- Identify the phase/area impacted (YAML data layer, auth/RBAC/admin, editor, public links).
- Decide if data backfill is required. If yes, design it to be resumable and auditable.
- Define rollback strategy:
  - “revert PR” is not enough if the migration has already been applied.
  - Prefer a dedicated rollback migration where feasible.

## Authoring the migration

- Use `begin; ... commit;` for atomicity.
- Prefer idempotent constructs where appropriate:
  - `create table if not exists ...`
  - `create or replace function ...`
  - `drop policy if exists ...` then `create policy ...`
- For `security definer` functions:
  - enforce role checks explicitly
  - `set search_path = public`
  - validate inputs

## Applying migrations

- Apply in order (see `README.md` / `docs/guides/local-development.md`).
- In environments with existing data, apply with extra caution:
  - check constraints/index additions for lock/time impact
  - avoid destructive defaults
  - backfill in controlled batches if needed

## Verification checklist

- `npm test` (migration tests + contract tests)
- Validate key flows affected (auth, editor publish/rollback, public links).
- Re-check RLS behavior for each role (`admin`, `manager`, `user`, `recruiter`).

## Rollback notes (minimum)

- If a migration must be rolled back, create a new rollback migration that:
  - reverses schema changes safely
  - preserves data if possible
  - documents irreversible steps explicitly

