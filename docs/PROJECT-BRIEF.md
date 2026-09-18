# Project brief — OpenCiVera

Canonical domain/architecture overview, shared by Codex ([AGENTS.md](../AGENTS.md))
and Claude Code ([CLAUDE.md](../CLAUDE.md)) — edit this file, not a copy in either
agent's own config.

**OpenCiVera** is a full-stack SaaS resume/CV builder: a private Master CV editor
with a split-canvas YAML view, live preview, revisioning and rollback; a
snapshot-based Published CV system with public links, SEO/AEO controls and audit
logging; Supabase auth with 4 role tiers (`admin`, `manager`, `user`, `recruiter`);
EN/PL multilingual documents with locale-aware rendering and fallback; and public
sharing at the single canonical route `/{person-slug}/{public-id}`.

React and TypeScript implement the UI and route handlers (Next.js App Router,
single app under `app/`). Supabase provides authentication, roles, persistence,
publication and audit behavior. The legacy static HTML app (`e675940`,
2026-06-29) is fully retired — no HTML entry points, legacy scripts/styles or
compatibility redirects remain (`netlify.toml` is build config + Next.js plugin
only; see `tests/legacy-static-cleanup.test.mjs`). `public/` now holds assets,
sample/template YAML, vendor runtime files and historical migration helpers —
not a parallel application. Styling is shared/feature CSS including editor
tokens in `app/globals.css`, plus Tailwind for new design-system work — do not
assume a full Tailwind migration has happened.

## Data model

| Concept | Storage | Meaning |
| --- | --- | --- |
| Master CV | `resume_documents` | Private editable YAML per language |
| Revision | `resume_revisions` | Master CV history and rollback source |
| Saved CV | `resume_presets`, `resume_preset_variants` | Selected content and language configuration |
| Published CV | `resume_published_cvs`, `resume_published_cv_locales` | Immutable publication snapshots |
| Public identity | `resume_public_links` | Canonical path, active snapshot and indexing controls |
| First use | `resume_onboarding` | Normal guide progress and first saved CV reference |
| Admin test | `resume_onboarding_test_runs` | Isolated test drafts and progress |

- Schema enforced via the `validate_resume_document_yaml` RPC. Two locale types
  (`en`, `pl`) are separate document rows.
- Editor imports/exports YAML; publish stores an immutable snapshot in
  `resume_revisions`.

## Role-based access control (RBAC)

```
┌──────────┬─────────────────────────────────────────┐
│ Role     │ Capabilities                            │
├──────────┼─────────────────────────────────────────┤
│ admin    │ Full access; can delete any user        │
│ manager  │ Can delete user/recruiter, not manager  │
│ user     │ Manages own CV only                     │
│ recruiter│ Same as user (future expansion)         │
└──────────┴─────────────────────────────────────────┘
```

Enforced via Supabase RLS policies + `app/lib/rbac.ts`. Capability inheritance
does not grant access to another user's private CV — exact-role checks and
capability checks are different; use the existing RBAC helpers appropriately.
Never weaken RLS without Architecture review.

## Published CV versioning

```
Master Resume (Draft) ──publish──> Saved Version (Snapshot)
                                           │
                                   ┌───────┴──────────┐
                                   │                  │
                            Publish to Public Link   Keep as Draft
                                   │
                          resume_public_links row
                          (canonical_public_path)
                                   │
                            /{person-slug}/{id}
```

Publish creates an immutable snapshot in `resume_revisions`. Public links carry
SEO controls (`allow_indexing`). Rollback restores a previous snapshot, not the
Master Resume directly.

## Public URL routing

**Canonical:** `/{person-slug}/{public-id}` (from `resume_public_links`), the
only public route. Anonymous rendering and exports must use the publication
snapshot resolver and apply the saved selection — private Master CV data
outside that selection must never be served.

## Onboarding

For normal onboarding, changes are saved to the account's own Master CV. Admin
onboarding tests reuse the same guide with separate, isolated drafts (optional
publication named `Test onboardingu`) and must never change the real Master
CV, profile or account languages.

## Working agreement

Change discipline, KISS/DRY/security priorities, and TDD/definition-of-done
rules are defined once in [AGENTS.md](../AGENTS.md) — both agents follow that,
not a copy here.

## Start here

- [Project rules (Codex)](../AGENTS.md) / [Claude Code config](../CLAUDE.md)
- [Setup and commands](../README.md)
- [Code map](CODE-MAP.md)
- [Checklists](CHECKLISTS.md)
- [Validation runbook](runbooks/testing-and-validation.md)
- [Publication contract](guides/testing/cv-publication-test-contracts.md)
- [Onboarding behavior](guides/features/first-use-master-cv.md)
- [Dated roadmap](STATUS.md)

The roadmap records planning status; inspect current code and deployment
evidence before claiming a feature is running on a shared environment.
