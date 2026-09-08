# Task checklists — OpenCiVera

Use only the sections relevant to the requested change.
[AGENTS.md](../AGENTS.md) defines working rules; the
[validation runbook](runbooks/testing-and-validation.md) defines required commands.

## General delivery

- [ ] Outcome and acceptance criteria are clear.
- [ ] Existing working-tree changes and development servers are preserved.
- [ ] Git naming follows the current [workflow](../docs/guides/development/git-workflow.md).
- [ ] Changed behavior has a regression test that failed before the implementation.
- [ ] Relevant validation passes; unavailable checks are identified honestly.
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

