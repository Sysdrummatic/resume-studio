# OpenCiVera — project instructions for Codex

## Working agreement

- Respond in Polish unless the user asks otherwise. Keep identifiers consistent with existing code.
- Deliver the requested change through implementation and validation; make routine, reversible decisions independently.
- Prefer KISS, DRY and readable TypeScript: reuse existing components and domain functions before adding abstractions or dependencies.
- Prioritize data integrity and security, then correctness, maintainability, performance and delivery speed.
- Inspect the working tree before editing. Preserve existing changes and running development servers.
- Follow the current [Git workflow](docs/guides/development/git-workflow.md); do not duplicate its naming rules here or invent issue/PR numbers.
- Report what changed, what was checked, unresolved limitations and whether work is local, pushed or deployed. Code completion does not imply deployment.

## Start with the relevant context

- Read [README](README.md) for setup and [project brief](.codex/project-brief.md) for the domain.
- Use the [code map](.codex/site-map-and-dependencies.md) to locate the affected modules.
- Consult only the relevant [guides](docs/guides/README.md), [ADRs](docs/adr/README.md) and feature documentation.
- Treat [project status](docs/STATUS.md) as dated planning context, not proof that a change is deployed.
- Verify architecture claims against current code, tests and migration history. Report and correct stale documentation within the task scope; do not restore retired behavior just because an old document describes it.

## Current architecture and contracts

- The active application is Next.js App Router, React and TypeScript under `app/`; route handlers live under `app/api/`.
- `public/` contains static assets, YAML and vendor/runtime or migration helpers. The former static HTML application is retired.
- `netlify.toml` is the deployment configuration; it currently contains build/plugin settings, not legacy HTML redirects.
- Supabase owns authentication, RBAC, persistence, publication and audit records. Keep ownership checks in APIs and database policies/RPCs.
- `resume_documents` stores private editable Master CV YAML; `resume_revisions` stores its revision history.
- `resume_presets` and `resume_preset_variants` select saved CV content. `resume_published_cvs` and `resume_published_cv_locales` store immutable publication snapshots; `resume_public_links` controls their public identity and active state.
- Public CVs use `/{personSlug}/{publicId}` and the snapshot resolver. Never expose unselected Master CV data or substitute live document content for a publication snapshot.
- Preserve YAML/API contracts, document language behavior, EN/PL labels and existing fallbacks. Test ordinary editing, import and public export when their shared code changes.
- Normal onboarding writes the user's Master CV. Admin onboarding tests use separate drafts and must not change the real Master CV, profile or account languages.

## Auth, data and migrations

- Preserve `admin`, `manager`, `user` and `recruiter` boundaries, account activity and verification checks.
- Capability inheritance does not grant access to another user's private CV. Exact-role checks and capability checks are different; use the existing RBAC helpers appropriately.
- Never weaken RLS or expand privileged access implicitly. Preserve audit requirements for privileged operations.
- Add migrations for schema/RLS/RPC changes; do not rewrite migrations already applied to shared environments.
- Keep `security definer` functions narrowly scoped, with explicit actor/input checks and safe `search_path`.
- Keep secrets in existing environment/config mechanisms. Do not print credentials or commit tokens.
- Distinguish an authorized local implementation from applying migrations or deploying to a named environment; use the user's stated scope and deployment instructions.

## UI and design

- Use the existing editor as the current visual reference: [editor implementation](app/master-resume/editor-canvas-client.tsx) and [shared styles](app/globals.css).
- Reuse editor `--ed-*` tokens and the existing portal theme tokens in their respective surfaces. Do not introduce a parallel palette or replace the styling system incidentally.
- Reuse forms, validation, import review and rendering components. Keep product copy free of implementation details unless users need them to decide.
- Maintain keyboard access, visible focus, responsive layout and both supported themes. Verify layout changes in a real browser.

## TDD and definition of done

- For behavior changes and bug fixes, first write a meaningful failing regression test, then implement the smallest fix and refactor with the test passing.
- Test observable behavior, role/data boundaries and error/retry paths. Do not substitute source-text assertions for behavioral tests when the behavior can be exercised.
- For visual behavior, reproduce the failing browser check before changing the UI and recheck the result. Do not add artificial unit tests for copy-only or styling-only edits.
- Run the smallest relevant check during implementation. Before finishing code changes, run `npm.cmd run verify` (lint, typecheck, tests).
- For documentation-only changes, verify links and commands; run `npm.cmd test` when changing development/testing workflows. State any skipped checks and why.
- For UI changes, check desktop/mobile, EN/PL where relevant, keyboard focus and dark/light themes. For auth, publication or database changes, exercise the relevant role boundaries and save/publish/retry paths.
- Identify mocked/isolated validation explicitly; do not report it as a real Supabase staging or production check.
- Update affected guides, contracts and manual scenarios with behavior changes. See the [validation runbook](.codex/runbooks/testing-and-validation.md) and [task checklists](.codex/task-checklists.md).

## Instruction maintenance

- Keep this file as the canonical project instruction entry point. Detailed procedures belong in the linked documents.
- `.codex/instructions.md` is a compatibility pointer, not a second copy of these rules.
- `CLAUDE.md` and `.claude/` are maintained separately; do not edit them as part of Codex configuration maintenance unless the user explicitly includes them.
- Do not add mandatory skills, agents, approval steps or tools that the environment does not provide. Use delegation only when authorized and useful for independent work.
