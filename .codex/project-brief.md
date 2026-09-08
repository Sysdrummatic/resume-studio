# Project brief — OpenCiVera

OpenCiVera is a Next.js App Router application for building a private Master CV,
creating tailored saved versions, and sharing published CVs through public links.
React and TypeScript implement the UI and route handlers. Supabase provides
authentication, roles, persistence, publication and audit behavior.

The static HTML application is retired. `public/` now holds assets, sample/template
YAML, vendor runtime files and historical migration helpers. It is not a parallel
application. Styling is implemented in shared and feature CSS, including editor
tokens in `app/globals.css`; do not assume a Tailwind migration.

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

Public links use `/{personSlug}/{publicId}`. Anonymous rendering and exports must
use the publication snapshot resolver and apply the saved selection. Private
Master CV data outside that selection must not be served.

Roles are `admin`, `manager`, `user` and `recruiter`. Capability inheritance
does not grant private CV access across accounts. English and Polish content,
labels and fallbacks must stay consistent when contracts change.

For normal onboarding, changes are saved to the account's Master CV. Admin tests
reuse the guide with separate drafts; their optional publication is named
`Test onboardingu`, and must preserve the real Master CV, profile and languages.

## Start here

- [Project rules](../AGENTS.md)
- [Setup and commands](../README.md)
- [Code map](site-map-and-dependencies.md)
- [Validation](runbooks/testing-and-validation.md)
- [Publication contract](../docs/guides/testing/cv-publication-test-contracts.md)
- [Onboarding behavior](../docs/guides/features/first-use-master-cv.md)
- [Dated roadmap](../docs/STATUS.md)

The roadmap records planning status; inspect current code and deployment evidence
before claiming a feature is running on a shared environment.
