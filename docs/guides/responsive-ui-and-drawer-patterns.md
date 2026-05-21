# Responsive UI and Drawer Patterns

This guide documents the current responsive contract introduced for the Next.js `Personal Hub` route and the shared viewport assumptions that now affect the global header.

Use it as the source of truth when implementing additional mobile-first layouts, off-canvas surfaces, or route-specific responsive shells.

---

## Scope

Current implementation coverage:

- `app/user/page.tsx`
- `app/user/user-client.tsx`
- `app/user/user.css`
- `app/components/app-header-navigation.tsx`
- `app/globals.css`

This guide does **not** formalize a cross-product ADR. It documents the implemented pattern and should be updated if the same pattern is adopted elsewhere.

---

## Breakpoint Contract

The current responsive contract aligns the `Personal Hub` layout and global header around a shared desktop threshold.

### Core breakpoints

- `<700px`
  - tight mobile layout
  - reduced spacing and tighter preview footprint
  - sidebar content remains mobile-first and drawer-driven after hydration

- `700px-979px`
  - large mobile / small tablet
  - single-column content flow
  - `Personal Hub` sidebar remains off-canvas on hydrated clients

- `>=980px`
  - desktop navigation threshold
  - header switches out of compact hamburger mode
  - `Personal Hub` returns to visible two-column layout

- `>=1100px`
  - wide desktop enhancement
  - stronger CV dominance
  - sticky sidebar behavior

### Important rule

Do not introduce new route-level mobile/desktop thresholds near `1024px` unless there is a deliberate product reason. The current shared threshold is `980px`.

---

## Personal Hub Layout

`/user` now uses a two-mode responsive shell:

### Desktop mode (`>=980px`)

- visible two-column layout
- left column: `personal-hub__sidebar-column`
- right column: `personal-hub__content`
- CV preview is the dominant surface

### Mobile mode (`<980px`)

- CV remains the primary visible surface
- `personal-hub__sidebar-column` becomes an off-canvas drawer after hydration
- only the semicircular drawer handle is visible by default
- profile and insights are accessed from the drawer

---

## Drawer Pattern

The current drawer pattern is implemented specifically for `Personal Hub`, but should be treated as the baseline for future off-canvas UI.

### Required behaviors

- visible trigger when drawer is collapsed
- overlay click closes drawer
- `Escape` closes drawer
- focus moves into the drawer on open
- focus returns to the trigger on close
- focus is trapped inside the drawer while open
- main content becomes inert while drawer is open
- drawer exposes dialog semantics

### Implemented semantics

- `role="dialog"`
- `aria-modal="true"` while open
- `aria-labelledby`
- `inert` on main content while drawer is open
- `aria-hidden` on main content while drawer is open

### Geometry rules

- drawer width is controlled by `--personal-hub-drawer-width`
- drawer handle open-state translation must derive from the same variable
- avoid hardcoded positional offsets that diverge from drawer width

---

## Hydration and Fallback

The route now distinguishes between pre-hydration and hydrated behavior.

### Current expectation

- before hydration, the route should not rely on mobile drawer interaction to expose critical content
- after hydration, mobile off-canvas behavior is enabled
- preview fallback should degrade cleanly when YAML runtime or parsing fails

### Preview fallback

`Personal Hub` includes an explicit `Preview unavailable` state when the client preview cannot be rendered.

Use this pattern instead of infinite loading states when client-only preview dependencies fail.

---

## Mobile UX Requirements

When extending this screen or reusing the pattern elsewhere:

- keep tap targets at roughly `44px` minimum
- support safe-area insets with `env(safe-area-inset-*)`
- avoid hover-only instructional copy on touch surfaces
- provide explicit close affordances inside drawers
- keep reduced-motion fallbacks for transitions and transforms

---

## Motion and Effects

The route currently uses:

- animated drawer transitions
- hover/press transforms for actions
- decorative blur/glow layers

### Requirement

Any future additions must respect:

- `prefers-reduced-motion: reduce`
- graceful degradation when backdrop blur is weak or unavailable

---

## Testing Contract

The route now has contract coverage for:

- shared `980px` breakpoint usage
- drawer accessibility semantics
- drawer geometry variable usage
- mobile fallback copy/state presence

Relevant tests:

- `tests/app-header-responsive.test.mjs`
- `tests/personal-hub-mobile-readiness.test.mjs`

When changing the responsive shell or drawer behavior, update those tests in the same change.

---

## Implementation Checklist

Before shipping a new responsive drawer-like surface:

- align breakpoints with existing viewport contracts
- keep critical content available without requiring hidden focus paths
- wire `Escape`, overlay close, focus trap, and focus return
- add safe-area padding
- validate short-height mobile landscape behavior
- add or update contract tests
- run `npm run typecheck`
- run `npm test`
- run `npm run lint`

---

## Current Residual Risks

These are known limits, not blockers for the current implementation:

- no formal shared breakpoint token system exists yet across all routes
- no generic reusable drawer hook/component has been extracted
- no dedicated JS-disabled route-level rendering path has been formalized beyond current fallback behavior

If these concerns start repeating across more routes, promote this guide into either:

- a shared UI pattern guide for all app surfaces, or
- an ADR for breakpoint and off-canvas standards
