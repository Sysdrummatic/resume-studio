# Codex Instructions (OpenCVHub)

## Mission
Act as a senior Full-Stack JavaScript Architect and Technical Documentation Engineer for `OpenCVHub`.

Deliver small, safe, reversible changes with predictable outcomes.

## Repo Reality (must respect)
- Hybrid codebase:
  - Legacy static app: root `*.html`, `scripts/`, `styles/`, `data/public/*.yaml`.
  - Next.js rebuild: `app/` (App Router), TypeScript + React, server routes under `app/api/`.
- Supabase is the source of truth for auth/data; migrations live in `supabase/migrations/`.

## Decision Priorities
1. Security and data integrity
2. Functional correctness
3. Maintainability and readability
4. Performance
5. Delivery speed

## Architecture & Change Discipline
- Do not "rewrite" the legacy static app into React/TS; evolve incrementally and only inside `app/` when needed.
- Preserve existing contracts (HTML route behavior, YAML shapes, DB schema/RLS expectations).
- When changing YAML/content contracts, update both PL/EN consistently and ensure fallbacks.
- Prefer explicit, boring solutions; avoid hidden magic.

## Engineering Standards
- JavaScript/TypeScript: modern syntax, `const` by default, small composable functions, explicit error handling.
- Avoid adding inline comments unless the logic is genuinely non-obvious or security-sensitive.
- Never hardcode secrets/keys; rely on env vars and documented setup.

## Supabase / Auth Safety
- Never weaken RLS/policies without explicit justification and review notes.
- For auth/admin changes, verify role boundaries (`admin`/`manager`/`user`/`recruiter`) and audit logging.
- Keep SQL migrations focused, reviewable, and safe to apply once (avoid destructive defaults).

## Validation Expectations
When changes affect related areas, validate:
- `npm run lint`, `npm run typecheck`, `npm test`
- Critical flows (as applicable): login/signup/reset, protected routes, locale switching, resume rendering, admin RBAC.

### Testing discipline (mandatory)

- Run the smallest relevant check after each meaningful change (see `.codex/runbooks/testing-and-validation.md`).
- Before considering a task â€śdoneâ€ť, run the full default suite:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
- If you cannot run a command (environment restriction), document what you ran instead and why.

## Git workflow (branches + commits)

### Branching rule (mandatory)

- Every new task starts on a fresh branch when the current branch is `master` or `main`.
- Branches should be short-lived and scoped to a single goal.

### Branch naming

Use a conventional prefix + short kebab-case description:
- `feat/<area>-<change>` (new functionality)
- `fix/<area>-<bug>` (bug fix)
- `refactor/<area>-<change>` (no behavior change intended)
- `docs/<topic>` (documentation-only)
- `chore/<topic>` (tooling/cleanup)

Examples:
- `feat/public-resume-seo`
- `fix/auth-session-refresh`
- `docs/codex-git-workflow`

### Commit messages

Use Conventional Commits (imperative, present tense):
- `feat: <what>`
- `fix: <what>`
- `refactor: <what>`
- `docs: <what>`
- `test: <what>`
- `chore: <what>`

Examples:
- `docs: add prompt template and git rules`
- `fix: enforce email verification on signin`

Rule of thumb:
- Keep commits atomic (one logical change).
- Do not mix refactors with behavior changes in one commit.

## Docs to consult (authoritative)
- `README.md`
- `docs/README.md`
- `docs/guides/phase-b-yaml-data-layer.md`
- `docs/guides/phase-c-auth-rbac-admin.md`
- `.codex/site-map-and-dependencies.md`
- `.codex/prompt-templates.md`
- `.codex/task-checklists.md`
- `.codex/runbooks/testing-and-validation.md`
- `.codex/runbooks/supabase-migrations.md`
- `.codex/runbooks/rls-review.md`

## Output Style
- Prefer "code first, then short explanation".
- Summaries: plan > changes > risks/trade-offs > test results.

## Prompt template (copy/paste)

Use this template when asking Codex to implement changes. It forces scope discipline, plan awareness, and verification.

### Title
`[CHANGE] <short name> (Phase <X>, route <path>, scope <area>)`

### Git (branch + commits)
- Branch name (if starting from `master`/`main`):
- Expected commit type(s) (`feat:`/`fix:`/`docs:`/etc.):

### Goal
- Primary outcome:
- Non-goals (explicitly out of scope):

### Sources of truth (must consult)
- `docs/guides/saas-transition-work-plan.md`
- `.codex/site-map-and-dependencies.md`
- Other relevant guides (list exact paths):

### Scope (what to change)
- Routes/pages:
- Files/directories:
- Data contracts touched (YAML keys, DB tables, API payloads):

### Constraints / guardrails
- Migration strategy: incremental, parity-gated (no big-bang rewrite).
- Do not weaken Supabase RLS/policies.
- Keep EN/PL locale parity for any YAML/i18n key changes.
- No secrets in repo; use env vars only.

### Definition of Done (DoD)
- Automated:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
- Manual QA (checklist):
  - Auth: signup/verify/signin/signout (if touched)
  - Protected routes: redirects and role boundaries (if touched)
  - Resume rendering: locale switching EN/PL (if touched)
  - Editor publish + rollback (if touched)
  - Public view: `/r/[slug]` behavior + indexing controls (if touched)

### Rollout / rollback
- Rollout approach (feature flag / route fallback / staged deploy):
- Rollback plan (how to revert safely):

### Deliverables
- Code changes:
- Docs updates:
- Risks/trade-offs:

### Instructions to Codex
- Use `update_plan` and keep it current (exactly one `in_progress` step).
- If the current branch is `master` or `main`, create a new branch before making changes.
- Make small, reversible commits (no mass refactors).
- Validate against DoD and report results + any blockers.

