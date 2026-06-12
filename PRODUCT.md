# OpenCiVera — Product Definition

## Register
**dual** — two distinct design modes apply:
- `product` — portal shell, dashboard, CV editor, authenticated surfaces
- `brand` — landing page and public marketing surfaces

When in doubt: default to `product` register. Brand surfaces are additive.

## Users
- **Primary**: Tech-savvy professionals (software engineers, technical writers, 
  data scientists) who value structure and control over their public career narrative
- **Secondary**: Hiring teams and recruiters reading published CV surfaces
- **Tertiary**: Language-conscious professionals in EN/PL markets

## Product Purpose
OpenCiVera is a **professional identity platform** that treats the CV as a 
structured, reusable data layer — not a static document. Users maintain one 
YAML-powered source record and publish role-aware, locale-specific public 
surfaces from it.

Core value:
- One source, many surfaces
- Structure over editing — data-driven, not document-driven  
- Language-aware delivery — EN/PL as first-class locales
- Publication control — intentional release cycles, not ad-hoc file branching

## Aesthetic Target
**Expensive-tech.** Think Raycast, Arc, Framer — but with more restraint.
Premium without being loud. The interface should feel like precision tooling,
not a marketing site cosplaying as an app.

This is NOT:
- AI slop (gradient blobs, glow halos, cards-within-cards)
- Linear clone (we're allowed personality)
- Brutalist minimal (empty space is not a design decision)

## Tone & Voice
- Technical, not marketing-speak — talk like an engineer to engineers
- Clarity over cleverness — direct statements over metaphors
- Opinionated but not dogmatic
- Precise terminology: "master source", "publication", "surface", "locale"

## Brand Principles
1. **Structure is beauty** — design reflects the data model, no gratuitous ornament
2. **Light control, maximum clarity** — users own the signal
3. **Platform mindset, not template** — system, not theme
4. **Bilingual integrity** — EN/PL are first-class, not afterthoughts

## Typography
- **Display + Body**: Geist (geist/font/sans via next/font)
- **Fallback**: system-ui, -apple-system, sans-serif
- **Mono**: Geist Mono for any code/data surfaces
- **Scale**: editorial hierarchy — large display headings with tight tracking, 
  generous line-height for body

No font mixing. No decorative typefaces. Geist carries the full system.

## Color System
- **Portal dark (default)**: near-black canvas, indigo accent (oklch-grounded), 
  glass surfaces with intentional layering
- **Portal light**: Material You-inspired, seed #6750A4, tonal surfaces
- **CV light (printable)**: always high-contrast, white base — 
  never inherits portal dark theme
- **CV dark (optional variant)**: same layout, portal palette as colorway — 
  gated by class, never affects print output

## CV as Separate Design Domain
The CV renderer is a distinct subsystem. Portal theme must never leak into it.
- `app/resume/resume.css` — CV domain, off-limits to portal changes
- CV light = print-safe default
- CV dark = optional, additive, non-destructive

## Motion Philosophy
Purposeful, never decorative.
- Micro-interactions: hover states, focus transitions, state changes
- Ambient: directional, top-left light source only
- Never: looping animations on idle content, entrance animations 
  that delay information access
- Always: respect prefers-reduced-motion

## Anti-Patterns (Impeccable-compatible)
The following are grounds for rejection in PR review and `/impeccable detect`:

❌ `gradient-text` — no text filled with gradients
❌ `glow-for-glow's-sake` — glow only on interactive/live state elements  
❌ `glass-layering-without-purpose` — every glass surface needs a reason
❌ `ai-color-palette` — no purple-to-pink-to-teal default gradients
❌ `side-stripe-border` — no left-border accent on cards
❌ `shadow-depth-theater` — no shadows that exist only to look "deep"
❌ `nested-cards` — maximum one card level
❌ `icon-text-pair-every-line` — icons are for navigation, not decoration

## Success Metrics
- Landing page communicates the publishing model in <90 seconds
- Technical audience immediately reads structural ambition, not "resume builder"
- EN/PL localization is visible without explanation
- Portal feels like precision tooling, not a SaaS template