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

```
Primary:   Geist (geist/font/sans via next/font, var: --font-geist-sans)
Mono:      Geist Mono (geist/font/mono via next/font, var: --font-geist-mono)
Fallback:  system-ui, -apple-system, sans-serif
```

**Status: active.** Geist is wired in `app/layout.tsx` (variable classes on `<html>`)
and consumed through `--font-body`, `--font-mono`, and `--font-display` in `app/globals.css`.
Fonts are self-hosted by next/font; there is no Google Fonts import.

No font mixing. No decorative typefaces. Geist carries the entire portal.  
Do not introduce Roboto, Inter, or any secondary sans-serif without an ADR.

**CV-domain exception**: Space Grotesk is self-hosted via a local `@font-face`
in `app/globals.css` (source: `public/fonts/SpaceGrotesk-VariableFont_wght.ttf`)
exclusively because `app/resume/resume.css` references the family by name.
It is not available to portal surfaces.

### Scale (portal — `product` register)

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

### Portal — Dark theme (default)

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

**Ambient light**: directional, top-left only. Single light source.  
Defined in `--portal-body-ambient` via three radial-gradients at positions ~18%/12%, ~78%/16%, ~74%/68%.

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

**Print override**: forces `background: #ffffff`, `color: #000000`.  
Never inherits portal theme. Isolated in `app/resume/resume.css`.

### CV — Dark (optional colorway)

Same layout and typography as CV Light.  
Uses portal palette as surface colors.  
Gated by a class or data attribute on the resume container, not the portal theme switch.  
`@media print` forces light variant regardless of active colorway.  
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

### Tokens (`:root`, `app/globals.css`)

```
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)   decisive deceleration; the standard curve
--motion-press:   90ms                            press / tap feedback (faster than settle)
--motion-settle:  220ms                           hover and settle transitions
```

### Established timings

```
Ambient float:     10s ease-in-out infinite, background gradients only
Theme transition:  1500ms cubic-bezier(0.22, 1, 0.36, 1), view transitions API
Micro:             ~160ms, hover / focus / state (legacy; migrating to the tokens above)
```

### Patterns

- **Button press**: `.button:active:not(:disabled)` cancels the hover lift and settles to
  `scale(0.98)` over `--motion-press` (90ms). Applies to every action button portal-wide.
- **Scroll reveal (brand / landing only)**: below-the-fold sections fade and rise 16px on
  `--ease-out-expo` over 600ms as they enter the viewport, with an 80ms stagger across the
  publishing-model cards. Driven by `app/components/scroll-reveal.tsx` (IntersectionObserver).
  The hidden start state is gated behind the `.lp--reveal-ready` class the controller adds, so
  content stays visible without JS and for crawlers. The hero is never gated.

**Rules**:
- Ambient animation only on non-content layers (background pseudo-elements)
- Entrance animations must not delay information access: gate only below-the-fold content, never the hero
- No looping animations on content elements at idle state
- `prefers-reduced-motion: reduce` must disable all non-essential motion. A global guard in
  `app/globals.css` zeroes transition and animation durations; reveal targets are forced visible
- Light source for ambient gradients: top-left only, never circular bloom
- New transitions use `--ease-out-expo`. No bounce, no elastic curves

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
  app/styles/colors.ts
  app/components/design-system/*
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
| `icon-text-pair-every-line`  | Icons are for navigation, not decoration              |
| `hardcoded-hex-in-component` | All colors via CSS vars from the token system         |
| `inter-default-tracking`     | Geist only — no Inter fallback without explicit ADR   |

---

## File References

| File                                   | Role                                 |
| -------------------------------------- | ------------------------------------ |
| `app/globals.css`                      | Portal CSS vars, both themes         |
| `app/styles/colors.ts`                 | TypeScript color constants           |
| `app/lib/app-theme.ts`                 | Theme IDs, default, enabled set      |
| `app/components/app-theme-switch.tsx`  | Top-bar theme toggle                 |
| `.agent/design-system/tokens.json`     | Spacing, radii, shadow tokens        |
| `app/resume/resume.css`                | CV domain — do not touch from portal |
| `PRODUCT.md`                           | Product context, register, voice     |

---

*This file is the source of truth for every `/impeccable` command in this project.*  
*Update it when design decisions change — not after the fact.*