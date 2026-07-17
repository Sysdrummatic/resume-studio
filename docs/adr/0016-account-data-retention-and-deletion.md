# ADR 0016: Account Data Retention And Deletion

Status: Accepted

Date: 2026-06-14

Extends: [ADR 0007](0007-publication-analytics-and-audit-retention.md) (audit/analytics
retention windows are referenced, not modified, by this ADR)

## Context

The Privacy Policy (`app/privacy/page.tsx`, Phase I PR1) commits to a 30-day deletion
window and a one-month response time for data subject requests, but the project had no
written description of (a) what "deletion" actually does to the schema, (b) which tables
are covered, or (c) the manual operational process for handling these requests. This ADR
documents the current state and the manual process for Phase I. It does not introduce
schema changes.

## Scope

This ADR covers the following tables (all transitively owned by `auth.users` via
`public.profiles`):

- `public.profiles`
- `public.resume_documents`
- `public.resume_revisions`
- `public.resume_presets`
- `public.resume_preset_variants`
- `public.resume_public_links`
- `public.resume_published_cvs`
- `public.resume_published_cv_locales`
- `public.resume_user_locales`
- Stored avatar/profile images (`profiles.avatar_url`)

`public.admin_audit_logs` is addressed separately below; its retention windows remain
governed by [ADR 0007](0007-publication-analytics-and-audit-retention.md).

## Decision

### Active accounts

Account, profile, and CV data (all tables in Scope) are retained **indefinitely** while
the account exists. There is no automatic expiry or inactivity-based purge.

### Deletion request lifecycle

1. **Request received.** A verified request (access, rectification, erasure, restriction,
   or portability) arrives via the contact channel published in the Privacy Policy
   (`opencvproject@proton.me`).
2. **30-day grace period.** From the point the request is confirmed, a 30-day grace
   period applies before execution — matching the Privacy Policy's "Data Retention"
   section (Section 5).
3. **Execution.** An admin deletes the corresponding `auth.users` row via the Supabase
   Auth Admin API (the same mechanism already used by
   `DELETE /api/admin/users/[userId]`, see `app/api/admin/users/[userId]/route.ts`).
   Deleting `auth.users` cascades to `public.profiles` (`ON DELETE CASCADE`), which in
   turn cascades to every table in Scope (see Cascade Map below). No additional manual
   cleanup steps are required for these tables.

### Cascade map (verified against `supabase/migrations/*`)

| Table | Cascades from | Rule |
| --- | --- | --- |
| `profiles` | `auth.users` | `ON DELETE CASCADE` |
| `resume_documents` | `profiles` | `ON DELETE CASCADE` |
| `resume_revisions` | `resume_documents` | `ON DELETE CASCADE` |
| `resume_public_links` | `resume_documents` | `ON DELETE CASCADE` |
| `resume_presets` | `profiles`, `resume_documents` | `ON DELETE CASCADE` |
| `resume_preset_variants` | `profiles`, `resume_presets`, `resume_documents` | `ON DELETE CASCADE` |
| `resume_published_cvs` | `profiles` | `ON DELETE CASCADE` |
| `resume_published_cv_locales` | `resume_published_cvs` (composite FK) | `ON DELETE CASCADE` |
| `resume_user_locales` | `profiles` | `ON DELETE CASCADE` |

**Avatars**: `profiles.avatar_url` stores a `data:image/...` base64 data URI directly in
the row (enforced by `update_own_profile`, see
`supabase/migrations/20260603020000_zz_update_own_profile_rpc.sql`). There is no separate
Supabase Storage object to clean up; the avatar is removed together with the `profiles`
row.

All tables in Scope cascade automatically from `auth.users` deletion. **No schema gaps
were found for the tables in Scope.**

### `admin_audit_logs` (exception, per ADR 0007)

`admin_audit_logs` is intentionally **out of Scope** for deletion. Entries that reference
a deleted account are retained per ADR 0007's existing retention windows (minimum 365
days, target 730 days), on the basis of legitimate interest in security/incident response
(GDPR Art. 17(3)(b)/(e)).

- `admin_audit_logs.target_user_id → profiles(id)` is `ON DELETE SET NULL`: existing rows
  referencing the deleted account are preserved with `target_user_id` cleared.
- `admin_audit_logs.metadata` for `user.deleted` (the action written when an account is
  removed) stores only `actorRole`, `targetRole`, and `deleted_via` — **UUIDs and role
  strings only, no email or display name**. No further pseudonymization action is
  required.

### Aggregated analytics

Aggregated/anonymized public-link view analytics are tied to `resume_public_links` rows
and are removed automatically when those rows cascade-delete with the account. No
separate handling is required.

### Manual process statement

This ADR documents the **current manual process** for Phase I. Self-service account
deletion/export automation remains tracked in
`docs/guides/archive/phase-i-features-backlog.md` ("Privacy and legal") and is out of
scope here.

## Known Gaps

1. **`user.deleted` audit entry is silently dropped.** The existing
   `DELETE /api/admin/users/[userId]` handler calls `deleteAuthUserAsService(userId)`
   first — which cascades away the `profiles` row for that user — and only afterwards
   calls `writeAdminAuditLog({ targetUserId: userId, action: "user.deleted", ... })`.
   Because `admin_audit_logs.target_user_id` is a real foreign key to `profiles(id)` and
   the referenced row no longer exists at insert time, this insert violates the FK
   constraint. `writeAdminAuditLog`/`insertTable` do not check the result for an error,
   so the API still returns `{ ok: true }`, but **no audit row is actually written for
   the deletion itself**. Recommendation: write the audit log entry *before* deleting the
   `auth.users` row (or set `target_user_id` to `null` and record the former user id only
   in `metadata`). Tracked as a future schema/code-change PR; not fixed by this ADR.
2. **`admin_audit_logs.actor_user_id` is `ON DELETE RESTRICT`.** An admin or manager
   account that has ever performed an audited action cannot have its `auth.users` row
   deleted while those `admin_audit_logs` rows exist — the delete will fail at the
   database level. This is acceptable for the common case (deleting `user`/`recruiter`
   accounts, which are not `actor_user_id` on any audit row), but means **staff account
   deletion is not currently supported by the cascade-only process** described above.
   Recommendation: handle staff account deletion as a separate, manually-reviewed
   procedure (re-assign or archive the relevant audit rows first) in a future PR.

## Consequences

- The 30-day grace period and one-month response SLA already published in the Privacy
  Policy are backed by a documented, schema-verified deletion mechanism for all
  user-owned CV/profile data.
- Operators have a single source of truth (this ADR + the data subject request runbook)
  for handling erasure/access requests without guessing at cascade behavior.
- The two Known Gaps above are explicitly tracked rather than silently relied upon;
  neither blocks the manual process for ordinary (`user`/`recruiter`) accounts, which is
  the expected case for Phase I.

## Implementation Checklist

- [x] Document retention rules for all tables in Scope.
- [x] Verify and record the cascade map from `auth.users` to all tables in Scope.
- [x] Document the `admin_audit_logs` exception and confirm it stores no PII beyond UUIDs/roles.
- [x] Record Known Gaps for future schema/code-change PRs.
- [ ] Address Known Gap 1 (audit entry ordering) in a future PR.
- [ ] Address Known Gap 2 (staff account deletion) in a future PR.
