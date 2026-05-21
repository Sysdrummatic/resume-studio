# ADR 0011: Portal Theme Dark Default, Light Mode Deferred

Status: Superseded

Date: 2026-05-18

Extends: [ADR 0010](0010-api-hardening-and-resource-protection.md)
Superseded by: [ADR 0012](0012-portal-theme-light-mode-material-you.md)

## Supersession Note

This ADR captured the initial decision to ship only the dark portal theme and keep the top-bar switch inactive.
That decision remained correct for the first rollout, but it is no longer the current product contract after the
light-mode implementation described in ADR 0012.

## Context

The application portal needed a more deliberate, premium dark visual system inspired by modern developer tooling. At the same time, the repository already contains a separate CV rendering subsystem with its own styling contract under `app/resume/resume.css`.

The project also needs a future-ready path for a light theme, but there is no approved light visual system yet. Shipping an incomplete or placeholder light mode now would create drift across the portal shell, increase maintenance cost, and blur the boundary between app-level theming and CV styling.

## Decision

- The portal theme system is introduced as an app-level concern only.
- `dark` is the default and only enabled application theme for now.
- `light` is modeled as a future option in the theme contract, but it is not implemented or user-selectable yet.
- A theme switch is visible in the top bar as a future-ready control, but it remains inactive until a real light theme is designed and approved.
- CV styles remain explicitly outside the scope of the portal theme rollout.
- `app/globals.css` is the primary home for portal-level tokens and shell styling.
- `app/resume/resume.css` remains the source of truth for CV presentation and must not be repurposed for portal theming.

## Scope Boundaries

Portal theme scope includes:

- app shell
- top header
- navigation
- cards and portal surfaces
- buttons, form controls, and shell-level interaction styling
- landing page and authenticated product surfaces

Portal theme scope excludes:

- public CV styling
- resume editor document appearance
- PDF layout styling
- CV export presentation

## Consequences

- The portal gains a coherent dark theme system without destabilizing CV rendering.
- Future light mode can be added on top of an explicit app theme contract instead of a second ad hoc styling path.
- Users see that theme switching is planned, but there is no misleading partial light mode.
- Theme work stays reversible and isolated from publication and resume rendering contracts.

## Deferred Work

- Define and approve a complete light theme token set.
- Enable the top-bar theme switch only after light mode reaches visual and accessibility parity.
- Add persistence and runtime switching behavior when multiple application themes are truly supported.

## Implementation Checklist

- [x] Introduce an explicit app theme model with `dark` default.
- [x] Keep `light` as a future contract value without enabling it.
- [x] Add a visible but inactive theme switch in the top bar.
- [x] Limit the modernization to portal/app-shell styling.
- [x] Preserve `app/resume/resume.css` as a separate CV styling boundary.
