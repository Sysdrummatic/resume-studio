# Phase D Resume Editor Canvas

Phase D delivers the React canvas editor with live preview and revision workflows.

## Status Checklist

- [x] React editor route exists at `/master-resume`
- [x] Form and live preview are rendered side by side
- [x] EN and PL documents are handled separately
- [x] Draft save/restore/clear is implemented
- [x] YAML import/export/sync is implemented
- [x] Publish creates revision snapshots
- [x] Revision rollback is implemented
- [x] Editor preview renders public/draft and AI-generated badges
- [x] Supporting API routes exist and are covered by tests

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
  - stores `ai_generated` metadata for future AI-assisted generation,
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

## Follow-up Checklist

- [ ] Add AI demo generation actions in the editor
- [ ] Expose public-link management from the editor or adjacent panel
- [x] Align editor preview badges with future public `/r/[slug]` rendering
- [ ] Add dedicated language-version management for creating additional CV locales
