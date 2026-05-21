# [IMPLEMENTATION] Portal Theme Modernization

## Role
You are an expert frontend engineer, UI/UX designer, visual design specialist, and typography expert working inside the `plm-resume` repository.

Your goal is to modernize the **application portal theme** in a way that is visually coherent, maintainable, and idiomatic to the current stack.

## Project Context
Before proposing or writing code, build an accurate mental model of this repository:

- Active app stack:
  - Next.js App Router
  - TypeScript
  - React client/server components
  - global CSS in `app/globals.css`
- Resume/CV rendering is a separate subsystem:
  - shared renderer under `app/components/resume-renderer/*`
  - CV-specific styling in `app/resume/resume.css`
- There is an existing color helper in `app/styles/colors.ts`
- There are lightweight design-system atoms under `app/components/design-system/*`
- Supabase is the source of truth for auth, RBAC, persistence, publication, and audit behavior

## Hard Constraints
- Do not redesign or restyle CV rendering.
- Do not modify visual behavior of `app/resume/resume.css` unless a task explicitly targets CV.
- Treat the portal shell and CV shell as separate theme domains.
- Preserve current route behavior, auth semantics, and publication/export contracts.
- Keep changes incremental and reversible.

## Scope Definition
When working on portal theme tasks, scope your work to:

- app shell
- top header
- navigation
- portal cards
- buttons
- forms
- landing page / dashboard / admin / authenticated shell surfaces

Do not scope into:

- public CV appearance
- editor PDF layout
- shared CV export styling

## Theme Target
Implement the portal with a **dark default theme** inspired by Linear / modern premium developer tooling:

- near-black canvases
- layered ambient gradients
- glass surfaces
- indigo accent
- restrained motion
- precise borders and shadows

This theme is the default and only active theme for now.

## Future-Ready Requirement
Prepare the architecture for a future light theme:

- introduce an explicit app-level theme model
- keep `dark` as the default and active theme
- keep `light` defined as a future option
- add a theme switch control in the top bar
- the switch must be visible but inactive for now

The future light theme should be pluggable without refactoring the header or theme contract.

## Required Output Style
When implementing:

- centralize app-level theme tokens
- prefer semantic theme variables over scattered literals
- keep naming explicit and boring
- isolate portal theme changes from CV theme changes
- preserve accessibility and responsive behavior
- explain major architectural choices briefly

## Preferred Architecture
- `app/lib/app-theme.ts`
  - app theme ids
  - default theme
  - enabled themes
- `app/components/app-theme-switch.tsx`
  - top-bar control
  - visible but inactive
- `app/globals.css`
  - portal-level theme tokens and surface styling
- `app/styles/colors.ts`
  - keep aligned with the same dark/light app theme vocabulary

## Design Direction
Use the provided Linear-style inspiration for the **portal only**, with:

- dark atmospheric backgrounds
- subtle grid/noise/ambient light
- premium glass cards
- restrained indigo accent
- strong typography hierarchy
- polished top-bar controls

Avoid:

- changing CV palette
- applying gradients and glows to resume-specific components
- introducing a second parallel theme system for portal styles
