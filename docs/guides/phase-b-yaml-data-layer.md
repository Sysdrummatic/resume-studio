# Phase B YAML Data Layer

This guide describes how to execute the Phase B data migration to the YAML-first model.

## Scope

Phase B introduces:

- `resume_documents` as the YAML source-of-truth table (one document per user + locale).
- `resume_revisions` as immutable snapshots.
- `resume_public_links` mapped to documents.
- `admin_audit_logs` for privileged operations.
- role-aware RLS for `admin`, `manager`, `user`, `recruiter`.

## Status Checklist

- [x] `resume_documents` table is part of the active model
- [x] `resume_revisions` table is part of the active model
- [x] `resume_public_links` table is part of the active model
- [x] YAML validation and coercion tests exist
- [x] Legacy JSON to YAML migration logic exists
- [x] RLS rules for the active role model exist
- [x] Phase B tests pass in the current repo

## 1. Apply DB Migration

Run in Supabase SQL editor:

- `supabase/migrations/20260410_phase_b_yaml_data_layer.sql`

This migration creates new tables/functions/policies, backfills from legacy `resumes.data` JSON, creates initial revisions, and seeds EN/PL defaults where missing.

## 2. Run Dry-Run for Legacy Export (Recommended)

Prepare a JSON snapshot with keys:

- `profiles` (array)
- `resumes` (array)
- `public_links` (array, optional)

Then execute:

```bash
node scripts/phase-b/legacy-data-migrator.js \
  --input ./supabase/legacy-export.json \
  --report ./reports/phase-b-migration-dry-run.json \
  --sql ./supabase/migrations/20260410_phase_b_generated_backfill.sql
```

Outputs:

- `reports/phase-b-migration-dry-run.json` with counts, warnings, and previews.
- optional SQL backfill file for audited replay.

## 3. Validate Contract Tests

```bash
npm test
```

This now includes:

- YAML schema contract checks.
- legacy JSON -> YAML coercion checks.
- migration planner/report/SQL generation checks.

## 4. Post-Migration Verification

Validate these queries:

1. Every user has EN and PL documents in `resume_documents`.
2. Every document has at least revision `1` in `resume_revisions`.
3. Public links are mapped to `resume_public_links` and active links resolve.
4. Role policies behave correctly:
   - `manager` can only manage `user` and `recruiter`,
   - `admin` can manage all roles.

## Verification Checklist

- [x] Users can be represented by separate EN and PL resume documents
- [x] Revisions are created and queryable
- [x] Migration/report tooling is present in the repo
- [x] Contract validation is automated in tests
- [ ] Public `/r/[slug]` consumption of `resume_public_links` is complete in the Next.js app
