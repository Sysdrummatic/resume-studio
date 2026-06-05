# OpenCiVera Design System

**Reference**: [docs/claude-design/README.md](docs/claude-design/README.md) — high-fidelity landing page spec with tokens, typography, and interactions.

## Color Palette (OKLCH)

### Core
- **`--bg`** / `#06060b` — Page background (near-black, blue-tinted)
- **`--bg-raised`** / `#0a0a12` — Inset nodes inside cards
- **`--bg-card`** / `#10101a` — Card / panel surfaces
- **`--bg-elevated`** / `#141420` — Elevated surface (reserved)

### Foreground
- **`--fg`** / `#e4e4ef` — Primary text
- **`--fg-muted`** / `#7878a0` — Secondary text, body copy
- **`--fg-dim`** / `#40405a` — Tertiary text, labels, mono captions

### Accent
- **`--accent`** / `#5b67d9` — Primary brand (indigo); buttons, heading accents
- **`--accent-soft`** / `rgba(91,103,217,0.14)` — Indigo chip / highlight backgrounds
- **`--accent-text-hl`** / `#8890e8` — Lighter indigo for highlighted values
- **`--teal`** / `#00b49c` — Secondary accent (status, "live", positive)
- **`--teal-soft`** / `rgba(0,180,156,0.12)` — Teal chip backgrounds

### Borders & Elevation
- **`--border`** / `rgba(255,255,255,0.07)` — Default hairline borders
- **`--border-hi`** / `rgba(255,255,255,0.12)` — Hover / emphasized borders
- **CV frame shadow**: `0 28px 72px rgba(0,0,0,0.55)`

### Ambient
- **Glow radial gradient**: `radial-gradient(ellipse 65% 45% at 50% -8%, rgba(91,103,217,0.16) 0%, transparent 65%)`
- Size: 500px tall, `pointer-events: none`, behind all content

## Typography

### Families
- **Display** (`Sora`): Weights 600, 700, 800
- **Body** (`DM Sans`): Weights 300, 400, 500
- **Mono** (`JetBrains Mono`): Weights 400, 500, 600

### Scale
| Role | Family | Size | Weight | Line-height |
|------|--------|------|--------|------------|
| Hero H1 | Sora | `clamp(2.1rem, 4.2vw, 3.4rem)` | 800 | 1.07 |
| Section H2 | Sora | `clamp(1.75rem, 3.2vw, 2.5rem)` | 800 | 1.1 |
| Card H3 | Sora | 1.05rem | 700 | — |
| Body lead | DM Sans | 1rem | 400 | 1.68 |
| Body copy | DM Sans | 0.875–0.975rem | 400 | 1.62–1.68 |
| Tags / labels | JetBrains Mono | 0.63–0.7rem | 600 | — |

**Letterspacing**:
- H1: `-0.03em`
- H2: `-0.025em`
- H3: `-0.01em`
- Tags: `0.08–0.1em` uppercase

## Spacing & Radius

- **Section vert padding**: 76px (desktop); 56px (≤600px)
- **Hero**: 80px top / 72px bottom
- **Content max-width**: 1160px with 24px side padding
- **Radius scale**:
  - `--r` / `10px` — buttons, small nodes
  - `--rl` / `16px` — cards
  - `--rxl` / `20px` — CV frame, CTA box
- **Grid gaps**:
  - `14px` — card grids
  - `60px` — two-column layouts (hero, operating model)

## Components

### Buttons
| Variant | Style |
|---------|-------|
| **Primary** | bg `--accent`, white text, border `rgba(91,103,217,.4)`; hover bg `#6874e0` + `translateY(-1px)` |
| **Outline** | transparent, `--fg` text, border `--border-hi`; hover bg `rgba(255,255,255,.05)` |
| **Ghost** | transparent, `--fg-muted` text, no border; hover text `--fg` |
| **Base** | padding `10px 20px` (`.btn-lg` → `13px 26px`), radius `--r`, DM Sans 500, 0.9rem, transition `all 170ms ease` |

### Cards
- Border: `1px solid --border` (upgrades to `--border-hi` on hover)
- Radius: `--rl` (16px)
- Padding: `26px 22px`
- Hover effect: `translateY(-2px)` + border lightens
- No shadows; borders only

### Header (Sticky)
- `backdrop-filter: blur(20px)`
- Background: `rgba(6,6,11,0.78)`
- Bottom border: `--border`
- Padding: `13px 0`
- Height: 56px (app global)

## Animations

### Pulse (Status Dot)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
}
animation: pulse 2s ease-in-out infinite;
```

### Transitions
- All interactive elements: `transition: all 170ms ease;`
- No cubic-bezier bounces; prefer `ease-out` or linear

## Sections (Landing Page Order)

1. **Header** — Sticky nav with logo, section links, lang toggle, CTAs
2. **Hero** — Two-column grid (intro + signal card), teal eyebrow, buttons, meta items
3. **Publishing Model** — Three-column card grid (1 record, multi-view, EN/PL)
4. **Operating Model** — Two-column (numbered steps left, foundation signals sticky box right)
5. **CV Preview** — Browser chrome frame with iframe embed + fallback overlay
6. **Flow** — Three cards (Capture, Configure, Release) separated by arrows
7. **Final CTA** — Centered box with gradient accent line
8. **Footer** — Logo, links, copyright

## Responsive Breakpoints

- **≤940px**: Hero/operating-model/flow grids → single column; nav hidden; signals box static; iframe 520px
- **≤600px**: Section padding 56px; hero buttons full-width stacked; hero meta wraps

## Assets

### Logo
- Inline SVG only (no external file)
- Hexagon outline in indigo `#5b67d9` + concentric circle + teal center dot
- Wordmark "OpenCiVera" in Sora 700, 0.975rem

### Icons
- Lucide style: arrow-right, lock, external-link, check, file
- Stroke width 2.5
- Use lucide-react or equivalent; swap for project icon library

### Fonts
- Google Fonts: Sora, DM Sans, JetBrains Mono
- Self-host for production if preferred

## Design Laws (Brand Register)

- **No nested cards** ever
- **No gradient text** (`background-clip: text`)
- **No glassmorphism** unless rare and purposeful
- **No side-stripe borders** (`border-left` accent); use full borders or background tints instead
- **Avoid**: Hero-metric template, identical card grids, modal-as-first-thought

## Current Implementation Status

✓ Landing page structure implemented in `app/page.tsx`
✓ Core styles in `app/globals.css` (with `--portal-home-*` tokens)
⚠️ Styles need alignment with design spec (review spacing, typography scale, color values)
⚠️ Missing: Header nav, language toggle interaction, CV iframe fallback, responsive mobile menu
