# ADR 0012: Portal Light Mode Material You Within App Theme Boundary

Status: Accepted

Date: 2026-05-19

Extends: [ADR 0011](0011-portal-theme-dark-default-light-deferred.md)

## Context

The portal already had an explicit app-level theme contract with `dark` as the default. The next step was to
introduce a real light mode without creating a second styling system and without leaking portal theming into the
separate CV subsystem.

The design direction for the light mode is inspired by Material You / Material Design 3, but it must be adapted to
the existing portal shell instead of triggering a full redesign. The repository also keeps a hard architectural
boundary between portal styling and CV styling:

- portal theme lives in `app/globals.css`, `app/lib/app-theme.ts`, and portal shell components
- CV theme lives in `app/resume/resume.css` and resume-rendering components

## Decision

- `dark` remains the default application theme.
- `light` becomes an enabled application theme within the same `app theme` system.
- Theme ids remain centralized in `app/lib/app-theme.ts`.
- Theme switching is active in the top bar and uses the existing moon/sun toggle control.
- Theme preference is persisted in the `opencvhub-theme` cookie so the server can render the initial theme safely.
- Material You principles are adapted for the portal light mode through semantic portal tokens rather than component-level hardcoded colors.
- CV styling remains explicitly out of scope. `app/resume/resume.css` is not repurposed for portal theming.

## Design Boundaries

Light mode applies to:

- app shell
- top header and navigation
- portal cards and panels
- portal buttons and form controls
- landing page surfaces

Light mode does not apply to:

- public CV styling
- resume editor document appearance
- PDF/print CV rendering
- resume-specific renderer components

## Consequences

- The application now supports a real day/night switch without duplicating the theme architecture.
- Portal styles remain maintainable because both themes flow through one semantic token layer.
- The server-rendered initial theme matches persisted user preference, reducing flash-of-wrong-theme risk.
- CV rendering contracts stay isolated from portal-shell experimentation.

## Implementation Notes

- `dark` stays the safe fallback when no valid theme cookie is present.
- The light palette is tonal and Material You-inspired, based on the seed color `#6750A4`.
- The implementation favors KISS and DRY over a literal one-to-one copy of every Material You visual flourish.

## Checklist

- [x] Keep `dark` as the default application theme.
- [x] Enable `light` inside the existing `app theme` model.
- [x] Activate the top-bar theme switch.
- [x] Persist theme preference in a cookie for SSR-safe rendering.
- [x] Keep portal and CV styling as separate theme boundaries.
- [x] Adapt Material You through semantic portal tokens instead of a second stylesheet system.
