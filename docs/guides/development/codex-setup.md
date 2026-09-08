# Codex setup for OpenCiVera

The repository's canonical Codex instructions are in [AGENTS.md](../../../AGENTS.md).
This setup keeps project facts, working rules and tool configuration separate.
`CLAUDE.md` is maintained independently and is not changed by this setup.

## Where context lives

| File | Purpose |
| --- | --- |
| [AGENTS.md](../../../AGENTS.md) | Project rules, TDD, validation, communication and contract boundaries |
| [Project brief](../../../.codex/project-brief.md) | Short product/domain orientation |
| [Code map](../../../.codex/site-map-and-dependencies.md) | Routes, modules and dependencies |
| [Validation runbook](../../../.codex/runbooks/testing-and-validation.md) | Test commands and browser checks |
| [Git workflow](git-workflow.md) | Current branch, commit and PR conventions |
| [Guides](../README.md) and [ADRs](../../adr/README.md) | Feature behavior, policies and architectural decisions |
| [Project status](../../STATUS.md) | Dated roadmap and progress; verify deployment separately |
| [Project config](../../../.codex/config.toml) | Existing agent limits and Netlify MCP settings |

## Starting a session

1. Open this repository as the working project, rather than its parent directory.
2. Trust the repository in Codex if appropriate: project-local `.codex/` configuration
   layers are loaded only for trusted projects.
3. Start a fresh session after changing startup instructions. Ask:
   “Wymień wczytane instrukcje projektu i podsumuj wymagane testy”.
4. Expect the root `AGENTS.md`, its project agreements and relevant linked procedures
   to be recognized. Merely listing a documentation link does not automatically
   inject the entire linked document; the agent reads it when the task needs it.

Codex discovers global instructions in its home directory (normally `~/.codex`)
and project instructions from the project root toward the working directory.
Within a directory, `AGENTS.override.md` takes precedence over `AGENTS.md`, followed
by configured fallback names; at most one is selected per directory. See the
[official AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

No `CLAUDE.md` fallback is needed here because the root `AGENTS.md` exists.
Keep global `~/.codex/AGENTS.md` for optional personal preferences across repositories;
this project setup does not edit global configuration or instructions.

## Tool configuration

User defaults belong in `~/.codex/config.toml`; repository-specific settings belong
in `.codex/config.toml`. Session settings and higher-priority policy can affect the
effective configuration. See [official configuration guidance](https://learn.chatgpt.com/docs/config-file/config-basic).

The repository keeps its existing agent limits, agent models and Netlify MCP definition.
The existing role profiles under `.codex/agents/` refer to the root instructions,
work only within their assigned scope, and do not require a shared `state.yaml`.
The limits do not require spawning agents. MCP credentials are supplied through the
existing environment-variable mechanism, not checked into configuration.
No model, permission mode, global trust setting or production deployment target
is changed by this documentation setup.

## Task prompt

Use the [task template](../../../.codex/prompt-templates.md). Include the desired
behavior, affected route, acceptance criteria and whether the result should stay
local or be deployed. For UI, name the existing visual reference. For persistence,
state whose data may change. The agent should resolve routine implementation
choices within that scope.

## Keeping instructions accurate

- Keep the root rules short; link specialized procedures instead of copying them.
- Update the code map when routes or ownership boundaries change.
- Record architectural decisions in ADRs and user-facing behavior in feature guides.
- Use current code, tests and migration history to reconcile stale descriptions.
- Check relative Markdown links after moving documents.
- Do not use historical `.html` routes or retired scripts as current QA targets.
- Add nested `AGENTS.md` files only when a subdirectory needs genuinely distinct
  rules; retain the root file as the starting point.
