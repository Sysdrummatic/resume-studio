# OpenCiVera — Product Definition

## Register
**dual** — two distinct design modes apply:
- `product` — portal shell, dashboard, CV editor, authenticated surfaces
- `brand` — landing page and public marketing surfaces

When in doubt: default to `product` register. Brand surfaces are additive.

## Users
- **Primary**: Professionals who want to keep their career information organized
  and prepare CVs for different applications without duplicating documents
- **Early adopters**: Tech-savvy professionals (software engineers, technical
  writers, data scientists) who value structure, portability and control
- **Secondary**: Hiring teams and recruiters reading published CV surfaces
- **Tertiary**: Language-conscious professionals in EN/PL markets

## Product Purpose
OpenCiVera is a **professional identity platform** that treats the CV as a 
structured, reusable data layer — not a static document. Users maintain one 
YAML-powered source record and publish role-aware, locale-specific public 
surfaces from it.

The current market entry point is a LiveCV builder based on an **Experience Base**
(`Baza doświadczeń` in Polish): a private, complete career record from which
users select content for tailored **LiveCVs**. LiveCV is the document users create
and explicitly publish under a shareable link; private drafts remain private.
Updating the Experience Base does not change a publication until it is republished.
The LiveCV builder is the first useful
surface of the broader professional identity platform, not its final boundary.

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
- Clear to non-technical users; explain the benefit before the implementation
- Technically credible without requiring technical knowledge
- Clarity over cleverness — direct statements over metaphors
- Opinionated but not dogmatic
- Use the canonical product terminology and information-architecture language
  defined in [Brand language and terminology](docs/guides/brand-language-and-terminology.md)

## Brand Principles
1. **Structure is beauty** — design reflects the data model, no gratuitous ornament
2. **Light control, maximum clarity** — users own the signal
3. **Platform mindset, not template** — system, not theme
4. **Bilingual integrity** — EN/PL are first-class, not afterthoughts

## Typography
Four roles, one job each ([ADR 0026](docs/adr/0026-livecv-ui-css-3d-native-motion-and-portal-typography.md),
epic #190 decision 7). Revised 2026-11-19; the rule previously read "No font
mixing. No decorative typefaces. Geist carries the full system."
- **Fraunces** — large headings only (display, page title, section title), light
  weights. Never in dense product UI, labels, buttons or tables.
- **Geist** — every piece of UI text: body, controls, labels, small headings.
- **Geist Mono** — values a machine could read: URLs, dates, counts, codes.
- **Space Grotesk** — the CV only; never a portal surface.
- All self-hosted from the repository: Geist and Geist Mono through the `geist` package's
  `next/font`, Fraunces through `next/font/local` (`app/layout.tsx`), Space Grotesk through
  an `@font-face` rule in `app/globals.css` (`public/fonts/`).

## Color System
Colour carries one meaning across every surface (epic #190 decision 7):
- **Indigo** — the private Experience Base (and focus).
- **Teal** — a published LiveCV and its link; "in step" states.
- **Amber** — unsaved changes.
- Red is reserved for destructive actions and errors.

Every colour token holds its light and its dark value; components never branch on
the theme. The portal follows the system theme until the user picks light or dark
with the top-bar switch (`data-app-theme`, stored in a cookie; ADR 0012 as amended
2026-11-21).
- **CV sheet (`paper`)**: white in both themes, always high-contrast and printable —
  never inherits the portal theme.
- The legacy `--portal-*` palette stays until each screen migrates (stages #289–#296).

## CV as Separate Design Domain
The CV renderer is a distinct subsystem. Portal theme must never leak into it.
- `app/resume/resume.css` — CV domain, off-limits to portal changes
- CV light = print-safe default
- CV dark = optional, additive, non-destructive

## Motion Philosophy
One motion language, two intensities (epic #190 decision 1, ADR 0026):
- **Expressive** — landing, login, onboarding: choreographed CSS 3D scene changes
  (500–700ms, staggered), floating CV sheets.
- **Restrained** — editor, dashboard, admin, docs: state changes only, 100–240ms.

Rules for both:
- Motion shows cause and effect; it never blocks work or delays information.
- Native CSS only (transitions, View Transitions, `@property`, `linear()`); no
  animation library. Only `transform` and `opacity` animate. The expressive CSS 3D
  scenes (landing, login) may drive them from one `requestAnimationFrame` loop that
  sleeps when settled (ADR 0026, amended for #290).
- Entering is slower than leaving (`--ease-out` in, shorter `--ease-in` out).
- Never: looping animations on idle content. Decorative scene loops (the landing's
  orbits, drift and dust, the traced outlines, the login sheets) are not content: they
  are `aria-hidden`, pause off screen, on a hidden tab and while a tile is pointed at,
  and stop under reduced motion (#290).
- Always: respect `prefers-reduced-motion` — a static frame and a crossfade.

## Anti-Patterns (Impeccable-compatible)
The following are grounds for rejection in PR review and `/impeccable detect`:

❌ `gradient-text` — no text filled with gradients
❌ `glow-for-glow's-sake` — glow only on interactive/live state elements  
❌ `glass-layering-without-purpose` — every glass surface needs a reason
❌ `ai-color-palette` — no purple-to-pink-to-teal default gradients
❌ `side-stripe-border` — no left-border accent on cards
❌ `shadow-depth-theater` — no shadows that exist only to look "deep"
❌ `nested-cards` — maximum one card level
❌ `icon-text-pair-every-line` — an icon repeated beside every line of body copy,
   or a large rounded-corner icon parked above every heading. Icons **are** allowed
   as section and row markers where the icon names what the row is about (the
   landing page's benefits strip, its three publishing steps, the privacy band).
   One marker per row, in a marker column or leading the label — never one per
   sentence. Revised 2026-09-20; the rule previously read "icons are for
   navigation, not decoration" and had removed the landing page's icons entirely.

## Success Metrics
- Landing page communicates the publishing model in <90 seconds
- Technical audience immediately reads structural ambition, not "resume builder"
- EN/PL localization is visible without explanation
- Portal feels like precision tooling, not a SaaS template
