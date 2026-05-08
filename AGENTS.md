# OpenCVHub Agent Instructions

Use `.codex/instructions.md` as the project source of truth. Also consult `.codex/site-map-and-dependencies.md`, `.codex/checklists.md`, `.codex/task-checklists.md`, and relevant docs under `docs/guides/`.

## Project Priorities

1. Security and data integrity.
2. Functional correctness.
3. Maintainability and readability.
4. Performance.
5. Delivery speed.

Keep changes small, safe, reversible, and aligned with the Next.js App Router, YAML-first resume model, and Supabase auth/data layer.

## Available Custom Agents

- `backend_engineer`: API routes, auth, RBAC, Supabase HTTP, resume server logic, SQL migrations, backend tests.
- `frontend_engineer`: React pages/components, client UX, CSS, resume/editor UI, accessibility, responsive behavior.
- `ui_ux_designer`: visual/UI/UX reviewer for style quality, layout, accessibility, responsive behavior, and design advice for `frontend_engineer`.
- `test_engineer`: `node:test`, lint/typecheck/test/build gates, CI, regression coverage, validation strategy.
- `software_architect`: cross-cutting design, boundaries, security/data-contract review, implementation decomposition.
- `project_manager`: scope, sequencing, DoD, rollout/rollback, documentation coordination, multi-agent planning.
- `agent_optimizer`: audits the current project state and improves `.codex/agents/**`, `AGENTS.md`, routing rules, and multi-agent prompt templates.

Codex only spawns subagents when explicitly asked. When the user asks to use subagents, spawn the relevant custom agents directly and give each a bounded task with clear file ownership.

## Routing Rules

- Use `backend_engineer` for `app/api/**`, `app/lib/auth-*`, `app/lib/rbac.ts`, `app/lib/supabase-http.ts`, `app/lib/resume-server.ts`, `supabase/**`, auth/session/RBAC/admin, service-role use, migrations, public sharing, publish/rollback, and API contract changes.
- Use `frontend_engineer` for `app/**/*.tsx`, `app/components/**`, `app/globals.css`, `app/resume/resume.css`, dashboard/login/editor/resume UI, language switching UI, responsive layout, and accessibility.
- Use `ui_ux_designer` before or alongside `frontend_engineer` when a task is about visual polish, layout quality, UX flow, accessibility, responsive behavior, design critique, or CSS consistency.
- Use `test_engineer` for `tests/**`, CI validation, brittle test reduction, regression tests, lint/typecheck/test failures, and deciding the smallest reliable verification command.
- Use `software_architect` before work that crosses frontend/backend/data boundaries, changes YAML contracts, alters auth/RBAC/RLS, modifies public link semantics, or splits large modules.
- Use `project_manager` when the task needs sequencing, ownership across multiple agents, release/rollback planning, or docs/checklist updates.
- Use `agent_optimizer` when the project structure, risks, workflows, or agent definitions may be stale and need to be audited or improved.

## Collaboration Rules

- Keep write scopes disjoint when running implementation agents in parallel.
- Do not let frontend agents edit backend/security files without an explicit contract task.
- Do not let backend agents edit UI/CSS except for narrow integration follow-ups.
- Use ui_ux_designer as an advisor for frontend_engineer; let frontend_engineer own React/CSS implementation unless the user explicitly asks ui_ux_designer to edit styles.
- Ask test_engineer to verify changes from both backend_engineer and frontend_engineer.
- Ask software_architect to review high-risk changes before implementation when auth, RLS, service-role writes, YAML contracts, or public resume publishing are involved.
- Ask agent_optimizer after major architectural, testing, or workflow changes to keep subagent definitions aligned with the real project.
- Close completed agent threads when their results have been integrated.

## Validation

Default local validation:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

Full CI-style validation:

```powershell
npm.cmd run ci
```

Report commands run, failures, and any manual QA that remains.

## Useful Prompts

Ask for parallel exploration:

```text
Uzyj subagentow. Niech backend_engineer sprawdzi ryzyka API/Supabase, frontend_engineer sprawdzi UI i klienta, test_engineer sprawdzi pokrycie testami. Poczekaj na wszystkich i podsumuj rekomendacje.
```

Ask for coordinated implementation:

```text
Uzyj subagentow do tej zmiany. Najpierw software_architect niech zaproponuje podzial pracy i ryzyka. Potem backend_engineer i frontend_engineer maja pracowac na rozlacznych plikach, a test_engineer ma dopisac/regresyjnie uruchomic testy. Na koncu scal wyniki i podaj walidacje.
```

Ask for UI/UX review before frontend work:

```text
Uzyj ui_ux_designer i frontend_engineer. Najpierw ui_ux_designer niech oceni obecny stan UI, wskaże problemy z hierarchia, responsywnoscia, dostepnoscia i stylem. Potem frontend_engineer ma wdrozyc tylko najwazniejsze, wasko opisane poprawki.
```

Ask for project planning:

```text
Uzyj project_manager i software_architect, zeby rozbic ten epik na male PR-y z DoD, ryzykami, rollbackiem i wlascicielami agentow.
```

Ask for agent-system improvement:

```text
Uzyj agent_optimizer. Przeanalizuj aktualny stan projektu, .codex/agents/** i AGENTS.md. Zaproponuj usprawnienia subagentow, a jesli sa bezpieczne, zaktualizuj ich instrukcje i podaj przyklady lepszych promptow.
```
