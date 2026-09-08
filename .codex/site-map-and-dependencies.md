# OpenCiVera code map

Use this map to locate the relevant implementation, then inspect that code.
Working rules live in [AGENTS.md](../AGENTS.md); the domain overview is in the
[project brief](project-brief.md).

## Application routes

| Route | Entry point | Responsibility |
| --- | --- | --- |
| `/` | [Home](../app/page.tsx) | Landing page |
| `/login` | [Login](../app/login/page.tsx) | Authentication UI |
| `/dashboard` | [Dashboard](../app/dashboard/page.tsx) | Saved CVs and publication management |
| `/master-resume` | [Master Resume](../app/master-resume/page.tsx) | Private editor |
| `/onboarding` | [Guide](../app/onboarding/page.tsx) | First CV; admin test selected by query parameter |
| `/settings` | [Settings](../app/settings/page.tsx) | Admin-only onboarding test controls |
| `/user` | [Personal Hub](../app/user/page.tsx) | Account workspace |
| `/admin` | [Administration](../app/admin/page.tsx) | Staff tools with operation-specific RBAC |
| `/resume` | [Sample CV](../app/resume/page.tsx) | Public sample |
| `/{personSlug}/{publicId}` | [Published CV](../app/[personSlug]/[publicId]/page.tsx) | Public snapshot rendering |
| `/docs` | [Documentation](../app/docs/page.tsx) | In-app documentation with its own access rules |

The old static HTML entry points and `/r/[slug]` route are retired. Do not create
a static-server test path for them. [Netlify configuration](../netlify.toml) defines
the current build/plugin setup.

## Ownership boundaries

| Area | Relevant implementation | Contract/reference |
| --- | --- | --- |
| Session and identity | [Server auth](../app/lib/auth-server.ts), [request auth](../app/lib/auth-request.ts), [proxy](../proxy.ts), `app/api/auth/` | [Auth/RBAC phase](../docs/phases/phase-c-auth-rbac-admin.md) |
| Roles and audit | [RBAC](../app/lib/rbac.ts), [admin audit](../app/lib/admin-audit.ts), `app/api/admin/` | [Privacy policy](../docs/guides/policies/privacy-first-admin-access-policy.md) |
| Editor and languages | [Editor canvas](../app/master-resume/editor-canvas-client.tsx), [locale buffers](../app/master-resume/use-multi-locale-resume-documents.ts) | [Multi-locale ADR](../docs/adr/0017-multi-locale-master-resume-editor-tabs.md) |
| Schema and data | [Resume schema](../app/lib/resume-schema.ts), [resume server](../app/lib/resume-server.ts), [Supabase HTTP](../app/lib/supabase-http.ts) | [YAML contract](../docs/guides/policies/opencv-yaml-public-contract-policy.md) |
| Publication/export | `app/api/resume/presets/`, [resume server](../app/lib/resume-server.ts), `app/api/public/opencv/v1/` | [Public API policy](../docs/guides/policies/opencv-public-api-export-policy.md) |
| Rendering | `app/components/resume-renderer/`, [live preview](../app/master-resume/resume-live-preview.tsx), `app/lib/pdf/` | [Rendering ADR](../docs/adr/0014-pdf-rendering-architecture.md) |
| Styling | [Shared CSS](../app/globals.css), [theme](../app/lib/app-theme.ts), feature CSS | [Responsive UI patterns](../docs/guides/development/responsive-ui-and-drawer-patterns.md) |
| Onboarding | `app/onboarding/`, `app/api/resume/onboarding/`, `app/api/admin/onboarding-test/` | [Feature guide](../docs/guides/features/first-use-master-cv.md) |

Protected pages use server-side actor checks; API handlers enforce their own
authorization. The proxy supports session refresh and request security, but is
not a substitute for endpoint checks or database policies.

## Core data flows

1. **Editing:** forms/YAML → locale buffers → resume API → owned
   `resume_documents` and `resume_revisions`.
2. **Normal publication:** saved CV selection → publication service/RPC →
   immutable `resume_published_cvs` and locale snapshots → active
   `resume_public_links` pointer.
3. **Public read/export:** canonical identity → active link → snapshot resolver →
   selected content. Do not read live Master CV as a fallback.
4. **Admin onboarding test:** separate test draft/progress → dedicated admin RPC →
   optional test preset and publication snapshots. Normal Master CV remains unchanged.

See the [publication test contracts](../docs/guides/testing/cv-publication-test-contracts.md)
and [onboarding scenarios](../docs/guides/test-scenarios/ONBOARDING_TEST_SCENARIOS.md)
before changing these flows.

## Assets and persistence

- `public/data/public/`: sample YAML and locale/config labels.
- `public/data/private/`: template YAML; preserve access rules.
- `public/vendor/`: browser runtimes; treat as vendor code.
- `public/scripts/phase-b/`: historical migration/contract helpers, not the app UI.
- `supabase/migrations/`: append-only history for shared environments. Later
  migrations can replace earlier function/policy definitions; inspect the latest
  applicable definition as well as the original table contract.
- `tests/`: Node test suites; some integration checks require explicit environment setup.

Run and report checks according to the [validation runbook](runbooks/testing-and-validation.md).
