# Personal Resume

This project renders an interactive résumé directly from YAML data. The page is pure HTML/CSS/JS and loads locale-specific content from `data/public`. A recruiter-facing public view is served by default with language selection in the header.

## Structure

- `index.html` – layout, markup, language switcher, and public view controls.
- `data/public/locales.yaml` – locale registry (code, label, and YAML path per language).
- `data/public/resume-*.yaml` – per-locale public data (EN/PL provided). Keep private data in `data/resume-private.yaml`.
- `scripts/main.js` – locale loading, DOM rendering, and UI behaviour.
- `styles/general.css` – layout, timeline and sidebar styling.
- `images/qrs` – QR assets referenced by the YAML data.

## How to run

1. Clone the repo and install Live Server (e.g. VS Code extension “Live Server” / “Five Server”).
2. In VS Code right-click `index.html` → “Open with Live Server”. Alternatively run a static server (`npx serve .` or `python3 -m http.server`).
3. Refresh the page after changing any YAML file – the app fetches locale files dynamically.

## Locale management

- Register new locales in `data/public/locales.yaml` by adding an entry with `code`, `label`, and `resume_path`.
- Provide a per-locale YAML file that follows the structure in `data/public/resume-en.yaml` / `data/public/resume-pl.yaml`. Each file must include localized UI labels under `labels` and the CV content for that locale.
- The app persists the last selected locale in `localStorage` and falls back to browser language (two-letter code) or the configured default.

## Manual QA checklist

- Toggle between Polish and English and verify that all headings, content blocks, and sidebar cards localize correctly.
- Validate YAML via an external linter when editing locale data.

Feel free to fork/extend for your own résumé.
