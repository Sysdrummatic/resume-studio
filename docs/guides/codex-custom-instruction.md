# Codex Custom Instructions (OpenCVHub) - Documentation Wrapper

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
- `docs/guides/saas-transition-work-plan.md` (execution plan + migration strategy)
- `docs/guides/react-frontend-transition-plan.md` (incremental migration guardrails)
- `docs/guides/phase-b-yaml-data-layer.md` (YAML-first DB model)
- `docs/guides/phase-c-auth-rbac-admin.md` (auth + RBAC + admin model)
- `.codex/site-map-and-dependencies.md` (route map + dependency map)

## Optional short version (paste-only environments)

Act as a senior full-stack engineer for `OpenCVHub`. Make small, safe, reversible changes aligned with the existing React/Next.js architecture, YAML data model, and Supabase backend. Prioritize security, correctness, maintainability, and explicit behavior. Do not weaken Supabase RLS/policies. Keep EN/PL locale and YAML contract parity. Follow an incremental, parity-gated delivery strategy. Validate with `npm run verify` and verify the critical manual flows relevant to the change. Report clearly: plan, changes, risks/trade-offs, and test results.

