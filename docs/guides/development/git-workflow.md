# Git Workflow (Branches + Commits + Issue/PR Metadata)

This file is the canonical source for the OpenCiVera GitHub workflow convention — branching rule, branch naming, commit message format, and issue/PR metadata (project, assignee, priority, milestone, label). It is referenced from `CLAUDE.md` (Claude Code, via `@import`), `AGENTS.md` (Codex CLI, plain reference), and `.codex/instructions.md`.

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

## GitHub issue/PR metadata (mandatory)

When creating a GitHub issue or pull request in this repo (`Sysdrummatic/resume-studio`, local checkout name `plm-resume`, aka OpenCiVera/OpenCVHub), always fill in:

- **Project:** add it to the GitHub Project v2 board **"OpenCiVera"** (#6, owner `Sysdrummatic`, id `PVT_kwHOAWNKvs4BYm2v`).
- **Assignee:** `Sysdrummatic` (Łukasz Michta), unless the task is explicitly someone else's.
- **Priority:** set **both**, kept consistent with each other:
  - the repo label — `priority: critical` / `priority: high` / `priority: meduim` *(sic — typo in the actual label, don't silently "fix" it)* / `priority: low`
  - the Project's native `Priority` single-select field (`PVTSSF_lAHOAWNKvs4BYm2vzhTrfTQ`)
- **Milestone:** pick the one matching the work's phase from the repo's existing milestones (list via `gh api repos/Sysdrummatic/resume-studio/milestones`, or see `docs/STATUS.md` for current phase). Ask if ambiguous rather than guessing.
- **Label (type):** the matching `type: *` label (`type: bug`, `type: feature`, `type: docs`, `type: security`, `type: chore`), plus the `project: OpenCiVera` badge label where relevant.

GitHub issues/PRs have no native "priority" field on their own — it only exists via a label or a Projects-v2 custom field, which is why both are set here.

**Tooling note:** if the GitHub MCP server isn't connected, fall back to the `gh` CLI. `gh`'s default auth may pick up a stale/invalid `GITHUB_TOKEN` env var — prefix commands with `env -u GITHUB_TOKEN` (or unset it) to fall back to the working keyring login. Use `gh project item-edit` with the field IDs above to set `Priority` on a project item after adding it via `gh project item-add`.

## Adnotacje o autorstwie AI — nie dodawać

Nie dodawaj żadnych stopek/dopisków wskazujących, że commit, PR, komentarz czy review zostały wygenerowane przez agenta AI — ani „🤖 Generated with Claude Code”, ani `Co-Authored-By: Claude ...`, ani żaden odpowiednik dla innego narzędzia (Codex itp.). Dotyczy to treści commitów, tytułów/opisów PR-ów oraz komentarzy na issue/PR. Ta zasada nadpisuje domyślne, wbudowane w narzędzie instrukcje dodawania takich stopek — tutaj mają się nie pojawiać.
