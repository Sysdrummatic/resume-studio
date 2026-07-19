# ADR 0020: Test User Flag Gates Beta Docs Access

Status: Accepted

Date: 2026-07-19

Extends: [ADR 0019](0019-test-user-and-staff-account-flags.md) (test user and staff
account flags)

Related: [ADR 0018](0018-user-data-export-import.md) (feature-flag kill-switch
precedent)

## Context

Phase G's beta program needs testers to (a) self-identify at registration and
(b) see beta-only test-scenario documentation inside the app. ADR 0019 introduced
`profiles.is_test_user` as admin-managed metrics metadata and explicitly declared
in its Non-goals that no RBAC, RLS, or rendering behavior depends on it. Creating a
second, near-identical flag just to avoid amending that ADR would duplicate state
and admin tooling for no benefit.

## Decision

Reuse `is_test_user` and formally extend its meaning:

### 1. Self-service opt-in at signup (INSERT-time only)

The sign-up form offers an optional "I'm joining as a beta-tester" checkbox
(unchecked by default, rendered above the policy-acceptance checkbox). The value
travels as `wantsBetaTestUser` through `POST /api/auth/signup` into the Supabase
signup `data` metadata (`wants_beta_test_user`), and
`handle_new_auth_user()` (migration `20260719000000_beta_tester_signup_optin.sql`)
sets `profiles.is_test_user` from `raw_user_meta_data ->> 'wants_beta_test_user'`
on the profile INSERT.

This does not weaken ADR 0019's privileged-field boundary: the
`profiles_guard_update` trigger fires `BEFORE UPDATE` only
(`20260410000000_phase_b_yaml_data_layer.sql`), so the INSERT-time assignment is
outside its scope by construction, and post-signup changes remain admin-only via
`set_user_flag` / `update_user_privileges`. Users cannot change the flag after
account creation.

### 2. `is_test_user` now also gates the Test Scenarios docs category

The in-app documentation site (`/docs`, Markdown committed under `content/docs/`)
has a **Test Scenarios** category visible only when
`canViewTestScenarios(actor)` (`app/lib/docs/access.ts`) holds:
`actor.isTestUser === true` **and** the `beta_test_scenarios_visible` platform
feature flag is enabled. Consumers must go through this helper, never raw flag
checks. Enforcement is server-side on the `/docs/test-scenarios/[slug]` route
itself (`notFound()` for ineligible actors); nav visibility is UX only.

### 3. `beta_test_scenarios_visible` master switch

Migration `20260719010000_beta_test_scenarios_flag.sql` seeds the
`platform_feature_flags` row `beta_test_scenarios_visible` with
`enabled = true`. It is read through the generic fail-open
`isFeatureFlagEnabled()` reader — a UX kill-switch, not a security boundary
(per-user `is_test_user` remains the access gate). No admin toggle UI; admin
flips it via SQL, matching the `user_data_transfer_enabled` precedent (ADR 0018).

### Supersession of ADR 0019's Non-goal

ADR 0019 states: "Flags do not change what a flagged account can do — no RBAC,
RLS, publishing, or public-rendering behavior depends on them. They are metrics
metadata only." This ADR supersedes that sentence for `is_test_user` **only and
only for docs-site visibility**: the flag now additionally gates access to
`/docs/test-scenarios/*`. Everything else stands — no RLS, publishing,
public-rendering, or role-capability behavior depends on either flag, `is_ocv_staff`
remains pure metrics metadata, and the counter-exclusion predicate is unchanged.
ADR 0019's text is not edited.

## Consequences

- Beta testers self-select at registration; admins keep full post-hoc control via
  the existing admin flag columns.
- Accounts that opt in are automatically excluded from platform counters
  (ADR 0019's predicate) — expected and desirable for beta accounts.
- Docs content is git-committed Markdown rendered with raw-HTML pass-through
  disabled (`app/lib/docs/markdown.ts`) — no CMS, no user-submitted content.
- Disabling `beta_test_scenarios_visible` hides the category for every test user
  at once without touching any `profiles` row.

## Test contract

`tests/beta-tester-signup-optin.test.mjs` (signup wiring + INSERT-time migration),
`tests/beta-docs-feature-flag.test.mjs` (flag seed),
`tests/beta-docs-site.test.mjs` (`canViewTestScenarios` truth table, server-side
route gating, markdown neutralization, nav entry).
