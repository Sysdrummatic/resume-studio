# Codex Custom Instructions (OpenCiVera) - Documentation Wrapper

This guide intentionally avoids duplicating the full instruction set used by Codex in this repository.

## Source of truth

Use `.codex/instructions.md` as the authoritative, up-to-date instruction set for Codex behavior.

## How to use this

If your tooling supports file-based instructions, point Codex at:
- `.codex/instructions.md`
- `.codex/site-map-and-dependencies.md`

If your tooling requires pasted text and cannot reference local files, paste the short version below and keep this wrapper as the reminder that `.codex/instructions.md` is canonical.

## Recommended docs to consult

- `README.md`
- `docs/README.md`
- `docs/phases/phase-b-yaml-data-layer.md` (YAML-first data model)
- `docs/phases/phase-c-auth-rbac-admin.md` (auth, RBAC, admin architecture)
- `docs/STATUS.md` (current phase status and progress)
- `.codex/site-map-and-dependencies.md` (route map + dependency map)

## Optional short version (paste-only environments)

Act as a senior full-stack engineer for `OpenCiVera`. Make small, safe, reversible changes aligned with the existing React/Next.js architecture, YAML data model, and Supabase backend. Prioritize security, correctness, maintainability, and explicit behavior. Do not weaken Supabase RLS/policies. Keep EN/PL locale and YAML contract parity. Follow an incremental, parity-gated delivery strategy. Validate with `npm run verify` and verify the critical manual flows relevant to the change. Report clearly: plan, changes, risks/trade-offs, and test results.

