# Personal Resume

This project renders an interactive résumé directly from YAML data. The page is pure HTML/CSS/JS and loads locale-specific content from `data/public`. A recruiter-facing public view is served by default with language selection in the header.

## Structure

- `index.html` – layout, markup, language switcher, and public view controls.
- `user.html` – editor login view and configuration panel.
- `data/public/locales.yaml` – locale registry (code, label, resume path, and config path per language).
- `data/public/config/*.yaml` – per-locale UI labels and language metadata.
- `data/public/resume-*.yaml` – per-locale public data (EN/PL provided). Keep private data in `data/private/resume-private.yaml`.
- `scripts/main.js` – locale loading, DOM rendering, and UI behaviour.
- `scripts/admin-config.js` – runtime loader for the admin password environment file.
- `styles/general.css` – layout, timeline and sidebar styling.
- `images/qrs` – QR assets referenced by the YAML data.

## How to run

1. Clone the repo and install Live Server (e.g. VS Code extension “Live Server” / “Five Server”).
2. In VS Code right-click `index.html` → “Open with Live Server”. Alternatively run a static server (`npx serve .` or `python3 -m http.server`).
3. Refresh the page after changing any YAML file – the app fetches locale files dynamically.

## Configuring the admin password

The editor reads its password from `data/private/user.env` at runtime. The file is ignored by git, so create it locally with a single line:

```
ADMIN_PASSWORD=your-strong-password
```

Reload the page after changing the file. If the password is missing or empty the admin login stays disabled.

### Windows quick setup

```powershell
New-Item -ItemType Directory -Force -Path data/private | Out-Null
Set-Content -Path data/private/user.env -Value 'ADMIN_PASSWORD=your-strong-password'
```

Start your static server (Live Server, `npx serve .`, etc.) and reload the editor view.

## Locale management

- Register new locales in `data/public/locales.yaml` by adding an entry with `code`, `label`, `resume_path`, and `config_path`.
- Provide a per-locale resume file that follows the structure in `data/public/resume-en.yaml` / `data/public/resume-pl.yaml`. Store UI labels and locale metadata in a matching file under `data/public/config`.
- The app persists the last selected locale in `localStorage` and falls back to browser language (two-letter code) or the configured default.

## Manual QA checklist

- Toggle between Polish and English and verify that all headings, content blocks, and sidebar cards localize correctly.
- Validate YAML via an external linter when editing locale data.
