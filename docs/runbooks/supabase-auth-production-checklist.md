# Supabase Auth: production verification checklist (#119)

Repository code and `supabase/config.toml` (local dev only) do not prove what a hosted project does.
Tick an item only with evidence from the hosted project (dashboard, Management API or advisor).
Do this on **test first**, then **prod**.

## Verified 2026-11-05 (Supabase advisors, read-only)

| Control | prod | test |
| --- | --- | --- |
| Leaked-password protection (HIBP) | **off** (needs Pro plan) | **off** |
| `before_user_created` hook enabled | migration applied 2026-11-06; hook enabled in Dashboard by the owner (not independently verified) | enabled (older version replaced by the migration) |
| Objects on test not in repo | n/a | `blocked_signup_email_domains`, `assert_staff_aal2()`, `current_session_aal()` |

Everything else below is **unverified** until ticked.

## Steps

1. Reconcile test drift: inspect the three test-only objects above, then drop them or fold them into the repo migration.
2. Apply `20261105000000_auth_boundary_controls.sql` with `apply_migration` (same SQL, same name) to test, then prod (ledger drift: see TECH_DEBT.md).
3. Auth > Hooks: enable **Before User Created** → Postgres function `public.hook_before_user_created` on test, then prod.
4. Auth > Sign In / Providers > Email: **Confirm email** on; **Secure password change** on; **Secure email change** on.
5. Auth > Password: minimum length **10**; leaked-password protection on (Pro plan; record the decision if staying on Free).
6. Auth > URL Configuration: Site URL = canonical app URL; Redirect URLs = exact `https://<host>/login` entries, no wildcards.
7. Auth > Sessions: refresh-token rotation on, reuse interval 10 s.
8. Auth > MFA: TOTP enroll and verify on (prod already).
9. CAPTCHA: not enabled. Needs a processor/privacy assessment first (TECH_DEBT.md).
10. Run direct-API checks against **test**:
    `AUTH_DIRECT_TESTS=1 node --use-system-ca --env-file=.env.local --test tests/auth-direct-api.test.mjs`
    (add `AUTH_DIRECT_EXPECT_HOOK=1` once step 3 is done on test).
11. Staff MFA (`staff_mfa_required` flag, default off): do NOT enable until staff can enroll and verify a TOTP factor
    in the app and sign-in handles the MFA step. Enabling earlier locks every admin/manager out.

## Account enumeration

With **Confirm email** on, Supabase returns the same success shape for a new and an existing address on signup, and recovery/resend
never confirm existence. Re-check by signing up the same address twice on test and comparing responses.
