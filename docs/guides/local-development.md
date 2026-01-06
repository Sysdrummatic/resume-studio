# Local Development Setup

This guide explains how to run and iterate on the résumé locally.

**Security Note:** The editor view (`user.html`) is designed for local development only and uses client-side password authentication. It is excluded from GitHub Pages deployment to prevent public access, as client-side authentication cannot provide true security on a static site.

## Prerequisites

- Node.js 22 or newer (for running tests and tooling).
- A static HTTP server (Live Server extension, `npx serve`, or `python -m http.server`).
- Git with access to this repository.

## First-Time Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd plm-resume
   npm install
   ```

2. Create the private configuration directory if it does not exist:

   ```bash
   mkdir -p data/private
   ```

3. Add the admin password file:

   ```bash
   echo "ADMIN_PASSWORD=change-me" > data/private/user.env
   ```

4. Start a static server from the repository root and open `index.html` in your browser.

## Iterating on Content

- Update locale YAML files in `data/public`. The app fetches them dynamically; refresh the page to reload data.
- Keep private resume details in `data/private/resume-private.yaml`. The file is ignored by git.
- When editing YAML, validate structure using a YAML linter (`npm run lint:yaml` if available or an editor plugin).
- If you change `data/public/seo-config.yaml`, run `npm run build:metadata` to sync the canonical link, sitemap, and robots file.

## Running Automated Tests

- Execute `npm test` to run jsdom-based regression checks for the admin login workflow.
- Use `npm test -- --watch` while iterating on UI behaviour to re-run affected suites automatically.

## Troubleshooting

- If the admin login is disabled, ensure `data/private/user.env` exists and contains a non-empty password.
- To reset locale caches, clear `localStorage` for the domain or run the app in a private browsing session.
- When fetch requests fail, check the console for validation errors and confirm the static server allows cross-origin file access.
