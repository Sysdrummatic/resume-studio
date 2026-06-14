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
- [x] Terms of service page — shipped at `/terms` (Phase G hardening), linked from the
  homepage footer, the Personal Hub "Policies" section, and the sign-up form. English
  only; founder-authored draft pending legal review (Sections 10 and 11 in particular).
- [x] GDPR self-service account deletion — `DELETE /api/user/account` + Profile "Delete
  account and all data" two-step confirmation (Phase G hardening, GDPR Art. 17). Manual
  process (see [ADR 0016](../../adr/0016-account-data-retention-and-deletion.md) and
  [.codex/runbooks/data-subject-request.md](../../../.codex/runbooks/data-subject-request.md))
  remains the fallback for users without account access. Data export/portability remains
  covered by existing CV export features.
- Enable Resend confirmation email for account deletion once a sending domain is verified
  (set `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` env vars — no code change required).
- Unsubscribe preferences.
- Non-English translation of the privacy policy and terms of service.

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
