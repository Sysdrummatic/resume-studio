# Runbook: Testing and validation (Codex workflow)

This project expects changes to be validated with automated checks and relevant manual flows.

## Default automated suite (run before task completion)

- `npm run lint`
- `npm run typecheck`
- `npm test`

Shortcut:
- `npm run verify` (runs lint + typecheck + test)

## After every modification guidance

Not every keystroke warrants a full CI run, but every meaningful change should be followed by the smallest relevant check:

- Docs-only change:
  - run `npm test` only if docs imply behavior/workflow changes; otherwise skip with justification.
- Frontend/Next change:
  - run `npm run lint` + `npm run typecheck` as soon as the code compiles cleanly.
  - run `npm test` before finishing the task.
- Supabase migration / contract change:
  - run `npm test` immediately after updating contract/migration logic.

## Manual QA triggers (when applicable)

- Auth: signup/verify/signin/signout, session refresh, protected routes.
- Resume: locale switching, public vs private rendering, publish/rollback.
- Admin: role boundaries + audit logging.
- Public SEO: robots meta, canonical URL, indexing controls, 404 behavior.

## Reporting (in the final recap)

- Commands run + pass/fail.
- Manual steps executed (short checklist).
- Known limitations or blockers (with next steps).


