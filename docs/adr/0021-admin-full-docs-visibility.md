# ADR 0021: Admin Full Docs Visibility

Status: Accepted

Date: 2026-07-19

Extends: [ADR 0020](0020-test-user-flag-gates-beta-docs-access.md) (test user flag
gates beta docs access)

## Context

ADR 0020 made the in-app docs site's Test Scenarios category visible only to
accounts with `is_test_user = true` while the `beta_test_scenarios_visible`
platform flag is enabled. Under that rule an `admin` sees Test Scenarios only if
their own account also happens to carry the test-user flag — while at the same
time holding `admin.area.access`, full user-management rights over every beta
tester, and read access to audit and content-safety surfaces. Withholding the
beta documentation from the operator who runs the beta program was an
inconsistency in the original rule, not a deliberate boundary.

## Decision

`canViewTestScenarios()` (`app/lib/docs/access.ts`) short-circuits to `true` when
`isAdminRole(actor.role)` holds, before the `is_test_user` check and before any
flag read. Admins therefore see and can open every docs section unconditionally —
regardless of their own `is_test_user` value and regardless of the
`beta_test_scenarios_visible` flag state.

**Managers are unaffected.** A `manager` keeps the exact ADR 0020 rule
(`is_test_user` + flag): docs visibility is tied to actually participating in the
beta as a tester, and the manager role's existing capabilities (read-only admin
area access) do not imply beta-program operation. The bypass reuses the existing
`isAdminRole()` helper from `app/lib/rbac.ts`, not a raw role string comparison,
so any future change to what "admin" means propagates automatically.

The single-helper contract from ADR 0020 stands: every consumer goes through
`canViewTestScenarios()`; the server-side `notFound()` gate on
`/docs/test-scenarios/[slug]` and the sidebar visibility both inherit the bypass
from the one code path.

## Consequences

- Admins can review and QA beta documentation without flagging their own account
  as a test user (which would also exclude them from platform counters per
  ADR 0019).
- Disabling `beta_test_scenarios_visible` still hides Test Scenarios from every
  non-admin test user at once; admins retain visibility, which is what a
  kill-switch operator needs to verify content while the section is dark.
- `is_test_user` semantics for non-staff accounts are unchanged from ADR 0019/0020.

## Test contract

`tests/beta-docs-site.test.mjs` — admin truth-table rows (unconditional `true`,
flag never read), manager rows unchanged, and a source-level assertion that the
helper imports `isAdminRole` rather than comparing role strings.
