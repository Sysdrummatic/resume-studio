# Personal Resume

This project renders an interactive résumé directly from YAML data. The page is pure HTML/CSS/JS and reads from `data/resume.yaml`, so swapping content is simple.

## Structure

- `index.html` – layout, markup and JS entry point.
- `data/resume.yaml` – sample public data. Keep private data in `data/resume-private.yaml`.
- `scripts/main.js` – YAML loading via `js-yaml` and DOM rendering.
- `styles/general.css` – layout, timeline and sidebar styling.

## How to run

1. Clone the repo and install Live Server (e.g. VS Code extension “Live Server” / “Five Server”).
2. In VS Code right-click `index.html` → “Open with Live Server”. Alternatively run a static server (`npx serve .` or `python3 -m http.server`).
3. Refresh the page after changes to `data/resume.yaml` – the app fetches the file again.

Feel free to fork/extend for your own résumé.
