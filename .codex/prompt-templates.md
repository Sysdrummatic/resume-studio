# Task prompt template — OpenCiVera

Use this template when details are useful; a clear short request is enough for a
small change. [AGENTS.md](../AGENTS.md) supplies the standing project rules.

## Request

**Outcome:** What should users be able to do, and what currently happens?

**Scope:** Routes, affected modules and data owners. State exclusions only when
they matter for the task.

**References:** Relevant feature guide, ADR or existing UI to match. Use the
[code map](site-map-and-dependencies.md) and [guide index](../docs/guides/README.md)
to find current paths.

**Acceptance criteria:** Observable success, error/retry behavior, applicable
roles, languages and screen sizes.

**Delivery:** Local implementation, draft PR, or deployment to a named environment.
Use the current [Git workflow](../docs/guides/development/git-workflow.md).

**Validation:** Follow the [validation runbook](runbooks/testing-and-validation.md).
For behavior changes, write a failing regression test first. Report actual results
and any checks that remain unexecuted.

## Add details only when relevant

- **UI:** visual reference, theme, desktop/mobile behavior and keyboard interaction.
- **Publication:** snapshot/selection behavior, canonical link, locales and indexing.
- **Auth/admin:** permitted roles, ownership boundary and audit expectations.
- **Database:** new migration, existing-data impact, target environment and rollback.
- **YAML:** affected fields, EN/PL parity, import/export and fallback expectations.

Let Codex resolve routine implementation choices within the requested scope.
Do not require specific planning tools, skills or subagents unless available and
needed for the task.

