# ADR 0026: Account Deletion, Audit Trail And Staff Accounts

Status: Proposed

Date: 2026-11-19

Extends: [ADR 0016](0016-account-data-retention-and-deletion.md) (account data
retention and deletion)

Related: [ADR 0003](0003-privacy-first-admin-access.md),
[ADR 0007](0007-publication-analytics-and-audit-retention.md)

Tracking: issue #297; the gaps are listed in `TECH_DEBT.md` ("Usunięcie konta: luki
w `admin_audit_logs` (ADR 0016)").

## Context

ADR 0016 documented the deletion cascade and recorded two known gaps without fixing
them. Self-service deletion (`DELETE /api/user/account`, GDPR Art. 17) was added
afterwards, and it exposed a third. All three are still open:

1. **The `user.deleted` audit entry is never written.** `DELETE
   /api/admin/users/[userId]` deletes the auth user first, which cascades away the
   `profiles` row, and only then calls `writeAdminAuditLog` with
   `target_user_id = <deleted id>`. `admin_audit_logs.target_user_id` is a foreign
   key to `profiles(id)`, so the insert violates it. The writer does not inspect the
   result, so the API still answers `{ ok: true }` and the deletion leaves no
   audit record.
2. **Staff accounts cannot be deleted.** `admin_audit_logs.actor_user_id` is `NOT
   NULL ... ON DELETE RESTRICT`. An admin or manager who ever performed an audited
   action cannot have the `auth.users` row removed.
3. **Self-service deletion does not know about (2).** `requireRequestActor()` does
   not restrict the role, so an admin or manager can call the route on their own
   account. The last-admin check passes for a non-last admin, the Admin API call
   starts, and the cascade fails at Postgres level with a generic 500.

The self-service route deliberately writes no audit row: actor and target are the
same account, and an `actor_user_id` reference would itself block the deletion. That
decision stands.

## Decision

### 1. Audit before delete, fail closed (gap 1)

`DELETE /api/admin/users/[userId]` writes the `user.deleted` audit row **before**
calling `deleteAuthUserAsService`, while the target profile still exists.

- The row keeps `target_user_id`. When the cascade removes the profile, the existing
  `ON DELETE SET NULL` clears it. This matches ADR 0016: the retained row holds only
  the actor, the action and role strings, with no pointer to the erased person.
- `metadata` is unchanged: `actorRole`, `targetRole`, `deleted_via`. The deleted
  user's id is not copied into `metadata`.
- If the audit insert fails, the deletion does not start. A privileged, irreversible
  action that cannot be recorded is refused (security and data integrity come before
  delivery speed).
- If the Admin API call fails after the row was written, the handler writes a
  compensating `user.delete_failed` row (best effort) so the log does not claim a
  deletion that did not happen.

### 2. Staff accounts are not hard-deleted while they have audit history (gap 2)

`actor_user_id` keeps `ON DELETE RESTRICT`. An account that appears as an actor in
`admin_audit_logs` is retired by deactivation (`is_active = false`) and, when erasure
is requested, by a documented, manually reviewed **anonymization** procedure
(profile fields cleared, auth identity replaced), not by `DELETE` on `auth.users`.

The procedure itself is follow-up work and is tracked in `TECH_DEBT.md`. Until it
exists, a staff erasure request is handled as a manual, reviewed task.

The restriction ends on its own for any actor whose audit rows have been purged under
the retention windows of ADR 0007. No purge job is confirmed to exist yet; that is
checked separately under issue #297.

### 3. Self-service route refuses accounts with audit history (gap 3)

Before calling the Admin API, `DELETE /api/user/account` asks a new
`SECURITY DEFINER` function, `has_admin_audit_history(p_user_id uuid)`, whether the
caller appears as `actor_user_id`. If so it answers
`409 { error: "audit_history", message }` and deletes nothing. The Profile modal shows
the message inline, the same way it shows `last_admin` and `only_account`.

The database restriction stays in place as the backstop. The check decides on audit
history, not on role, so a manager who never performed an audited action can still
delete their own account.

## Alternatives considered

- **Make `actor_user_id` nullable with `ON DELETE SET NULL`.** Rejected. Staff
  deletion would work, but privileged actions would lose their actor, which defeats
  the incident-response purpose that justifies keeping audit rows at all (ADR 0007).
- **Copy the actor or target id into `metadata` and set the foreign keys to `SET
  NULL`.** Rejected. It reintroduces the identifier that ADR 0016 relies on being
  gone after erasure.
- **Skip the audit row for deletions.** Rejected. Deleting another account is a
  privileged action covered by ADR 0003 and ADR 0007.
- **Soft-delete everyone.** Rejected. It does not satisfy Art. 17 for ordinary users;
  the cascade in ADR 0016 already does.

## Consequences

- Every admin-initiated deletion leaves an audit row, or does not happen.
- A deleted account is no longer linkable to its audit row, by design.
- Staff erasure becomes an explicit, reviewed procedure instead of a failing request.
- Staff cannot self-delete once they have acted; they must ask another admin. The
  last-admin safeguard is unaffected.
- A failed Admin API call after the audit write produces two rows. The explorer
  should show `user.delete_failed` next to `user.deleted`.

## Open questions

1. Confirm decision 2 (anonymization) against the alternative of nullable actors. It
   trades forensic attribution for simpler erasure and needs the owner's decision,
   ideally with the legal review already pending for the privacy policy.
2. Who performs and reviews a staff anonymization, and how it is recorded.

## Test contract (planned)

- `tests/account-deletion.test.mjs`: the `audit_history` 409, no Admin API call on
  refusal, last-admin checks unchanged.
- New `tests/admin-user-delete-audit.test.mjs`: the audit insert happens before the
  deletion, a failed insert aborts it, a failed deletion writes `user.delete_failed`.
- Live database check in the existing RLS suite (`npm run test:rls`) for
  `has_admin_audit_history` and for the retained `RESTRICT` backstop.

## Implementation Checklist

- [ ] Accept or amend this ADR (open questions above).
- [ ] Reorder the admin deletion handler and make `writeAdminAuditLog` report
      failures for this action.
- [ ] Migration `has_admin_audit_history()`; apply to `test` and `prod` through the
      Supabase MCP, as `CLAUDE.md` requires.
- [ ] `409 audit_history` in `DELETE /api/user/account` and the Profile modal message
      in EN and PL.
- [ ] Staff anonymization runbook (and code, if the owner chooses to automate it).
- [ ] Update the `TECH_DEBT.md` entry and the "manual process" wording that ADR 0016
      carries; the privacy policy page already describes self-service deletion.
