# OpenCVHub Agent Instructions

Use `.codex/instructions.md` as the project source of truth. Also consult `.codex/site-map-and-dependencies.md`, `.codex/checklists.md`, `.codex/task-checklists.md`, and relevant docs under `docs/guides/`.

## Project Priorities

1. Security and data integrity.
2. Functional correctness.
3. Maintainability and readability.
4. Performance.
5. Delivery speed.

Keep changes small, safe, reversible, and aligned with the Next.js App Router, YAML-first resume model, and Supabase auth/data layer.

## Economic Model Hierarchy

Agents are tiered based on their reasoning complexity and economic efficiency:

- **Tier 1: Planning & Architecture** (`reasoning_effort: high`) - **GPT-5.5**. Used for high-level strategy, complex migrations, and project orchestration.
- **Tier 2: Real Implementation** (`reasoning_effort: medium`) - **GPT-5.4**. Used for feature development, UI/UX implementation, and logic building.
- **Tier 3: Operational Tasking** (`reasoning_effort: low`) - **GPT-5 Codex**. Used for running tests, validation, linting, and repetitive operational work.

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

## Communication (SMI Manifest)

Agents use a strict **YAML Manifest** for peer-to-peer requests to minimize tokens. 
**No social niceties (hi, thanks, etc.) allowed in REQ/CMD flows.**

### SMI Format (Thin Pipe)
```yaml
REQ: <AgentName>
CMD: <Action>
CTX: 
  ref: <KeyInStateYaml or FilePath>
  scope: [file1.ts, file2.tsx]
LMT: [Constraint1, Constraint2]
```

### Shared Context Pool (Fat Data)
- **Primary State**: `.codex/state.yaml` (Machine-readable task progress, metadata, and findings).
- **Secondary State**: `docs/action-plan.md` (Human-readable logic).
- Agents MUST update `state.yaml` before passing the "trigger" to the next agent.

## Implementation Flow
1. **Antigravity** (Interface Agent) translates User Request -> SMI Manifest.
2. **Subagents** execute, update `state.yaml`, and return YAML Status.
3. **Antigravity** synthesizes technical logs into a concise human report.

## Useful Prompts (SMI YAML)

Parallel Exploration:
```text
Uzyj subagentow. 
REQ: [backend_engineer, frontend_engineer]
CMD: audit_v2
CTX: { ref: instructions.md }
```

Coordinated Implementation:
```text
Uzyj subagentow. 
- REQ: software_architect | CMD: propose_manifest | OUT: state.yaml#plan
- REQ: backend_engineer | CMD: impl_api | CTX: { ref: state.yaml#plan }
- REQ: test_engineer | CMD: verify | CTX: { ref: state.yaml#plan }
```
