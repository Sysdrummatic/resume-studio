# Git Workflow (Branches + Commits)

This file is the canonical source for the OpenCiVera git workflow convention — branching rule, branch naming, and commit message format. It is referenced from both `CLAUDE.md` (Claude Code, via `@import`) and `.codex/instructions.md` (Codex CLI, via plain reference).

---

## Branching rule (mandatory)

- Every new task starts on a fresh branch when the current branch is `master` or `main`.
- Branches should be short-lived and scoped to a single goal.

## Branch naming

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

## Commit messages

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
