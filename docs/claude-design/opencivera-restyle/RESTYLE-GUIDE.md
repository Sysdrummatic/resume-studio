# OpenCiVera — Landing Page Restyle Guide

Goal: replace the current ad-hoc CSS on your live landing page with styling driven entirely by the **OpenCiVera Design System tokens**, with full **day / night** support.

This package is keyed to the class names already used in `Landing Page.html`, so if your app is a port of that file, it's close to a drop-in. If your components use different class names, treat the CSS as a spec and map the tokens/recipes onto your own classes.

---

## Files
| File | What it is |
|---|---|
| `landing-theme.css` | The complete stylesheet. Defines the DS token layer (night + day) and styles every landing section from those tokens. |
| `RESTYLE-GUIDE.md` | This file. |

---

## 1. Load the fonts

Add to your `<head>` (or import in your CSS bundle). These are the three DS families:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

## 2. Include the stylesheet

Load `landing-theme.css` **after** your CSS reset / base. It owns `body`, header, buttons, cards, etc. for the landing route.

```html
<link rel="stylesheet" href="/styles/landing-theme.css">
```

(In a bundler: `import './landing-theme.css'` in the landing page entry, or copy the `@layer`-equivalent rules into your global stylesheet.)

## 3. Wire day / night

The theme switches on a `data-theme` attribute on the **root `<html>`** element — `night` (default) or `day`, matching `Design System.html`. Your app already has a toggle; point it at this attribute and persist the choice:

```js
function setTheme(mode) {                 // mode = 'night' | 'day'
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('ocv-theme', mode);
}
// on load — respect saved choice, else OS preference
const saved = localStorage.getItem('ocv-theme');
setTheme(saved || (matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night'));
```

> If you already store theme elsewhere (e.g. a React context), just make sure the resolved value lands as `data-theme` on `<html>`. Everything else is pure CSS.

---

## 4. Why this fixes the "ugly CSS"

The current page mixes hard-coded colors and spacing. This stylesheet routes **every** value through DS tokens, so the page inherits the system's intent:

- **Color** — `--accent #5E6AD2`, `--accent-bright #6872D9`, `--accent-teal #009c8a`, and DS surface/border/text tokens. Primary buttons use the DS gradient + inner-highlight shadow recipe (not a flat fill).
- **Spacing** — the 4→64px DS scale (`--space-2xs … --space-3xl`). No more arbitrary pixel paddings.
- **Radius** — DS `--radius-sm/md/lg/xl` (8/12/16/20).
- **Elevation** — DS `--shadow-glass` / `--shadow-glass-hover` / `--shadow-bento`. Cards lift on hover exactly like DS demo cards.
- **Type** — Space Grotesk (display/headings), Inter (body), JetBrains Mono (eyebrows, labels, meta).

## 5. Day &amp; night parity

The Design System now ships **both modes officially** — `night` (the Portal aesthetic, default) and `day`. `landing-theme.css` mirrors the DS token names and values exactly under `:root[data-theme="night"]` and `:root[data-theme="day"]`, so the landing page, the restyle CSS, and `Design System.html` all resolve from one identical token set.

## 6. Class-name reference

If you need to map your markup, these are the hooks the CSS targets:

| Section | Classes |
|---|---|
| Shell | `body`, `.wrap`, `header`, `nav a`, `.logo-name`, `.seg` / `.seg-btn` (segmented toggles), `.div` |
| Buttons | `.btn` + `.btn-p` (primary) / `.btn-o` (secondary) / `.btn-g` (ghost), `.btn-lg` |
| Hero | `.hero h1` (+ `em` for muted clause), `.hero-lbl`, `.hero-lead`, `.hm-dot` |
| Hero signal panel | `.signal-card`, `.sc-title`, `.sc-dot`, `.sc-node` (+`.hl`), `.sc-mi`, `.sc-divider` |
| Sections | `.sec-tag`, `.sec-h`, `.sec-p` |
| Cards | `.card`, `.card-tag`, `.chip` (+`.chip-t`/`.chip-a`), `h3`, `p` |
| Operating model | `.step` / `.step-n` / `.step-c`, `.signals-box`, `.sb-head`, `.sb-chk` |
| CV preview | `.cv-outer`, `.cv-chrome`, `.chrome-url` |
| Flow | `.flow-card`, `.flow-step` |
| Final CTA | `.cta-box` (+`::before` accent line), `.cta-lbl`, `.cta-p` |
| Footer | `footer`, `.ft-copy` |

> The toggle markup changed from the original `.ltoggle/.lbtn` to a generic `.seg/.seg-btn` so the **same** component styles both the EN/PL switch and the new day/night switch. Rename in your markup or add an alias if needed.

---

## 7. Quick checklist
- [ ] Fonts loaded (Space Grotesk / Inter / JetBrains Mono)
- [ ] `landing-theme.css` included after base styles
- [ ] `data-theme` set on `<html>` and persisted
- [ ] Day/night toggle points at `setTheme()`
- [ ] Class names match (or aliased)

The working reference — both modes, with a live toggle in the header — is in the project's `Landing Page.html`.
