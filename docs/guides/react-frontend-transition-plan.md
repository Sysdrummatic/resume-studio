# React Frontend Transition Plan (Future Phase)

This guide defines how `OpenCVHub` should evolve from the current static HTML/CSS/JS frontend into a React-based frontend in a later product phase.

## Current Status (April 2026)

- The production app is still static-first (`*.html` + `scripts/*.js` + YAML-driven rendering).
- React is **planned**, not yet the default runtime for all user-facing pages.

## Alignment note

This repo uses an incremental migration strategy with explicit parity gates and rollback paths.
If other documents suggest a "full migration now" approach, treat them as outdated and follow this guide + the main work plan.

## Transition Goals

- Preserve existing behavior and data contracts while modernizing frontend architecture.
- Migrate incrementally (page-by-page or feature-by-feature), not via big-bang rewrite.
- Keep auth, Supabase, and public link behavior stable during migration.

## Guardrails

1. **No implicit full rewrite**: each PR must limit migration scope.
2. **Compatibility first**: maintain route behavior and existing critical flows.
3. **Shared contracts**: keep locale schema and Supabase payloads backward compatible.
4. **Feature parity gate**: retire static pages only after parity QA passes.

## Suggested React Stack

- Vite + React + TypeScript.
- React Router for protected/public routes.
- Feature-oriented folder structure (`features/`, `components/`, `services/`, `utils/`).
- React Testing Library + existing test workflow extended for component coverage.

## Proposed Migration Sequence

1. Bootstrap React app shell without replacing production routes.
2. Extract pure rendering logic/helpers from `scripts/` into reusable modules.
3. Build `ResumeView` React component with parity snapshots against current renderer.
4. Migrate auth screens and protected routing.
5. Migrate editor/dashboard flows.
6. Decommission static pages that reached parity and passed QA.

## Definition of Done per Migration Slice

- Functional parity with static flow is demonstrated.
- `npm test` passes and React-specific tests are added for changed scope.
- i18n parity (EN/PL) is verified.
- Supabase auth/session/public-link behavior is unchanged unless explicitly intended.
- Rollback strategy exists (feature flag or route fallback).

