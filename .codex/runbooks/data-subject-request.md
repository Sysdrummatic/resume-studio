# Runbook: Data subject request (access / rectification / erasure / portability)

Use this runbook when a privacy-related request arrives via the contact channel
published in the Privacy Policy (`opencvproject@proton.me`). See
[ADR 0016](../../docs/adr/0016-account-data-retention-and-deletion.md) for the
underlying retention/deletion model and Known Gaps.

## Trigger

- An email is received at the Privacy Policy contact address requesting access,
  rectification, erasure, restriction, or portability of personal data.

## Identity verification (baseline)

- Confirm the request originates from (or replies to) the email address associated with
  the account on file. Reply-to match is the baseline verification step before any data
  is accessed or changed.

## Access / portability requests

1. **CV content**: direct the user to the existing export options available from their
   own dashboard — PDF, YAML, CVasCode, or `.txt` (see `app/api/resume/export/*`). No
   admin action is needed; this is self-service.
2. **Account metadata not covered by CV export** (email, `display_name`, role,
   `created_at`, `person_slug`, avatar): an admin runs a read-only query against
   `public.profiles` via the Supabase SQL editor/dashboard, exports the result as JSON,
   and sends it to the requester.

## Rectification

- The user self-serves via the existing profile/editor UI wherever possible (bio,
  avatar, CV content, language versions).
- For fields not editable in the UI, an admin updates the row via the Supabase
  dashboard.

## Erasure requests

**Self-service (preferred)**: if the requester still has account access, direct them to
**Profile > Delete account and all data** (two-step, type-to-confirm). This calls
`DELETE /api/user/account`, which deletes `auth.users` immediately (cascading to all
tables per ADR 0016's Scope and Cascade Map) and sends a confirmation email if
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` are configured. No admin action is needed, and the
30-day grace period below does not apply to this path.

**Manual (fallback for users without account access)**:

1. Confirm the request and start the **30-day grace period** defined in
   [ADR 0016](../../docs/adr/0016-account-data-retention-and-deletion.md).
2. On expiry, if the request has not been withdrawn, an admin deletes the
   `auth.users` row via the Supabase Auth Admin API (the same mechanism used by
   `DELETE /api/admin/users/[userId]`). This cascades to all tables listed in ADR 0016's
   Scope and Cascade Map.
3. Record completion (date, request type, outcome) in an internal tracking log kept
   **outside the application database** (e.g. a dated entry referencing only the request
   ticket/email thread). The tracking log must not itself retain the deleted user's PII.
4. Note: per ADR 0016 Known Gap 1, the automated `user.deleted` audit log entry may not
   be written due to a foreign-key ordering issue. The internal tracking log entry from
   step 3 is therefore the authoritative record of the deletion until that gap is fixed.

## Restriction of processing

- If a user requests restriction rather than erasure, set the account's `is_active`
  flag to `false` via the Supabase dashboard or the admin user management UI
  (`PATCH /api/admin/users/[userId]`) and record the restriction in the tracking log.
  Do not delete any data for a restriction request.

## Response SLA

- Respond within **one month** of the request, per GDPR Art. 12(3).

## Edge cases

- **Request for a non-existent or already-deleted account**: confirm no matching
  `profiles` row exists, reply to the requester confirming no data is held, and record
  the outcome in the tracking log.
- **Duplicate requests**: treat as a single request; do not restart the grace period
  unless the requester explicitly asks to.
- **Request received during an active grace period**: treat as confirmation of the
  existing request. Do not restart the 30-day clock unless the requester asks for it.

## What to record in the tracking log

- Date of request and date of confirmation.
- Request type (access / rectification / erasure / restriction / portability).
- Outcome and date of completion.
- Reference to the request ticket/email thread only — no copied PII.
