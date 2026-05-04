# React Frontend Transition Guardrails

This guide captures the migration guardrails that shaped the move from the legacy static frontend into the current Next.js App Router codebase.

## Current Status (May 2026)

- The repo is hybrid.
- The legacy experience still exists under `public/`.
- The Next.js app under `app/` already implements login, dashboard, admin, sample resume view, and the live editor.
- React is no longer just planned; it is the active framework for the migrated slices.
- The migration is incomplete because the public share route `/r/[slug]` and later panel/analytics work are still open.

## Alignment Note

This repo uses an incremental migration strategy with explicit parity gates and rollback paths.
If other documents suggest a full frontend restart or a separate React app, treat them as outdated and follow this guide plus the main work plan.

## Ongoing Goals

- Preserve existing behavior and data contracts while modernizing frontend architecture.
- Continue migrating route-by-route inside `app/`, not via a new parallel frontend.
- Keep auth, Supabase, YAML, and public-link behavior stable during migration.

## Guardrails

1. No implicit full rewrite: each PR must limit migration scope.
2. Compatibility first: maintain route behavior and existing critical flows.
3. Shared contracts: keep locale schema and Supabase payloads backward compatible.
4. Feature parity gate: retire static pages only after parity QA passes.

## Active Stack

- Next.js App Router
- React + TypeScript
- Route handlers under `app/api/`
- Node test runner for the current automated suite

## Remaining Migration Sequence

1. Keep migrating route-by-route inside `app/`.
2. Maintain parity with YAML contracts and Supabase flows.
3. Complete the public share route `/r/[slug]`.
4. Complete user panel and analytics surfaces.
5. Retire static pages only after parity and redirect verification pass.

## Definition of Done Per Migration Slice

- Functional parity with the touched static flow is demonstrated.
- `npm test` passes and relevant coverage is added for the changed scope.
- i18n parity (EN/PL) is verified when locale-aware flows are touched.
- Supabase auth/session/public-link behavior is unchanged unless explicitly intended.
- Rollback strategy exists through redirect fallback, feature gating, or revertable route changes.
