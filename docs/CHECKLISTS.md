# Task checklists — OpenCiVera

Canonical definition-of-done checklists, shared by Codex ([AGENTS.md](../AGENTS.md))
and Claude Code ([CLAUDE.md](../CLAUDE.md)) — edit this file, not a copy in
either agent's own config. Use only the sections relevant to the requested
change. Working rules are in [AGENTS.md](../AGENTS.md) / [CLAUDE.md](../CLAUDE.md);
required commands are in the [validation runbook](runbooks/testing-and-validation.md).

## General delivery

- [ ] Outcome and acceptance criteria are clear.
- [ ] Existing working-tree changes and development servers are preserved.
- [ ] Git naming and commit messages follow the current [workflow](guides/development/git-workflow.md).
- [ ] Changed behavior has a regression test that failed before the implementation.
- [ ] Relevant validation passes (`npm run lint`, `npm run typecheck`, `npm test`
      at minimum); unavailable checks are identified honestly.
- [ ] No hardcoded secrets/env vars; error handling included; Zod validation
      for new user input.
- [ ] RLS policy unchanged, or the change is Architecture-approved.
- [ ] Guides, contracts and manual scenarios reflect the change.
- [ ] Rollout/rollback and local/pushed/deployed status are explicit where applicable.

## Auth/session/admin

- [ ] Signup, verification, signin/signout and refresh work when affected.
- [ ] Inactive/unverified accounts cannot use restricted operations.
- [ ] Anonymous access and each affected role boundary are tested.
- [ ] APIs derive the actor/owner from the session.
- [ ] Privileged actions preserve audit behavior without logging private CV content.

## Supabase / RLS / RPC

- [ ] Shared-environment changes use a new migration.
- [ ] Own-account and cross-account access are tested at API and database boundaries.
- [ ] RPCs validate inputs, privileges and ownership independently.
- [ ] Security-definer functions are minimal and use a safe search path.
- [ ] Retries/concurrency do not duplicate publications or overwrite unrelated data.
- [ ] Data impact, migration order, target environment and rollback are documented.
- [ ] Isolated/mocked checks are distinguished from real Supabase checks.

## YAML / language / rendering

- [ ] EN/PL schema and label changes preserve parity and fallback.
- [ ] Sample locale paths in `public/data/public/locales.yaml` resolve.
- [ ] Import, normal editing and export honor the same data contract.
- [ ] Editor preview and public rendering show the intended selected data.
- [ ] Relevant validators and behavioral contract tests are updated.

## UI / editor / onboarding

- [ ] Existing editor/portal tokens and reusable components are used.
- [ ] Desktop/mobile, dark/light and relevant EN/PL flows are checked in a browser.
- [ ] Focus, keyboard controls, dialogs and overflow work.
- [ ] Failed saves block advancement and preserve the current inputs.
- [ ] Pausing/resuming, import and explicit publication consent work if touched.
- [ ] Admin test drafts remain isolated from real Master CV/profile/languages.
- [ ] Shared shell/navigation works after leaving the changed screen.

## Public CV / SEO

- [ ] Active `/{personSlug}/{publicId}` links render their selected snapshot data.
- [ ] Missing/inactive links do not expose CV content.
- [ ] Unpublish, republish and publication retries behave consistently.
- [ ] Indexing controls, canonical URLs and locale selection remain correct.
- [ ] Public export and rendering never fall back to private live Master CV data.

## Critical flows quick reference

Which files map to which end-to-end flow, for scoping the checklist sections above:

| Flow | Files that trigger it | Checklist |
|------|-----------------------|-----------|
| **Auth** | `app/api/auth/`, `app/lib/auth-*.ts` | Signup → verify → signin → signout → reset password |
| **Protected routes** | RBAC logic, any top-level protected segment | Redirects work, role boundaries enforced |
| **Resume rendering** | `app/resume/`, `app/components/resume-renderer/` | Locale switching (EN/PL) works, all sections render |
| **Editor** | `app/master-resume/**` | Publish, rollback, draft save/restore |
| **Public view** | `app/[personSlug]/[publicId]/` | Canonical route renders, indexing controls |
| **Admin RBAC** | `app/admin/`, `app/api/admin/**` | Role hierarchy enforced, user deletion respects boundaries |
| **Onboarding** | `app/onboarding/**`, `app/api/resume/onboarding`, `app/lib/resume-onboarding*.ts` | Enrollment/resumption states, selection is raw-domain, publish creates exactly one CV |

Do not use retired HTML pages or legacy browser scripts as current application
test targets; use the [code map](CODE-MAP.md).
