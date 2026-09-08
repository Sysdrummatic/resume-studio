# Git Workflow (Branches + Commits)

This file is the canonical source for the OpenCiVera git workflow convention — branching rule, branch naming, and commit message format. It is referenced from both `CLAUDE.md` (Claude Code, via `@import`) and `.codex/instructions.md` (Codex CLI, via plain reference).

---

## Branching rule (mandatory)

- Every new task starts on a fresh branch when the current branch is `master` or `main`.
- Branches should be short-lived and scoped to a single goal.

## Branch naming

Use: `ocv-<numer>-<krótki-opis-kebab-case>`

- `<numer>` — numer powiązanego PR/issue z GitHuba, zero-padded do 4 cyfr (np. `0150`). Ponieważ GitHub nadaje numer PR-a dopiero przy jego utworzeniu, w praktyce najpierw zakłada się issue (i używa jego numeru) albo tworzy się PR wcześnie (np. jako draft) i w razie potrzeby zmienia nazwę brancha.
- `<krótki-opis-kebab-case>` — zwięzły opis treści brancha, bez prefiksu typu zmiany (ten trafia do commitów/PR-ów, patrz niżej).

Examples:
- `ocv-0150-import-cv-z-pliku`
- `ocv-0151-auth-session-refresh`

Ten format zastąpił poprzednią konwencję `<prefix>/<area>-<change>` (feat/fix/refactor/docs/chore jako prefiks brancha) — historyczne branche i przykłady z nią mogą jeszcze występować w starszych PR-ach/dokumentach.

## Commit messages i tytuły PR-ów

Tytuły PR-ów używają Conventional Commits ze scope'em wskazującym numer z nazwy brancha:
- `feat(ocv-<numer>): <what>`
- `fix(ocv-<numer>): <what>`
- `refactor(ocv-<numer>): <what>`
- `docs(ocv-<numer>): <what>`
- `test(ocv-<numer>): <what>`
- `chore(ocv-<numer>): <what>`

Examples:
- `feat(ocv-0123): add prompt template and git rules`
- `fix(ocv-0155): enforce email verification on signin`

Pojedyncze commity wewnątrz brancha mogą używać krótszej formy bez scope'u (`feat: <what>`, `fix: <what>`, ...) — imperative, present tense.

Rule of thumb:
- Keep commits atomic (one logical change).
- Do not mix refactors with behavior changes in one commit.
