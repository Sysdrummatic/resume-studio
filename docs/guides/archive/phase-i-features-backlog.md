# Future Features Backlog

This file tracks post-MVP ideas mentioned during product planning.

## Metrics and insights

- Public resume view count per link.
- Weekly digest for resume owners.
- High-level geographic insights (country level).

## Recruiter panel

- Recruiter accounts and role model.
- Candidate bookmarking/saved profiles.
- Private recruiter notes.
- Candidate pipeline statuses.
- Bulk export workflows.

## Contact and scheduling

- Public "request a conversation" action.
- Candidate approve/ignore workflow.
- Calendar integration.

## Privacy and legal

- [x] Privacy policy page — shipped at `/privacy` (Phase G hardening), linked from the
  homepage footer, the Personal Hub "Policies" section, and the sign-up form. English
  only; founder-authored draft pending legal review.
- Terms of service page (the "Policies" section in Personal Hub reserves space for this
  entry).
- GDPR export/delete requests — manual process documented (see
  [ADR 0016](../../adr/0016-account-data-retention-and-deletion.md) and
  [.codex/runbooks/data-subject-request.md](../../../.codex/runbooks/data-subject-request.md));
  self-service automation remains backlog.
- Unsubscribe preferences.
- Non-English translation of the privacy policy.

## Internationalization expansion

- Full app UI translation (EN/PL and beyond).
- Locale-aware date/format handling.

## Integrations

- LinkedIn import research.
- GitHub profile/activity enrichment.
- Export to third-party formats.
## AI-assisted resume intelligence

- AI demo resume generation from fictional data in the editor.
- Job-description-tailored fictional CV generation as a later follow-up.
- AI enrichment for ambiguous section detection after deterministic parsing baseline.
- Confidence scoring for parsed entities (experience, education, skills).
- Smart normalization of job titles, dates, and technology names.
- Suggested improvements for ATS readability.



## Frontend modernization (React phase)

- Incremental migration from static pages to React + TypeScript.
- Shared component system for resume blocks, forms, and dashboard widgets.
- Route-level feature flags for safe rollout and rollback.
- React test coverage baseline for migrated screens.
