# Content Update Workflow

This workflow covers adding or modifying résumé sections and ensuring each locale stays synchronized.

## 1. Plan the Changes

- Capture the desired updates in an issue or task list.
- Identify which locales require edits (`data/public/resume-*.yaml`).
- Confirm whether private-only details need updating in `data/private/resume-private.yaml`.

## 2. Update Locale Data

1. Edit the relevant YAML files under `data/public` using consistent indentation (two spaces).
2. Keep section ordering aligned between locales so the UI displays a parallel structure.
3. When adding new sections, also update the locale configuration in `data/public/config/*` if labels or toggles are required.

## 3. Update Metadata (when needed)

- Adjust canonical URLs, keywords, or ATS headings in `data/public/seo-config.yaml` as required.
- Run `npm run build:metadata` to regenerate `index.html`, `robots.txt`, and `sitemap.xml` so they match the latest metadata.
- Commit the generated artifacts alongside the YAML change.

## 4. Verify Locally

- Restart or refresh the static site server to pull in the changed YAML.
- Switch between languages from the header to confirm parity.
- Validate hyperlinks, bullet lists, and timeline entries render correctly.
- Confirm updated meta tags and structured data render in the head by inspecting the page source.

## 5. Run Automated Checks

- Execute `npm test` to ensure admin panel helpers still pass regression checks.
- If markdown or documentation was touched, run `npm run lint:md` (when available) or `npx markdownlint "**/*.md"`.

## 6. Submit for Review

- Commit changes with descriptive messages, referencing issues when possible.
- Open a pull request summarizing the content updates and outline manual QA steps performed.
- Note any follow-up tasks or pending translations so reviewers can plan additional work.
