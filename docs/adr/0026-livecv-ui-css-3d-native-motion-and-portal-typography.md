# ADR 0026: LiveCV UI — CSS 3D, Native CSS Motion, Fraunces In Portal Typography

Status: Accepted

Date: 2026-11-19

Deciders: Łukasz Michta (product owner)

Amends: [ADR 0012](0012-portal-theme-light-mode-material-you.md) (portal palette and
typography; the theme ids, cookie and server-side resolution are unchanged)

Related: [ADR 0014](0014-pdf-rendering-architecture.md) (CV weights 400/500/700),
epic [#190](https://github.com/Sysdrummatic/resume-studio/issues/190), stage
[#288](https://github.com/Sysdrummatic/resume-studio/issues/288)

## Context

The UI redesign (epic #190) is based on the "OpenCiVera LiveCV 3D" prototype. The
prototype draws its scene (CV sheets, Experience Base slabs, a browser window) with
WebGL and uses Fraunces for large headings next to Geist.

Constraints that shape the implementation:

- **Presentation only.** Editor locale buffers, language parity, save, publish and
  onboarding logic and every API contract stay untouched (epic decision 8).
- **No new npm dependencies** (`CLAUDE.md`, supply-chain rule).
- **Accessibility.** The scene is decoration; the captions carry the content.
  `prefers-reduced-motion` must give a usable static page.
- **Performance.** The landing must not regress Core Web Vitals against `master`.
- **Typography rule on disk.** `PRODUCT.md` ("No font mixing … Geist carries the
  full system"), `DESIGN.md` ("Do not introduce … any secondary sans-serif without
  an ADR") and the `app/globals.css` header ("Portal typography is Geist") forbid a
  second portal typeface. This ADR is the record that changes that rule.

## Decision

1. **CSS 3D instead of WebGL.** Scene objects are real DOM/React components
   positioned with `perspective` and `translate3d`. Only `transform` and `opacity`
   are animated. The scene is `aria-hidden`; captions are the readable content.
   Under `prefers-reduced-motion: reduce` each stage is a static frame and stages
   change by crossfade.
2. **One motion language, native CSS only.** CSS transitions and keyframes, the
   View Transitions API, `@property` and `linear()` easing. No Motion, GSAP or any
   other animation library. Two intensities share the same tokens: *expressive*
   (landing, login, onboarding) and *restrained* (editor, dashboard, admin, docs).
   Motion shows cause and effect and never blocks work.
   Tokens: `--motion-instant` 100ms, `--motion-quick` 160ms, `--motion-base` 240ms,
   `--motion-slow` 420ms, `--ease-out` `cubic-bezier(.16,1,.3,1)` for entering,
   `--ease-in` `cubic-bezier(.4,0,1,1)` for leaving. Exit is always shorter than enter.
3. **Portal typography has four roles.** Fraunces for large headings only
   (display, page title, section title) at light weights; Geist for all UI text;
   Geist Mono for machine-readable values (URLs, dates, counts, codes); Space
   Grotesk stays CV-only. Fraunces and Geist load through `next/font`. Fraunces is
   vendored in `public/fonts/` (the official Google Fonts WOFF2 subsets, Latin and
   Latin Extended for Polish, SIL OFL 1.1 in `Fraunces-OFL.txt`) and loaded with
   `next/font/local`, so `npm run verify`/`npm run ci` keep working offline as
   `CLAUDE.md` requires and no request goes to Google at build or run time. It is not
   preloaded until a screen renders it.
4. **Colour carries one meaning.** Indigo = private Experience Base, teal =
   published LiveCV, amber = unsaved changes. Every colour token holds its light
   and dark value; components never branch on the theme.
5. **CV weights.** Any CV sheet drawn by the portal (`.ocv-paper`) uses only 400/500/700,
   so the CV name is 700 (the prototype used 600, which Space Grotesk has no static
   instance for and the PDF cannot render — ADR 0014).

## Options Considered

### Option A: WebGL scene (as in the prototype)

| Dimension | Assessment |
|-----------|------------|
| Complexity | High — custom renderer, camera, label projection, context loss handling |
| Cost | A renderer dependency (three.js or similar) or a hand-written one |
| Performance | GPU-heavy on low-end phones; blocks main thread on setup |
| Accessibility | Canvas content is invisible to assistive technology; needs a parallel DOM |

**Pros:** richest visuals, free camera movement.
**Cons:** new dependency or large bespoke code, poor reduced-motion and no-JS story,
labels must be projected by hand, harder to theme.

### Option B: CSS 3D DOM scene (chosen)

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — layout in CSS, a small stage controller |
| Cost | No dependency |
| Performance | Compositor-only `transform`/`opacity`; nothing to initialise |
| Accessibility | Real DOM; theming and reduced motion come from tokens |

**Pros:** objects are the same components the app uses (the white `.ocv-paper` sheet
morphs between thumbnail, preview and public LiveCV via View Transitions), themable,
testable, works without JS as a static frame.
**Cons:** no free camera; depth is staged, not simulated.

### Option C: Animation library (Motion / GSAP) on top of B

**Pros:** springs and timelines out of the box.
**Cons:** new dependency, a second motion vocabulary next to CSS transitions.
`linear()` covers the springs we need and View Transitions cover morphs.

### Typography alternatives

- **Geist only (status quo).** Consistent, but the redesign's identity relies on an
  editorial display face for the few large headings.
- **Fraunces for all headings.** Rejected: small serif headings in dense product
  UI (editor, admin tables) read worse than Geist 600.
- **Fraunces for large headings only (chosen).**

## Trade-off Analysis

B loses free 3D camera work but keeps the scene in the same token, component and
accessibility system as the rest of the app, adds nothing to the dependency tree
and degrades to a still frame. A library (C) would speed up choreography slightly
at the cost of a second motion language and a supply-chain addition the project
rules forbid without strong need.

## Consequences

- Easier: one token set for colour, type and motion across landing and app; scene
  objects reuse app primitives; reduced motion is a CSS concern.
- Harder: complex choreography must be expressed in CSS and a small controller;
  View Transitions are not in every browser (fallback: instant change).
- A second portal palette exists while stages 2–9 migrate screens from the
  `--portal-*` tokens to the `--ocv-*` tokens (tracked in `TECH_DEBT.md`).
- Fraunces is a vendored binary (~126 KB for both subsets). Updating it means
  replacing the two WOFF2 files and their unicode-ranges in `app/layout.tsx`.
  (`next/font/google` was rejected in review: it makes `next build` fetch from
  Google, which breaks the offline `verify`/`ci` rule.)
- Fraunces has `preload: false` while no screen renders it; the first stage that
  puts a Fraunces heading above the fold turns preload on.
- Since stage #289 the portal follows the system theme until the user picks one in
  the top bar (ADR 0012 amendment of 2026-11-21, `tests/app-theme-contract.test.mjs`).

## Action Items

1. [x] Tokens, fonts, motion tokens and primitives — stage #288.
2. [x] Theme default "system with manual override" — decided in #289; ADR 0012 amended.
3. [ ] Migrate each screen to `--ocv-*` tokens — stages #289–#296; remove the
       `--portal-*` palette when the last consumer is gone.
