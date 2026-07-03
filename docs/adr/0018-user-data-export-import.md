# ADR 0018: User Data Export/Import With Admin Kill Switch

Status: Accepted
Date: 2026-07-03

## Context

Users build three kinds of content on the platform: the Master Resume (one
`resume_documents` row per locale), language versions (`resume_user_locales`),
and CV versions (`resume_presets` + `resume_preset_variants`). There was no way
to take this data out of the platform as a whole, or to restore it — the only
exports were per-published-CV snapshots (ATS text/YAML/PDF, ADR 0008/0014).

The product decision: give every role a dashboard-level **Export** and
**Import** of their full CV data, while letting an admin disable the feature
platform-wide at any time. When disabled, users must not see the buttons.

## Decision

1. **Bundle format.** Export produces a single YAML file
   (`opencivera-user-data-YYYY-MM-DD.yaml`) with signature fields
   `format: opencivera-user-data`, `version: 1`, plus three sections:
   `languages`, `documents` (full per-locale `yaml_content`), and
   `cv_versions` (selection + per-locale variants). No database IDs and no
   `user_id` are exported — CV versions reference documents by locale, so the
   bundle is portable across accounts. Contract lives in
   `app/lib/user-data-transfer.ts` (`buildUserDataBundleYaml` /
   `parseUserDataBundle`).
2. **Publish state is excluded.** Slugs, `published_at`, public links, and
   published snapshots are not exported, and import creates everything as
   private drafts. This avoids slug/public-id collisions and accidental
   publication; users republish manually.
3. **Import semantics: restore, not merge.** Languages and master documents
   are upserted per locale; all **private** CV versions are deleted and
   replaced by the bundle's CV versions. **Published** CV versions and their
   public links are left untouched (deleting them would take live links
   offline). Locales that exist on the account but not in the bundle are kept
   (removing a locale cascades into documents and is too destructive for an
   import path). The dashboard shows an explicit warning modal that the user
   must confirm before the import runs.
4. **Server-side validation, all-before-any-write.** Import validates the
   whole bundle before mutating anything: structural parse (unknown
   `format`/`version`, 1 MB cap, two-letter locale codes matching
   `normalizeLocale`, locale cross-references between sections), CV version
   selections (`validateResumePresetSelection`), and every document's
   `yaml_content` via the `validate_resume_document_yaml` RPC. Any failure
   rejects the entire import with 400 — existing data is untouched. There is
   no cross-request transaction, so a mid-import DB failure can still leave a
   partial import; the up-front validation makes that an infrastructure
   failure mode, not an input one.
5. **Feature flag `user_data_transfer_enabled`.** A new row in the existing
   `platform_feature_flags` table (migration
   `20260703_user_data_transfer_flag.sql`), read by
   `isUserDataTransferEnabled()` in `app/lib/platform-feature-flags.ts`
   (generic `isFeatureFlagEnabled(key)` reader — the `pdf_draft_enabled`
   pattern from ADR 0014). The flag is checked in two independent places:
   `app/dashboard/page.tsx` (buttons hidden when disabled) and both
   `/api/resume/transfer/*` routes (403 when disabled) — the UI prop is never
   trusted.
6. **Fail-open.** Like `pdf_draft_enabled`, a missing row or read error counts
   as enabled: the flag is an operational kill switch, not a security
   boundary. Auth (`requireRequestActor` with all of
   `resume.{document,language,preset}.{read,write}_own` capabilities) remains
   the security gate.
7. **No admin toggle UI yet.** The admin disables the feature via SQL
   (`update platform_feature_flags set enabled = false where key =
   'user_data_transfer_enabled';`) — RLS already restricts writes to `admin`.
   A generic Feature Flags panel in `/admin` remains future work (carried over
   from ADR 0014).

## Consequences

- Users get a portable, human-readable backup of everything they authored;
  restore is one file upload.
- Import is destructive for private CV versions by design; the confirmation
  modal is the only guard. If this proves too sharp, a merge mode can be added
  behind the same routes.
- The bundle format is now a public-ish contract: future schema changes must
  bump `version` and keep an import path for `version: 1`.
- Two feature-flag reader modules now exist (`pdf-feature-flags.ts` and
  `platform-feature-flags.ts`); the PDF one can migrate to the generic reader
  opportunistically.

## Implementation Checklist

- [x] Migration `supabase/migrations/20260703_user_data_transfer_flag.sql`
- [x] `app/lib/platform-feature-flags.ts` (`isUserDataTransferEnabled`)
- [x] `app/lib/user-data-transfer.ts` (bundle build/parse contract)
- [x] `GET /api/resume/transfer/export`, `POST /api/resume/transfer/import`
- [x] Dashboard Export/Import buttons + confirmation modal, flag-gated
- [x] Test contract: `tests/user-data-transfer.test.mjs`
- [x] ADR added to `docs/adr/README.md`
