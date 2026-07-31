# ADR 0015: PDF Rendering Migration — Puppeteer on Vercel

Status: Rejected

Date: 2026-06-10 (proposed) · 2026-07-31 (rejected)

## Context

This ADR proposed moving PDF export from `@react-pdf/renderer` to Puppeteer, and
hosting from Netlify to Vercel to fit a bundled Chromium.

The case rested on one claim: that react-pdf could not reproduce the LiveCV
layout, because it has no browser engine and therefore no `::before`/`::after`,
no CSS Grid, no `box-shadow`, and no `clamp()`. It also rested on a `PdfEngine`
interface in `app/lib/pdf/engine.ts` that was meant to make the swap cheap.

Both premises stopped holding.

The interface was removed at some point without this ADR being updated — there is
no `engine.ts`. And the fidelity gap turned out to be a set of ordinary defects,
not a limit of the renderer. A print-CSS and PDF audit closed them:

- The two surfaces were being scaled by two different factors — type by 0.625 and
  the column holding it by 0.508 — so every line broke about 20% early. The web
  shell width is now derived from `PX_TO_PT`, and both surfaces break identically.
- The timeline axis and dots, the section dots and the hero initials render
  correctly. Those were leading, border-stroking and flex-shrink defects, each
  reproduced and measured against a real render.
- `clamp()` came out of the CV type scale on its own merits: it resized text
  inside a container that is capped, so one column rendered different sizes at
  different viewports and no PDF value could match it.

What remains different is the soft `box-shadow` on cards, which react-pdf cannot
express and which reads acceptably as white on a tinted page.

## Decision

Rejected. `@react-pdf/renderer` stays the PDF engine, Netlify stays the host.

Fidelity is held by contract rather than by a rewrite: `app/lib/pdf/theme.ts`
derives every value from `app/resume/resume.css`, and
`tests/pdf-web-style-parity.test.mjs` plus `tests/pdf-render-geometry.test.mjs`
fail when the two drift. See [ADR 0014](0014-pdf-rendering-architecture.md) for
the architecture as built.

## Consequences

- Vercel is not a processor. No DPA, SCC/TIA or privacy disclosure is owed for it,
  and the processor checklist no longer carries a pending row.
- Netlify remains the single deployment target, `netlify.toml` the single
  deployment config.
- A future engine swap has no interface to slot into. That is the right cost: the
  abstraction existed for a migration that is not happening, and it is the parity
  tests, not an interface, that protect the output.
- `playwright` stays a devDependency. It drives `scripts/dev/print-css-audit.mjs`
  and is never imported by application code.

## Revisiting

Reopen this only for a fidelity defect that the parity tests cannot express and
that no react-pdf primitive can reach — not for a general preference for browser
rendering. The price is a new host, a new processor assessment, and a Chromium
cold start on every export.
