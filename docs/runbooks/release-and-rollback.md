# Release checklist and rollback playbook

Operational procedure for shipping `master` to production and undoing it. Pairs with
[deployment QA](../guides/testing/deployment-qa.md) (what to verify) and the
[validation runbook](testing-and-validation.md) (which commands to run). Hosting is
Netlify (build config in [`netlify.toml`](../../netlify.toml)); data is two Supabase
projects, `test` and `prod`.

## Release checklist

Complete in order. Stop at the first failure; do not skip a step to save time.

**Merging to `master` is the production deploy:** Netlify publishes `master` automatically.
Everything that must be true *before* production changes (preview, rollback target,
migrations) therefore comes before the merge. To hold a merged commit back, **Lock
publishing** in Netlify first and unlock it when you are ready to deploy.

1. **Scope is clear.** Every PR in the release is merged into the release branch and the
   release PR to `master` is open but **not merged**; no open `priority: critical` /
   `priority: high` bug in the milestone.
2. **CI is green** on the release PR (`.github/workflows/ci.yml`: lint, typecheck, test,
   build, `audit:prod`, `test:rls`).
3. **Environment contract holds.** `npm run qa:env -- --target=production` exits 0
   (names only are reported; never paste values).
4. **Migrations are ready.** List new files in `supabase/migrations/` since the last
   release. For each: reviewed under the [Supabase/RLS checklist](../CHECKLISTS.md),
   applied and verified on `test` first, **compatible with the code currently running in
   production** (additive first, destructive later), and a forward-fix noted (see below).
5. **Preview verified.** `npm run smoke:preview` passes on the Deploy Preview of the
   release PR, plus the manual flows in the deployment QA guide that the release touches.
6. **Rollback target recorded.** Write down the current production Netlify deploy ID and
   `git rev-parse` of the commit it serves, and the newest applied migration name. These
   three values are what a rollback needs.
7. **Apply migrations to `prod`** with `mcp__supabase-prod__apply_migration` (same SQL and
   name as on `test`; `supabase db push` is unreliable here, see
   [TECH_DEBT.md](../../TECH_DEBT.md)). Migrations ship **before** the code that needs them.
8. **Merge the release PR to `master`** and wait for the Netlify production deploy to be
   published. This is the moment production changes.
9. **Production smoke:** the [production smoke protocol](production-smoke-protocol.md);
   the Post-deploy section of the
   [deployment QA guide](../guides/testing/deployment-qa.md) is its checklist.
10. **Announce** in the agreed channel: what shipped, anything users must do.

## Rollback decision

Roll back when a production-smoke step fails, error rates jump, or auth/publication/export
is broken for real users. Do not debug on production first; restore service, then investigate.

| Symptom | Roll back |
| --- | --- |
| Broken UI/route/API, data untouched | Code only |
| New migration breaks the app or RLS | Code, then forward-fix the migration |
| Data corrupted or lost | Stop writes, restore from backup (database), then code |

## Code rollback (minutes)

1. Netlify → Deploys → pick the deploy recorded in step 6 → **Publish deploy**. This
   restores the previous build without a rebuild.
2. **Lock publishing** on that deploy immediately. Publishing an old deploy does not stop
   auto-publishing: while it stays enabled, the next Git-triggered production deploy
   overwrites the rollback.
3. Re-run the post-deploy smoke. Confirm the served commit matches the recorded one.
4. Revert on `master` (via a branch and PR) so the repo matches production. Check how the
   release landed first: `git rev-list --parents -n 1 <sha>` prints the commit followed by its
   parents.
   - **Squash or rebase commit** (one parent): `git revert <sha>`.
   - **Merge commit** (two parents): `git revert -m 1 <sha>`. Without `-m` Git stops with
     `is a merge but no -m option was given`; `-m 1` keeps the first parent, the mainline
     (`master`), as the side to return to. Revert a merge only for the whole release; to take
     back part of it, revert the individual commits.

   Only after the revert is merged, **Unlock publishing** (Start auto publishing) again.

## Database rollback

Migrations are append-only for shared environments; there are no down-migrations.

- **Preferred: forward-fix.** Write a new migration that undoes or repairs the change, apply
  it to `test`, then `prod` with `apply_migration`. Never edit or delete an applied
  migration file or hand-edit the ledger.
- **RLS regression:** restore the previous policy definition in a new migration immediately;
  treat as a security incident (below). Weakening a policy still requires Architecture review.
- **Data loss/corruption only:** use a Supabase backup/point-in-time restore on the affected
  project. A restore is project-wide and discards writes after the restore point, so announce
  a maintenance window first and capture current data you can still export.

## DNS / routing

Production routes through Netlify; a code rollback needs no DNS change. Touch DNS only when
Netlify itself is unavailable, and keep the previous record values written down before editing.

## Communication

- Within 15 minutes of a user-visible rollback: post what is broken, what users should do,
  and the next update time.
- After resolution: confirm service is restored and whether any data (publications,
  sign-ups, exports) in the affected window needs re-doing.

## Incident follow-up

Open a post-mortem within two working days using the template below. Blameless; focus on
the missing check, not the person.

```md
# Post-mortem: <short title> (<YYYY-MM-DD>)

- **Impact:** who/what was affected, for how long
- **Timeline:** detection → decision → rollback → recovery (UTC)
- **Root cause:**
- **Why it was not caught:** which gate (CI, preview smoke, review) missed it
- **What went well / badly:**
- **Actions:** owner, issue link, due date (add a regression test for the cause)
```

## Security incidents

If a secret leaked or an RLS/auth boundary was weakened: rotate the secret first (Netlify
env + Supabase), roll back the code/policy, then follow the data-subject and audit steps in
the private `OpenCiVera-Project` runbooks.
