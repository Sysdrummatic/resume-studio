# Codex checklists — quick entry point

Project rules: [AGENTS.md](../AGENTS.md).

For a task, use the applicable sections of the [task checklists](task-checklists.md).
Validation commands and exceptions are maintained only in the
[validation runbook](runbooks/testing-and-validation.md).

- YAML/content: owners, schema, EN/PL labels, fallback and selected public output.
- Auth/admin: actor verification, activity, role boundaries, RLS and audit.
- UI: existing design tokens/components, both themes, responsive and keyboard checks.
- Publication: snapshot-only reads, canonical link, unpublish/republish and retries.
- Delivery: relevant docs, verification evidence and explicit deployment status.

Do not use retired HTML pages or legacy browser scripts as current application
test targets; use the [code map](site-map-and-dependencies.md).
