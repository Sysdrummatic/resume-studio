# Checklists (OpenCiVera)

## Before changing YAML/contracts
- Confirm the consuming renderer(s): legacy (`scripts/`) vs Next (`app/`).
- Update both locales (PL/EN) for any new/changed keys.
- Add fallback behavior for missing keys.
- Run `npm test` (includes contract checks).

## Before changing auth/RBAC/admin
- Identify the boundary: client-only legacy vs Next.js server routes.
- Confirm Supabase migration requirements and RLS implications.
- Ensure role constraints match docs (admin/manager restrictions).
- Confirm privileged actions write to `admin_audit_logs`.

## Definition of done (practical)
- Lint/typecheck/tests pass: `npm run lint`, `npm run typecheck`, `npm test`.
- Critical flows verified for touched area (auth, protected routes, locale switch, resume render, admin UI).
- Docs updated if workflow/contract changes.