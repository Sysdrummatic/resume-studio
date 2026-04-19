# Project Brief (OpenCVHub)

## What this repo is
`OpenCVHub` is a hybrid project:
- Legacy static resume app (multiple HTML entry pages + browser scripts + YAML content).
- In-progress Next.js SaaS rebuild (App Router).

## Key contracts
- Public locale content: `data/public/locales.yaml`, `data/public/resume-en.yaml`, `data/public/resume-pl.yaml`.
- Legacy UI behavior is driven by `scripts/` + `styles/` and should remain stable.
- Next.js app (`app/`) introduces auth + RBAC + admin workflows backed by Supabase.

## Where things live
- Static pages: repo root `*.html`
- Legacy JS: `scripts/`
- Legacy CSS: `styles/`
- Next.js: `app/`, config in `next.config.ts`, `tsconfig.json`
- Supabase SQL: `supabase/migrations/`
- Guides/checklists: `docs/`
- Tests: `tests/` (Node test runner via `node --test`)

## Common commands
- Dev (Next): `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Tests: `npm test`
- CI bundle: `npm run ci`

## High-risk areas (extra caution)
- Supabase RLS/policies and `security definer` functions
- Auth/session cookies and protected route gating
- YAML schema/key changes across locales