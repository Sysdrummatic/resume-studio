# Testing and validation — Codex workflow

Working rules: [AGENTS.md](../../AGENTS.md).
Use checks that can detect regressions in the requested behavior.

## TDD for behavior changes

1. Reproduce the missing/incorrect behavior with the smallest relevant test.
2. Run it before implementation and confirm the expected failure.
3. Implement the smallest change that makes the test pass.
4. Refactor while keeping the test passing; reuse existing code and fixtures.
5. Run the default suite before declaring code changes complete.

Prefer behavioral tests of outputs, interactions, roles, ownership and failures.
For visual changes, a reproducible failing browser check can establish the
regression; do not create artificial unit tests for copy or CSS declarations.
Keep reusable automated regression checks in the repository when practical.

## Default suite

On Windows PowerShell:

```powershell
npm.cmd run verify
```

This runs `npm.cmd run lint`, `npm.cmd run typecheck` and `npm.cmd test`.
On other platforms use `npm run verify`. The package scripts are the command
source of truth.

For a focused Node test:

```powershell
node --test tests/onboarding-progress.test.mjs
```

Run the smallest relevant check after a meaningful implementation change.
For frontend/Next changes, run lint and typecheck once the code is ready.
Broaden checks when changes, failures or unresolved concerns justify it; avoid
rerunning unchanged passing suites without a reason.

For build/deployment-sensitive changes, use `npm.cmd run build` or
`npm.cmd run ci` as appropriate to the task.

## Documentation-only changes

Check referenced files, Markdown links, example commands and consistency with
current code. Run `npm.cmd test` when changing development/testing workflows.
Lint/typecheck/build can be omitted when no application or executable configuration
changes; report the reason. Do not describe documented manual scenarios as executed.

## Browser and integration checks

- **UI:** desktop/mobile, dark/light, relevant EN/PL copy, keyboard/focus, dialogs,
  overflow and the shared shell after navigating away.
- **Auth:** signup/verify/signin/signout, refresh and protected redirects when affected.
- **Admin/RBAC:** anonymous, user, recruiter, manager and admin boundaries, activity,
  verification, cross-account isolation and audit behavior.
- **Resume:** locale switching, draft save/load, import, revisions/rollback, export.
- **Publication:** selected snapshot content, consent, retries, stable links,
  unpublish/republish and no private-data fallback.
- **Public SEO:** canonical identity, locale selection, indexing and missing/inactive links.
- **Onboarding:** [User and Admin scenarios](../../docs/guides/test-scenarios/ONBOARDING_TEST_SCENARIOS.md).
- **SQL:** validate the actual new migration and policies/RPCs in an isolated
  environment; identify any real Supabase staging checks still needed.

Preserve existing development servers. Reuse an appropriate server or create an
isolated test instance; do not stop the user's process merely to free a port/lock.
Use test data for publication checks.

## Reporting

State the commands and outcomes, browser checks actually performed, and remaining
failures or unavailable checks. Identify mocked services and isolated databases;
they do not establish that production or real Supabase integration was tested.
Distinguish local completion, migration application, push and deployment.


