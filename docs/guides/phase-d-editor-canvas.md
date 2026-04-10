# Phase D Resume Editor Canvas

Phase D delivers the React canvas editor with live preview and revision workflows.

## Implemented capabilities

- Split canvas editor on `/master-resume`:
  - editable CV form on the left,
  - live CV preview on the right.
- Locale-specific documents:
  - EN and PL handled as separate `resume_documents` rows.
- Draft flow (browser local storage):
  - save draft,
  - restore draft,
  - clear draft.
- YAML operations:
  - form -> YAML sync,
  - YAML -> form import,
  - YAML export to file.
- Publish flow:
  - saves YAML to `resume_documents`,
  - creates revision snapshot in `resume_revisions`.
- Revision history:
  - list revisions,
  - rollback to selected revision.

## API routes used by editor

- `GET /api/resume/document?locale=en|pl`
- `POST /api/resume/publish`
- `POST /api/resume/rollback`

## Notes

- YAML runtime in browser is served from:
  - `/public/vendor/js-yaml.min.js`
- Server-side publish validation uses:
  - `validate_resume_document_yaml` RPC.
