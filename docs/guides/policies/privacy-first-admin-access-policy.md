# Privacy-First Admin Access Policy

Implements [ADR 0003](../adr/0003-privacy-first-admin-access.md).

## Principles

- Admin/manager access is metadata-first.
- Resume content (`yaml_content`, draft selections, revision payloads) is owner-private.
- Recruiter is not a staff override role and does not inherit admin/manager visibility.

## Query Surface

- Admin APIs may return:
  - user identity metadata,
  - role/status metadata,
  - aggregated counters and audit summaries.
- Admin APIs must not return:
  - resume YAML payloads,
  - raw revision content,
  - private snapshot content.

## RLS Boundary

- `resume_documents`, `resume_revisions`, `resume_presets`, `resume_preset_variants` are owner-only.
- Public anonymous read remains scoped to active Public Link snapshot routes.
- `resume_public_links` keeps dedicated admin metadata policy for operations visibility.

## Recruiter Scope

- Recruiter acts as own-account role in current MVP scope (inherits user capabilities only, no admin/manager visibility).
- In role inheritance model: admin inherits manager AND recruiter, but this is capability composition only; it does not grant admin any recruiter content-preview or ambient resume read.
- All roles (user, recruiter, manager, admin) explicitly lack `resume.content.read_other` capability.
- Any recruiter preview/access model requires explicit future ADR and consent model.
