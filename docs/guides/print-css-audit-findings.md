# Print CSS Audit — Public CV Route

**Date:** 2026-07-28
**Scope:** `@media print` behaviour of `/{personSlug}/{publicId}` (the public CV route)
**Method:** `scripts/dev/print-css-audit.mjs` — Playwright Chromium, `emulateMedia({ media: 'print' })`, real `page.pdf({ format: 'A4', printBackground: true })`
**Status:** Diagnostic only. **No CSS or component code was changed.** Fixes are a separate follow-up task.

> This audit covers the browser print path (`window.print()` / Ctrl+P), which is
> entirely separate from the `@react-pdf/renderer` export pipeline in
> `app/lib/pdf/` (ADR 0014). Nothing here affects `/api/resume/export/pdf`.

---

## 1. Which `@media print` block is authoritative

`app/resume/resume.css` contains **two** `@media print` blocks plus one top-level `@page` rule:

| Location | Lines | Role |
|---|---|---|
| Top-level `@page` | 1517–1519 | `margin: 16mm 12mm` — **overridden**, see below |
| Print block **A** | 1522–1668 | The substantive block: resets tokens, hides chrome, collapses layout, sets break rules |
| Print block **B** | 1670–1729 | Later, `!important`-heavy overlay block |

**Both blocks apply to the public route.** Neither is wholesale dead code. `ResumeRenderer.tsx:234`
puts `resume-view-page` on the root element unconditionally, so block B's
`.resume-view-page` rule (1692–1697) is live. `resume-editor-basic` is only added
for `mode === "editor" | "preview"` (`ResumeRenderer.tsx:239`), so the public
route (`mode="public"`, set at `app/[personSlug]/[publicId]/page.tsx:136`) does
**not** get it — but no print rule is scoped to that class, so nothing is lost.

Because block B comes later in source order and leans on `!important`, **block B
wins every conflict**. Block A is authoritative only where B is silent.

### Conflicts between the two blocks

| Selector | Block A | Block B | Winner |
|---|---|---|---|
| `@page` margin | `16mm 12mm` (L1518, top-level) | `1cm` (L1672) | **B** — `1cm` |
| `.section, .card` background/border | `background: transparent; box-shadow: none; padding: 0; border-radius: 0` (L1593–1601) | `border: 1px solid #eeeeee !important` (L1715–1720) | **B** adds a border back that A deliberately removed |
| `.hero` margin-bottom | `18px` (L1552) | `1.5cm !important` (L1711) | **B** — measured 56.69px |
| `.resume` sizing | `max-width: none; padding: 0; margin: 0` (L1543–1547) | `width/margin/padding !important` (L1699–1705) | **B** |

### Dead code confirmed by measurement

Two rules are provably inert on this route:

1. **`.timeline::before { background: #eeeeee !important }` (L1726–1728) is dead.**
   Block A already sets `.timeline::before { display: none }` (L1616–1618). Measured
   computed style: `display=none`. A background on a `display:none` pseudo-element
   paints nothing. The timeline axis line is *intentionally* hidden in print, so
   block B's attempt to recolour it never had an effect.

2. **`.contact-list { grid-template-columns: 1fr }` (L1633–1635) is dead.**
   `.contact-list` computes to `display: flex`, not `grid`. `grid-template-columns`
   is inert on a flex container. This is why Personal Info still renders as
   multi-column rows in print (visible on page 3 of both fixtures) instead of the
   single column block A intends.

3. **`.language-switcher` in block A's hide list (L1570) matches nothing.** The
   real class is `resume-language-switcher`, which block B hides at L1682. Harmless
   duplication, but it means block A's hide list is not self-sufficient.

---

## 2. Findings, ordered by severity

### P1 — Page 1 is almost entirely blank on every CV

**Observed:** In all three renders (2 fixtures × 3 locales), page 1 contains only
the hero (name + role) and roughly 90% whitespace. All real content starts on
page 2. A 3.5 KB CV that should fit on ~2 pages produces **4 pages**.

**Believed cause:** `app/resume/resume.css:1660–1667`

```css
.timeline-item,
.course-list li,
.item-list li,
.section,
.card {
  break-after: avoid-page;
  page-break-after: avoid;
}
```

`break-after: avoid` says "do not break *after* this element" — applied to every
section, card, and list item, it asks the fragmenter to keep the entire document
on one page. The constraint is unsatisfiable, and Chromium resolves it by pushing
the whole `.layout` block past the hero to the next page.

This is almost certainly a **typo for `break-inside: avoid`**. Measured computed
values confirm the properties are effectively swapped from intent:

| Element | `break-inside` | `break-after` |
|---|---|---|
| `.timeline-item` | `auto` ← *can split mid-entry* | `avoid` ← *glued to next entry* |
| `.section` | `avoid` | `avoid` |

`.timeline-item` — the employer/education entry that most needs to stay whole —
is the one element with **no** `break-inside` protection.

**Contributing factor:** `.resume-view-page` and `.resume` compute to
`min-height: 1024px` under print (viewport-derived, from the base rule at
`app/resume/resume.css:1`). Neither print block resets `min-height`, so the
document floor is a full viewport height regardless of content.

---

### P1 — Every printed page has a black border

**Observed:** All 12 rendered pages show a dark/black frame around the white
content area.

**Believed cause:** `color-scheme: dark` is still active on `:root` under print
(measured: `colorScheme: "dark"`). Chromium paints the page canvas — the area
outside the body box — using the UA dark background when `color-scheme: dark` is
set. Both print blocks reset `body { background: #ffffff }`
(L1531–1536, L1676–1679) but **neither resets `color-scheme` on `:root`**, and
`html` itself computes to `background: rgba(0,0,0,0)`.

`DESIGN.md:159` claims "`@media print` forces light variant regardless of active
colorway." That claim is **not currently true** — the colour tokens are forced
light, but the colour *scheme* is not.

---

### P2 — Decorative portal gradients bleed into the CV print output

**Observed:** Page 4 of every render shows large soft blue/purple radial blobs
across otherwise empty space.

**Believed cause:** `body::before` is `position: fixed; inset: 0` with
`radial-gradient(circle at 18% 12%, rgba(94,106,210,0.18), ...)` — the portal's
ambient background decoration from `app/globals.css`. Neither print block hides
it. Measured: `body::before display=block`, `position=fixed`.

This is a portal decoration painting over the CV domain, which contradicts the
separation asserted in ADR 0011/0012 and `DESIGN.md:152`.

---

### P2 — Section headers orphan at page boundaries

**Observed:** "Languages" sits alone at the bottom of page 3 with its content on
page 4 (case A). "Skills" does the same on page 3 of case B.

**Believed cause:** `.section-title` has no break protection at all — measured
`break-after: auto`, `break-inside: auto`. No rule in either print block targets
`.section-title` for pagination; the only `.section-title` print rule is
`margin-bottom: 10px` (`app/resume/resume.css:1607–1609`).

---

### P2 — Timeline entries can split mid-entry

**Observed:** Page 2→3 of case A splits the Education block: the `2008-08 – 2011-06`
period label sits at the bottom of page 2, its institution card on page 3.

**Believed cause:** `.timeline-item` computes `break-inside: auto`. Block A's
`break-inside: avoid` list (`app/resume/resume.css:1593–1601`) covers only
`.section` and `.card` — `.timeline-item` is absent from it, and appears instead
in the `break-after` list at L1660. Same root cause as P1.

---

### P3 — Card borders reintroduced against block A's intent

**Observed:** Section cards render with a visible 1px light-grey outline.

**Believed cause:** Block A deliberately flattens cards for print
(`background: transparent; box-shadow: none; border-radius: 0`, L1593–1601);
block B then adds `border: 1px solid #eeeeee !important` (L1715–1720). Whether
this is wanted is a design call — flagging it as an unresolved disagreement
between the two blocks, not as objectively wrong.

---

### P3 — `@page` margin is effectively 1cm, not the documented 16mm/12mm

**Observed:** Content sits close to the sheet edge; the top-level `@page` rule
at L1517–1519 never takes effect in print.

**Believed cause:** `@page { margin: 1cm }` inside block B (L1671–1674) overrides
it. 1cm is on the tight side for a CV — but this is a judgement call, and the
dead 16mm/12mm rule is the real defect.

---

## 3. What already works well

Verified by measurement, not assumption:

- **Chrome suppression is complete.** All of `.app-header`, `.hero__actions`,
  `.hero__export-group`, `.resume-language-switcher`, `.language-switcher`,
  `.resume-badges` measured `display: none` under print emulation. No nav, export
  buttons, language switcher, or badges appear on any page. The hide lists at
  L1561–1578 and L1681–1690 do their job.
- **Two-column layout collapses correctly.** `.layout` computes to `display: block`
  under print (L1580–1582). The residual `grid-template-columns` value is inert.
  The single-column result reads as intentional, not broken.
- **Space Grotesk renders properly** — computed
  `"Space Grotesk", Inter, system-ui, ...` on the hero heading, and the rendered
  glyphs match the web view. No fallback-font substitution. The script waits on
  `document.fonts.ready` before measuring, so this is a real result.
- **Accent colour survives.** The teal section dots, logo circle, and link colours
  render at full saturation, and the `.timeline-item__content` cards keep their
  light-grey fill. The `print-color-adjust: exact` list at L1647–1658 works.
- **Timeline axis suppression is deliberate and clean** — `.timeline::before`
  hidden, `.timeline-item__period::before` dot removed (L1629–1631), period text
  unindented (L1625–1627). Entries read as a clean two-column period/content grid.
  Timeline dots and axis lines are *absent by design*, not broken.
- **No console errors** during any render.
- **Locale parity** — `?lang=no` produced identical pagination and styling to
  `?lang=en`, so none of these issues are locale-specific.

---

## 4. Fixture limitations

The audit used the two published fixtures that carry snapshot content in the
**test** Supabase project (`aqmar…`):

| Case | personSlug | publicId | Locales | YAML size | Pages |
|---|---|---|---|---|---|
| A | `steevetantums` | `0c4341285a0149` | en, no | 3479 B | 4 |
| B | `arianaholt` | `432c7756f7674d` | en, es | 3119 B | 4 |

**Reported limitation, per the audit brief:** there is **no short single-page
fixture and no genuinely long fixture** in the project. Both fixtures are within
~10% of the same size, and no seeded CV exists at either extreme. No test data
was fabricated to fill the gap. Separately, **no published CV belongs to an
account with `is_test_user = true`** — the flag exists (ADR 0019/0020) but is
`false` on every profile that owns a public link, so there is no designated QA
fixture to audit against.

Consequently the "short CV fits on one page" case could not be tested directly.
Note that the P1 blank-page-1 defect means *no* CV can currently print on a
single page regardless of length, so a short fixture would likely surface the
same finding rather than a new one.

---

## 5. Re-running the audit

```bash
# 1. Start the dev server (uses .env.local — currently the test Supabase project)
npm run dev

# 2. Audit any published CV
node scripts/dev/print-css-audit.mjs <personSlug> <publicId> [options]
```

Options:

| Flag | Default | Purpose |
|---|---|---|
| `--base=<url>` | `http://localhost:3000` | Target a different origin |
| `--lang=<code>` | route default | Request a specific locale via `?lang=` |
| `--label=<name>` | `cv` | Filename prefix, for labelling cases |

Example:

```bash
node scripts/dev/print-css-audit.mjs steevetantums 0c4341285a0149 --lang=en --label=caseA
```

Outputs land in `tmp/print-audit/` (gitignored):

- `<label>-<slug>-<publicId>[-<lang>].pdf` — real paginated A4 render
- `<label>-…-fullpage.png` — non-paginated full-page reference screenshot
- `<label>-…​.json` — page count, heading font family, print-mode layout, per-selector
  chrome visibility, console errors

To review pages individually, rasterise the PDF (this audit used
**poppler `pdftoppm` 25.07.0**, installed locally via
`winget install oschwartz10612.Poppler`; it is not a project dependency):

```bash
cd tmp/print-audit
pdftoppm -png -r 90 caseA-steevetantums-0c4341285a0149-en.pdf caseA-page
```

`playwright` is a **devDependency only** and this script is never imported by
anything under `app/`, so it cannot reach a deployed function bundle.

---

## 6. Suggested fix order (not performed)

1. Replace `break-after: avoid-page` with `break-inside: avoid` at
   `app/resume/resume.css:1660–1667`, and add `.timeline-item` to the
   `break-inside` list — addresses P1 pagination and P2 mid-entry splits together.
2. Reset `color-scheme: light` on `:root` inside a print block — addresses the black frame.
3. Hide `body::before` in print — addresses the gradient bleed.
4. Add `break-after: avoid` to `.section-title` **only** — the correct use of that
   property: keep a header with the content that follows it.
5. Reset `min-height` on `.resume-view-page` / `.resume` in print.
6. Decide whether the two print blocks should be merged, and settle the card-border
   and `@page` margin disagreements deliberately rather than by source order.

Each should be re-verified by re-running the script and comparing page counts.
