# Runbook: RLS / policy review (Supabase)

Use this runbook when changing anything that affects access control (policies, RPC, triggers).

## Threat model (quick)

- Accidental privilege escalation via overly-broad policies.
- `security definer` functions callable by untrusted roles without checks.
- Recursive policy issues (common with profile lookups).
- Service role bypass assumptions leaking into client-access paths.

## Review steps (minimum)

1. List every table affected and intended access:
   - Who can `select/insert/update/delete`?
   - Which rows (own vs staff vs public)?
2. For each policy:
   - Confirm `using` / `with check` expressions match intent.
   - Confirm policies are additive (Postgres RLS semantics).
3. For each RPC (`security definer`):
   - Confirm explicit role checks happen inside the function.
   - Confirm function does not leak data in error messages.
   - Confirm `set search_path = public`.
4. Check service role behavior:
   - Any bypass paths must be server-only and protected by env vars.
5. Validate role boundaries:
   - `admin` can do everything staff should.
   - `manager` is constrained (cannot manage admins/managers; cannot self-escalate).
   - `user`/`recruiter` can only manage own data.

## What to document in the PR

- Summary of access rules per table.
- Why `security definer` was needed (if used).
- Rollback plan and data risk notes.

