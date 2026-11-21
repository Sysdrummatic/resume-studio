# DESIGN.md — OpenCiVera

> Canonical design specification for the OpenCiVera portal.
> Read by every `/impeccable` command before making design decisions.
> Maintained alongside `PRODUCT.md`. Last updated manually — update when tokens or decisions change.

---

## Identity

**Product**: OpenCiVera — Professional Identity Platform  
**Tagline**: One source. Many surfaces.  
**Aesthetic**: Expensive-tech. Precision tooling, not a SaaS template.  
**Anti-aesthetic**: AI slop. Gradient blobs. Glass for the sake of glass. Bootstrap shadows.
**Brand mark**: intentionally bridges both domain accents — portal indigo 
(#5e6ad2) and CV teal (#009c8a). This is a conscious identity decision, 
not a domain boundary violation.

---

## Design Registers

This product operates in two distinct design registers. Every `/impeccable` command must resolve which register
applies before generating output.

| Register  | Where it applies                                              |
| --------- | ------------------------------------------------------------- |
| `product` | Portal shell, dashboard, CV editor, authenticated surfaces    |
| `brand`   | Landing page, public marketing surfaces, open-graph imagery   |

**Default register: `product`.**  
When ambiguous, default to `product`. Brand surfaces are additive, not the baseline.

---

## Typography

### Stack

Revised 2026-11-19 by [ADR 0026](docs/adr/0026-livecv-ui-css-3d-native-motion-and-portal-typography.md)
(epic #190). The rule previously read "No font mixing. No decorative typefaces.
Geist carries the entire portal."

```
Display:   Fraunces (next/font/local, public/fonts/Fraunces-{Latin,LatinExt}.woff2, OFL;
           vars --font-fraunces + --font-fraunces-ext split by unicode-range; opsz + wght axes)
UI:        Geist (geist/font/sans via next/font, var: --font-geist-sans)
Mono:      Geist Mono (geist/font/mono via next/font, var: --font-geist-mono)
CV only:   Space Grotesk (local @font-face, see below)
```

| Role | Token | Classes | Use |
| ---- | ----- | ------- | --- |
| Large headings | `--ocv-font-display` | `.ocv-display`, `.ocv-title`, `.ocv-heading` | hero, page title, section title — weight `--ocv-display-weight` (300 light / 350 dark) |
| UI | `--ocv-font-ui` | `.ocv-subheading` (600), `.ocv-lead`, `.ocv-body`, `.ocv-meta`, `.ocv-label` | every other piece of text |
| Values | `--ocv-font-mono` | `.ocv-value` (tabular numerals) | URLs, dates, counts, codes — never as a "technical" costume |
| CV | `--ocv-font-doc` | `.ocv-paper*` | the CV sheet only |

Fraunces never appears in dense product UI (labels, buttons, tables, small
headings). All faces are self-hosted by next/font; Fraunces is vendored, so builds
never reach Google (offline `verify`/`ci`, `CLAUDE.md`); it is preloaded since #290
(the landing h1 renders it above the fold). Do not introduce any other family
without an ADR. Legacy screens still read `--font-body`/`--font-display` (Geist)
from `app/globals.css` until their redesign stage.

**CV-domain exception**: Space Grotesk is self-hosted via a local `@font-face`
in `app/globals.css` (source: `public/fonts/SpaceGrotesk-VariableFont_wght.ttf`)
exclusively because `app/resume/resume.css` references the family by name.
It is not available to portal surfaces.

### Scale (LiveCV tokens, `app/components/design-system/tokens.css`)

```
--ocv-text-display:    clamp(2.25rem, 1.2rem + 3.6vw, 4rem)      Fraunces, lh 1.02, −0.03em
--ocv-text-title:      clamp(2rem, 1.4rem + 2vw, 3.25rem)        Fraunces, lh 1.05, −0.03em
--ocv-text-heading:    clamp(1.375rem, 1.15rem + 0.7vw, 1.75rem) Fraunces, lh 1.15, −0.02em
--ocv-text-subheading: 1rem                                      Geist 600, lh 1.3
--ocv-text-lead:       clamp(0.9375rem, 0.85rem + 0.3vw, 1.0625rem) Geist, lh 1.55, 62ch
--ocv-text-body:       1rem                                      Geist, lh 1.6, 68ch
--ocv-text-meta:       0.8125rem                                 Geist, ink-3
```

Fluid sizes are for the expressive (landing/login/onboarding) and page-title roles;
dense product surfaces use the fixed roles.

### Scale (portal legacy — `product` register)

Tokenized in `:root` (`app/globals.css`): `--font-size-*`, `--leading-*`, `--tracking-*`.
The Typography atom consumes these tokens; no hardcoded sizes in components.

| Variant   | Size token / value           | Weight | Tracking                      | Line-height               | Usage                        |
| --------- | ---------------------------- | ------ | ----------------------------- | ------------------------- | ---------------------------- |
| `display` | `--font-size-display` 3.5rem | 700    | `--tracking-tight` −0.05em    | `--leading-tight` 1.1     | Hero/landing only            |
| `h1`      | `--font-size-2xl` 2.25rem    | 700    | `--tracking-tight` −0.05em    | `--leading-tight` 1.1     | Page-level display headings  |
| `h2`      | `--font-size-xl` 1.75rem     | 700    | `--tracking-snug` −0.03em     | `--leading-snug` 1.2      | Section headings             |
| `h3`      | `--font-size-lg` 1.375rem    | 600    | `--tracking-normal` −0.01em   | `--leading-normal` 1.3    | Card headings, sub-sections  |
| `body`    | `--font-size-base` 1rem      | 400    | `--tracking-normal` −0.01em   | `--leading-relaxed` 1.6   | Default prose                |
| `small`   | `--font-size-sm` 0.8125rem   | 400    | 0                             | `--leading-relaxed` 1.6   | Supporting text, meta        |
| `caption` | `--font-size-xs` 0.6875rem   | 400    | `--tracking-wide` +0.04em (UC)| —                         | Labels, timestamps, kickers  |

`--tracking-brand` (−0.06em) is reserved for the brand wordmark (`.app-brand__name`) and nothing else.
`--font-size-md` (1.125rem) is available for comfortable long-form body; `--leading-loose` (1.75) is reserved for CV-scale readability.

### Scale (CV — `resume` domain)

CV typography is a separate domain. Do not modify.  
Defined in `app/resume/resume.css`. Uses fluid clamp() scaling.  
Accent: `#009c8a`. Text: `#1b1b1b`. Background: `#ffffff`.

---

## Color System

### LiveCV tokens (ADR 0026) — the target palette

Defined once in `app/components/design-system/tokens.css`. Every token carries its
light and dark value through the `--ocv-L` / `--ocv-D` space toggles; components
never branch on the theme. `:root[data-app-theme]` wins: the server renders it from
the theme cookie, and without one `app/components/app-theme-script.tsx` sets it from
the system before the first paint (ADR 0012, amended 2026-11-21 in #289).

**Colour carries one meaning:** indigo = private Experience Base (and focus),
teal = published LiveCV, amber = unsaved changes, danger = destructive actions and
errors only.

| Token | Light | Dark | Role |
| ----- | ----- | ---- | ---- |
| `--ocv-bg` | `#e9ebf1` | `#070910` | canvas |
| `--ocv-raise` | `#ffffff` | `#141827` | panels, menus, modals, inputs |
| `--ocv-line` / `--ocv-line-strong` | `#d3d7e2` / `#b7bdcc` | `#222a3d` / `#38415a` | dividers / panel borders |
| `--ocv-control` | `#7b8396` | `#6f7892` | control borders (≥3:1) |
| `--ocv-ink` / `-2` / `-3` | `#0f121a` / `#434959` / `#5b6273` | `#f1f2f6` / `#aeb5c7` / `#8a93aa` | text, secondary, meta (all ≥4.5:1) |
| `--ocv-on-ink` | `#ffffff` | `#070910` | text on ink, teal-ink and danger fills |
| `--ocv-indigo` / `-ink` / `-wash` | `#4f5bd6` / `#3a44b2` / `#e3e6fb` | `#8f9aff` / `#aeb6ff` / `#1d2245` | Experience Base |
| `--ocv-teal` / `-ink` / `-wash` | `#008c7c` / `#006a5d` / `#d3f1ec` | `#1fd0b8` / `#62e2cf` / `#0c3a35` | LiveCV, "in step" |
| `--ocv-amber` / `-wash` | `#8a5300` / `#f8e7c8` | `#f2b866` / `#3c2c0e` | unsaved changes |
| `--ocv-danger` / `-wash` | `#b3261e` / `#fbe4e2` | `#ff9d94` / `#3d1614` | destructive, errors |
| `--ocv-focus` | `#3a44b2` | `#aeb6ff` | focus ring, 2px, offset 2px |
| `--ocv-slab` / `-edge`, `--ocv-grid` | `#bcc2ee` / `#4f5bd6`, `#a4abc2` | `#252b57` / `#8f9aff`, `#3a4468` | CSS 3D scene |

Contrast pairs (text 4.5:1, controls/focus 3:1, both themes) are asserted by
`tests/design-system-foundation.test.mjs`. Elevation is offset + soft blur, on
floating layers only: `--ocv-shadow-float` (menu, toast), `--ocv-shadow-modal`,
`--ocv-shadow-paper`.

The `--portal-*` palette below is **legacy**: it stays until stages #289–#296
migrate each screen, then it is removed (`TECH_DEBT.md`).

### Portal — Dark theme (legacy default)

```
Background deep:     #020203
Background base:     #050506
Background elevated: #0a0a0c
Surface:             rgba(255, 255, 255, 0.05)
Surface hover:       rgba(255, 255, 255, 0.08)

Foreground:          #ededef
Foreground muted:    #8a8f98
Foreground subtle:   rgba(255, 255, 255, 0.60)

Accent:              oklch(55% 0.18 264)   → approx #5e6ad2
Accent bright:       oklch(58% 0.19 264)   → approx #6872d9
Accent glow:         rgba(94, 106, 210, 0.30)

Border:              rgba(255, 255, 255, 0.06)
Border hover:        rgba(255, 255, 255, 0.10)
Border accent:       rgba(94, 106, 210, 0.30)
Grid line:           rgba(255, 255, 255, 0.02)
Focus ring:          rgba(94, 106, 210, 0.55)
```

**Semantic state tokens** (dark): `--portal-{success|warning|danger|info}-{bg|border|text}`,
plus `--portal-success-strong` for solid live-state indicators (status dots).
Success: green (64,200,140 family). Warning: amber (232,178,82). Danger: red (existing).
Info: the accent indigo. Light theme defines parallel values at matched roles.
State colors are reserved for state: toasts, badges, status text, live dots. Never decoration.
No hardcoded semantic hex in components or page CSS; consume the tokens.
**Page canvas** (since #289): a flat `--ocv-bg` with the dotted floor (`--ocv-grid`)
behind the top of every page (`.app-main::before`, `app/components/app-shell.css`). The
former ambient light (`--portal-body-ambient`) and 64px grid overlay painted on
`body::before/::after`, with its 10s float loop, are gone; the tokens stay until
`--portal-*` is removed in #296.

### Portal — Light theme

Material You-inspired. Seed color: `#6750A4`.

```
Background deep:     #f3eff8
Background base:     #faf8ff
Background elevated: #ffffff
Surface:             #f6f1fa
Surface hover:       #efe8f7

Foreground:          #1c1b1f
Foreground muted:    #625f69

Accent:              #6750a4
Accent bright:       #7b61c4
Accent glow:         rgba(103, 80, 164, 0.12)
```

Light theme is tonal, not white-and-empty. Every surface has perceptible tonal warmth.

### CV — Light (printable, default)

```
Accent:     #009c8a
Text:       #1b1b1b
Muted:      #6d6d6d
Background: #f6f8f8
Card:       #ffffff
Border:     #e3e6e8
```

**Print override**: forces `background: #ffffff`, `color: #000000`, and
`color-scheme: light`. Never inherits portal theme. Isolated in the single
`@media print` block in `app/resume/resume.css`.

### CV — Dark (optional colorway)

Same layout and typography as CV Light.  
Uses portal palette as surface colors.  
Gated by a class or data attribute on the resume container, not the portal theme switch.  
`@media print` forces light variant regardless of active colorway.  
Verified 2026-07-28: this now holds. It previously did not — the colour tokens
were forced light but `color-scheme` stayed dark, so Chromium framed every
printed sheet in black. Enforced by `color-scheme: light !important` on `:root`
in the print block; see [print CSS audit findings](docs/guides/print-css-audit-findings.md).  
Additive — does not modify existing CV light styles.

---

## Spacing

```
--space-2xs:   4px
--space-xs:    8px
--space-sm:    12px
--space-md:    16px
--space-lg:    24px
--space-xl:    32px
```

No ad-hoc spacing values. Use tokens exclusively.

---

## Layout

### Canvas widths (`:root`, `app/globals.css`)

```
--layout-canvas-max:      1600px   App header and product canvas
--layout-content-max:     1180px   Reading surfaces: docs, /privacy, /terms
--layout-dashboard-max:   1500px   Dashboard workspace
--layout-gutter:            16px   → 24px from 768px up
--app-header-height:        64px   (one height at every width since #289)
--workspace-breadcrumbs-height: 42px
```

Every page-level container is the same expression, never a bare `max-width`:

```css
width: min(var(--layout-<surface>-max), calc(100% - var(--layout-gutter) - var(--layout-gutter)));
margin-inline: auto;
```

**1600px is a canvas, not a measure.** It is the frame the header's brand mark
aligns to; text inside it sits on the grid below, capped by its own `ch` measure.
A paragraph that runs the full 1600px is a bug. If a surface is text-led and has
no header to align with, use `--layout-content-max` instead.

### Grid

12 columns, `column-gap: clamp(16px, 1.6vw, 26px)`, placed with explicit column
lines (`grid-column: 1 / 8`) on wide product surfaces.

**Landing (#290, replaces the 2026-10-02 master composition):** one pinned CSS 3D
stage under the shared header, full bleed. Captions sit bottom left (32px gutter from
768px, 16px below) behind a left veil; the scene shows toward the right; the stage
rail sits on the right (a single row at the top on phones). The landing's own footer
is frosted glass sliding over the end of the pinned story. See Motion → Landing story.

**App shell (#289, revised from "navigation sits to the left after the brand"):**
the brand sits alone on the left; everything else is right-aligned in the mockup's
order: page links (the current one marked `aria-current="page"` with a 2px teal
underline), the PL/EN segmented language switch, the theme switch, then the
account avatar or the sign-in/sign-up buttons. Below 980px the page links and guest
actions collapse into the menu button at the end of the row. A footer
(docs · privacy · terms) closes every page except `/`, which has its own frosted
footer (#290). Page frame classes: `.ocv-page` (1152px), `--wide` (1400px),
`--narrow` (860px), `.ocv-page-head`; screens adopt them in their own stages.
Route changes crossfade the content with a small rise while the header stays
(React `<ViewTransition>` keyed by path, `app/components/route-transition.tsx`).

- Never fill a wide row with `justify-self: end` — that pushes body copy to the
  far edge and leaves a 400px void mid-row. Place it on a column line instead.
- Trailing columns left empty are legitimate negative space on brand surfaces;
  they are not "unfinished".

### Text measures

```
Body / paragraphs:     54–65ch     (never wider)
Long-form prose:       64–72ch
Supporting / captions: 44–48ch
Display headings:      15–18ch     (product; landing captions are capped at 520–640px)
```

Caps go on the element in `ch`, not on the grid column — the column defines
position, the measure defines readability.

### Breakpoints — portal

One ladder, used across `globals.css`, `dashboard.css`, `docs.css`, `user.css`
and `landing.module.css`. Do not add values between these steps:

```
 640px   max   phone
 767/768px     phone ↔ tablet (gutter steps to 24px at 768)
 979/980px     compact ↔ desktop navigation
1279/1280px    wide desktop
1439/1440px    extra-wide
1599/1600px    canvas reaches its --layout-canvas-max cap
```

`980px` is also `DESKTOP_NAVIGATION_BREAKPOINT_QUERY`, exported from
`app/components/app-header-navigation.tsx`. In JS/TS **import it**; in CSS write
`(min-width: 980px)` literally — never redefine the number in a constant of your own.

The landing's compact layouts use `(max-width: 767px)` (stacked) and the height query
`(orientation: landscape) and (max-height: 560px)` (side). Side is not touch-only: a short
computer window gets it too, because the wide layout pushes the hero under the header
below ~560px of height. The CSS and the scene controller read the same two conditions, so
they never disagree. A short window with a fine pointer (`(max-height: 560px) and
(pointer: fine)`) also opens a full-screen modal `<dialog>` (`short-window-screen.tsx`) asking
for a taller window: the LiveCV window in miniature with its traced outline, a CV sheet
that does not fit and scrolls inside it, and a 560 px dimension line. It closes by itself
when the window grows; once dismissed (button or Esc) it stays closed until reload. A
phone in landscape never gets it, since it cannot grow.

### Breakpoints — CV domain

`app/resume/resume.css` runs its own ladder — **480 / 640 / 768 / 1024** — because
the CV is a fixed-width document (210mm in plain/print mode), not a fluid page. Do
not merge the two ladders, and do not import portal breakpoints into the CV
renderer. See [Design Domain Boundaries](#design-domain-boundaries).

Container queries (`@container`) are outside both ladders: they measure an element,
not the viewport, and answer to the component that owns them.

### Enforcement

`tests/layout-breakpoint-ladder.test.mjs` scans every `.css`/`.ts`/`.tsx` under
`app/` and fails on any `@media` width — or quoted `matchMedia` string — outside
these ladders. It also fails if a second module re-declares the 980px navigation
query. The prose here and the sets in that file are one decision: change both
together.

### Known off-ladder values

Legacy, predating this section (2026-09-20), listed as `GRANDFATHERED` in that test:
`520`, `560`, `600`, `680`, `699/700`, `720`, `760`, `900`, `940`, `960` — in
`onboarding.css`, `templates.module.css`, `user.css`,
`open-civera-animation.module.css`, `resume.css` and parts of `globals.css`.

That list is a **ratchet**: it may shrink, never grow. Deleting a value from the CSS
without deleting it from the test fails the stale-entry check, so the list cannot
outlive the code it excuses. Migrate opportunistically when you touch the file.

---

## Radii

```
--radius-sm:      8px    (tags, chips, small controls)
--radius-button:  12px   (all button variants)
--radius-bento:   16px   (bento grid cells)
--radius-card:    20px   (cards, panels)
--radius-full:    9999px (avatars, pills, toggles)
```

---

## Shadows

### Portal dark

```
--shadow-glass:
  0 0 0 1px rgba(255,255,255,0.06),
  0 18px 48px rgba(0,0,0,0.42),
  0 0 80px rgba(0,0,0,0.16)

--shadow-glass-hover:
  0 0 0 1px rgba(255,255,255,0.10),
  0 22px 58px rgba(0,0,0,0.50),
  0 0 92px rgba(94,106,210,0.10)

--shadow-bento: 0 14px 32px rgba(0,0,0,0.18)
```

### Portal light

```
--shadow-glass:
  0 0 0 1px rgba(122,117,127,0.08),
  0 14px 34px rgba(103,80,164,0.08),
  0 0 40px rgba(103,80,164,0.05)
```

**Rule**: every shadow must serve a purpose. No shadow-depth-theater.  
If a shadow's removal doesn't change the perceived hierarchy — remove it.

---

## Components

### Button

| Variant     | Background                    | Border                              | Radius           |
| ----------- | ----------------------------- | ----------------------------------- | ---------------- |
| `primary`   | `--portal-button-primary-bg`  | `--portal-button-primary-border`    | `--radius-button`|
| `secondary` | `--portal-card-bg-muted`      | `--portal-border`                   | `--radius-button`|
| `ghost`     | `--portal-control-bg`         | `--portal-control-border`           | `--radius-button`|
| `danger`    | `--portal-danger-bg`          | `--portal-danger-border`            | `--radius-button`|

Sizes: `sm` (6/12px padding), `md` (10/16px), `lg` (12/24px).  
Font weight: 600. Font family: inherited (Geist).  
Icon support: inline-flex, gap 6px.  
Disabled: opacity 0.6, cursor not-allowed.

### Typography atom

Variants: `h1`, `h2`, `h3`, `body`, `small`, `caption`.  
Theme prop: `app` (inherits portal vars), `dark`, `light`.  
No margin by default. Color via CSS vars, not hardcoded.

### UserAvatar

Sizes: `sm` (2rem), `md` (3rem), `lg` (4rem), `xl` (6rem).  
Shape: `border-radius: 9999px`.  
Colors: portal token vars only — no hardcoded hex.  
With image: `--portal-control-bg` fill. Without image: `--portal-button-primary-bg` fill.

---

## Motion

**Philosophy**: purposeful, never decorative.

### Motion language (ADR 0026, epic #190)

One language, two intensities: **expressive** (landing, login, onboarding —
choreographed CSS 3D scene changes, 500–700ms, staggered) and **restrained**
(editor, dashboard, admin, docs — state changes, 100–240ms). Native CSS only
(transitions, View Transitions, `@property`, `linear()` used sparingly); no
animation library. Only `transform`, `opacity` and colours animate. The landing and
login CSS 3D scenes run one sleeping `requestAnimationFrame` loop (ADR 0026, amended).

```
--motion-instant:    100ms   hover, focus, toggles
--motion-quick:      160ms   section switch, state pills, menus
--motion-base:       240ms   modals, expanding entries
--motion-slow:       420ms   onboarding steps, publish
--motion-base-exit:  160ms   leaving — always shorter than entering
--motion-slow-exit:  280ms
--motion-trace:      1600ms  the traced outline only (signature, drawn once)
--ease-out:          cubic-bezier(0.16, 1, 0.3, 1)   enter
--ease-in:           cubic-bezier(0.4, 0, 1, 1)      exit
```

Defined in `app/components/design-system/tokens.css`; under
`prefers-reduced-motion: reduce` the motion tokens become `0ms` and a global rule
collapses transitions and animations. Signature moments: the traced outline
(`.ocv-traced`, a registered `--ocv-trace` angle drawn once around something that
just appeared, teal for public, indigo for private) and the white `.ocv-paper`
sheet morphing between thumbnail, preview and public LiveCV via View Transitions.

### Legacy tokens (`:root`, `app/globals.css`)

```
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)   same curve as --ease-out
--motion-press:   90ms                            press / tap feedback (faster than settle)
--motion-settle:  220ms                           hover and settle transitions
```

### Established timings

```
Route change:      content out --motion-base-exit (--ease-in), in --motion-base (--ease-out) with an 8px rise; header still
Theme transition:  200ms cubic-bezier(0.22, 1, 0.36, 1), view transitions API
Micro:             ~160ms, hover / focus / state (legacy; migrating to the tokens above)
```

### Patterns

- **Button press**: `.button:active:not(:disabled)` cancels the hover lift and settles to
  `scale(0.98)` over `--motion-press` (90ms). Applies to every action button portal-wide.
- **Landing story (#290)**: one pinned stage, nine stages (start → LiveCV as a link →
  Experience Base → select → build LiveCV → versions → history → features → public card),
  a port of the "OpenCiVera LiveCV 3D" mockup's scene to DOM. `scene-model.ts` holds the
  mockup's timeline 1:1 (every box has keyed poses with lag and late fades; swirls, orbits,
  the opening vortex, drift and a spring for the air), its cameras (fit beside the text,
  lens shift, pointer parallax) and its distance haze. `landing-story.tsx` writes each
  box's `matrix3d` from it every frame: bricks are six-faced boxes lit per face, sheets
  print the public sample CV (three LiveCVs pick different entries, `scene-cv.ts`), the
  browser window's outline is traced like `.ocv-traced`, labels are projected to the
  screen and kept inside it on phones, the feature card grows out of its tile. Scroll picks
  the stage (`targetFor`: a stage holds until half a slot, with at most a 10% lean); the
  timeline follows over ~600ms and retargets mid-flight; a jump of more than a stage is a
  quick fade straight to it. Slots snap with `scroll-snap-type: y proximity`; the rail and
  the Scroll/Back pill move exactly one stage. Idle loops (orbits, drift, dust, traced
  outlines, the ring round "scroll") pause off screen, on a hidden tab and while a tile is
  pointed at; the frame loop sleeps once a stage has settled. On an upright phone the scene is drawn into the band above the active caption, eased between
  stages; a short window (phone or computer) uses the side layout with the rail as a row. Sheets sway instead of bending (TECH_DEBT.md). Reduced motion: no vortex, orbit, drift or sway; one still frame
  per stage and a 200ms crossfade, captions crossfade too.
  Without JavaScript (`@media (scripting: none)`) every caption is plain text and the
  scene is hidden. The scene is `aria-hidden`; captions are real headings, the feature
  tiles have a real button list (visually hidden on wide screens until focused, swipe
  cards on phones), and the FAQ is a native `<dialog>` drawer opened from any `/#faq`
  link. Hero rotating words pause while the start caption is off stage.
- **Login sheets (#290)**: the mockup's ten loose sheets (every fourth a real CV) circle
  slowly in a small scene of their own behind `/login`, dimmed and hazed, with the same
  spring; the loop sleeps on a hidden tab; reduced motion draws one still frame.
- **Retired (#290)**: the Experience Base explainer iframe, the features carousel and the
  scroll reveal were removed with the old landing. For history, the explainer was: the isolated iframe collects career tiles in
  one randomly ordered column, tracks downward, moves the tiles into a stationary queue,
  and fills the empty Experience Base one item at a time. The document pans downward
  through its sections, zooms out, then gives rise to three selected CVs. CV 2 finishes
  in the center; mobile framing zooms out enough to retain the neighboring CVs.
  Playback runs once, only while visible, and stops on the completed scene. Embedded
  player controls are hidden; clicking the scene or pressing Space/Enter while focused
  pauses/resumes it. Reduced motion shows all four documents in a static overview.
  The standalone preview retains its timeline for inspecting individual stages.
  The Experience Base is enclosed by a brand-indigo (`#5e6ad2`) outline and
  the three CVs share one brand-teal (`#009c8a`) outline. Labels in EN/PL interrupt
  the top borders, retain a fixed readable size during zoom, and stay visible
  while the base pans. A single arrow appears before the first CV and continues
  to connect the two groups; later CVs expand the shared outline without adding
  arrows. On mobile the compact base sits above the CV group with a downward
  arrow, preserving both group labels. Reduced motion uses the same grouping
  with all documents fully in view.

**Rules**:
- Ambient animation only on non-content layers (background pseudo-elements)
- Entrance animations must not delay information access. Below-the-fold content may be gated;
  in a hero, only a decorative artifact may animate, and never the copy or the CTAs
- No looping animations on content elements at idle state, except the hero rotating
  words above (paused when off stage); decorative idle loops (landing drift, login
  sheets) pause off screen and on hidden tabs
- `prefers-reduced-motion: reduce` must disable all non-essential motion. A global guard in
  `app/components/design-system/tokens.css` (moved there from `app/globals.css`) zeroes
  transition and animation durations; an element marked `[data-crossfade]` keeps a 200ms
  opacity transition only (epic #190 decision 2: static frame plus crossfade)
- New transitions use `--ease-out` to enter and the shorter `--ease-in` to leave (`--ease-out-expo` is the same curve, kept for legacy rules). No bounce, no elastic curves; `linear()` springs only in expressive scene changes, sparingly

---

## Surface Architecture (Portal)

Three elevation levels, dark theme:

```
Level 0 — Canvas:    --portal-bg-base       #050506
Level 1 — Elevated:  --portal-bg-elevated   #0a0a0c
Level 2 — Surface:   --portal-surface       rgba(255,255,255,0.05)
Level 3 — Glass:     --portal-glass-*       backdrop-filter: blur(18px)
```

Glass surfaces require:
- A content reason to exist (not just for the visual effect)
- `backdrop-filter: blur(18px)` minimum
- `border: 1px solid var(--portal-border)`
- A shadow from the shadow scale

---

## Design Domain Boundaries

This is a hard architectural rule. Impeccable must never cross these boundaries.

```
Portal domain:
  app/globals.css
  app/lib/app-theme.ts
  app/components/design-system/*   (tokens.css, primitives.css, primitives/, atoms/, molecules/)
  app/components/app-theme-switch.tsx
  app/components/app-header-navigation.tsx

CV domain (OUT OF SCOPE for portal changes):
  app/resume/resume.css
  app/components/resume-renderer/*
  app/lib/CvPdfTemplate.tsx
```

Portal theme changes must not produce visible side-effects in the CV domain.  
Every task that touches `app/resume/resume.css` requires an explicit scope declaration.
---

## Anti-Patterns

The following patterns are grounds for rejection in PR review  
and will be flagged by `/impeccable detect app/` (portal code lives in `app/`, not `src/`).

| Pattern                      | Why rejected                                          |
| ---------------------------- | ----------------------------------------------------- |
| `gradient-text`              | Illegible at small sizes, screams AI-generated        |
| `glow-for-glow's-sake`       | Glow only on interactive or live-state elements       |
| `glass-layering-without-purpose` | Every glass layer needs a functional reason       |
| `ai-color-palette`           | No purple→pink→teal default gradient combos           |
| `side-stripe-border`         | Left-border accent on cards is a template cliché      |
| `shadow-depth-theater`       | Shadows that exist only to look "deep"                |
| `nested-cards`               | Maximum one card nesting level                        |
| `icon-text-pair-every-line`  | An icon beside every line of body copy, or a large rounded-corner icon above every heading. See the note below — section and row markers are allowed |
| `hardcoded-hex-in-component` | All colors via CSS vars from the token system         |
| `inter-default-tracking`     | Faces are fixed by ADR 0026 — no Inter or other family without an ADR |

### Icons as markers

Revised 2026-09-20. The earlier wording ("icons are for navigation, not
decoration") was read literally and stripped every icon from the landing page.
The intent was narrower, so the rule now reads:

**Allowed** — one icon per section or row, where it names what the row is about:
a benefits strip, the three publishing steps, the privacy band's shield. It sits
in a marker column or leads the label, and it is the only glyph of its kind in
that row.

**Still rejected** — an icon repeated beside every line of body copy; a large
rounded-corner icon parked above every heading; icons chosen because a row looked
empty rather than because they carry the row's meaning.

Marker icons come from `lucide-react`, take `aria-hidden="true"` (the label
carries the meaning), and use `--story-teal` or `--story-accent`, never a third
colour introduced for the icon alone.

---

## File References

| File                                   | Role                                 |
| -------------------------------------- | ------------------------------------ |
| `app/globals.css`                      | Portal CSS vars, both themes         |
| `app/components/design-system/tokens.css` | LiveCV tokens: colour, type roles, motion (ADR 0026) |
| `app/components/design-system/primitives.css` + `primitives/` | LiveCV primitives (`.ocv-*`) |
| `docs/adr/0026-livecv-ui-css-3d-native-motion-and-portal-typography.md` | CSS 3D, native motion, Fraunces |
| `app/lib/app-theme.ts`                 | Theme IDs, default, enabled set      |
| `app/components/app-theme-switch.tsx`  | Top-bar theme toggle                 |
| `app/landing.module.css`               | Reference 12-column grid implementation |
| `app/components/app-header-navigation.tsx` | `DESKTOP_NAVIGATION_BREAKPOINT_QUERY` (980px) |
| `app/resume/resume.css`                | CV domain — do not touch from portal |
| `PRODUCT.md`                           | Product context, register, voice     |

Spacing, radii and shadow tokens live in `app/globals.css` `:root` and are
mirrored above. A `.agent/design-system/tokens.json` was listed here until
2026-09-20; no such file has ever existed in this repo.

---

*This file is the source of truth for every `/impeccable` command in this project.*  
*Update it when design decisions change — not after the fact.*
