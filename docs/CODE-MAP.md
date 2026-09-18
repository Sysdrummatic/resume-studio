# OpenCiVera code map

Canonical route/module/ownership map, shared by Codex ([AGENTS.md](../AGENTS.md))
and Claude Code ([CLAUDE.md](../CLAUDE.md)) — edit this file, not a copy in
either agent's own config. Domain overview is in [PROJECT-BRIEF.md](PROJECT-BRIEF.md).
Use this map to locate the relevant implementation, then inspect that code.

## Directory structure

```
OpenCiVera/
├── app/                    # Next.js App Router (primary)
│   ├── api/               # Route handlers (auth, resume, admin)
│   ├── components/        # React components
│   │   ├── design-system/ # Tailwind-based atoms
│   │   ├── resume-renderer/ # CV rendering (shared)
│   │   └── ...
│   ├── dashboard/         # User dashboard + Saved Versions (protected, no route group)
│   ├── admin/             # Admin panel (RBAC-gated, protected)
│   ├── master-resume/     # Editor canvas (Phase D, protected)
│   ├── user/              # Personal Hub (protected)
│   ├── onboarding/        # First-use "guided first CV" flow (protected)
│   ├── settings/          # Admin onboarding-test harness (protected, admin-only)
│   ├── docs/              # In-app docs site (Tutorials / Test Scenarios, ADR 0020)
│   ├── [personSlug]/      # Public CV route: /{person-slug}/{public-id}
│   ├── resume/            # Public sample CV
│   ├── privacy/, terms/   # Public policy pages
│   ├── login/             # Auth UI
│   ├── lib/               # Utilities (auth-*, rbac, pdf/, Supabase, validation)
│   ├── globals.css        # App shell styling
│   ├── layout.tsx         # Root layout + header navigation
│   └── page.tsx           # Home/landing
├── proxy.ts                # Session refresh + CSP nonce (Next 16 renamed middleware.ts)
├── public/                # Static assets only (no HTML; legacy public/styles/ retired)
│   ├── data/public/       # YAML content (EN/PL locales)
│   ├── data/private/      # Template YAML (admin only)
│   └── vendor/            # js-yaml.min.js, etc.
├── supabase/
│   └── migrations/        # SQL migrations (in order, append-only for shared environments)
├── tests/                 # Node-based test suites
├── content/docs/          # Git-committed Markdown for the in-app docs site
├── docs/                  # Guides, runbooks, checklists, ADRs
└── .codex/                # Codex-specific config/agents; docs live in docs/, not here
```

Key files NOT to edit directly (read-only):
- `public/vendor/` — vendor scripts
- `supabase/migrations/` — ask Backend Engineer / add a new migration instead

Protected routes have no `(authenticated)` route group — `dashboard/`,
`admin/`, `master-resume/`, `user/`, `onboarding/`, `settings/` are plain
top-level segments, each independently gated by `requireRequestActor()`.
Protected pages use server-side actor checks; API handlers enforce their own
authorization. `proxy.ts` supports session refresh and request security, but
is not a substitute for endpoint checks or database policies.

The old static HTML entry points and `/r/[slug]` route are retired. Do not
create a static-server test path for them. [Netlify configuration](../netlify.toml)
defines the current build/plugin setup.

**Design documentation and mockups belong in `OpenCiVera-Project` (`mocks/`),
not here.** Landing page, docs-site, dashboard, and editor mockups (HTML/CSS/JS
variants, their READMEs, screenshots, QA scripts) go to the sibling
`OpenCiVera-Project` repo's `mocks/` directory — never `plm-resume/docs/design/`
or similar. Precedent: `mocks/dashboard/`, `mocks/opencivera-editor-mockup-editor.html`,
`mocks/claude-design/`, `mocks/landing-redesign/`, `mocks/docs-redesign/`.
Mockup READMEs that reference application source reference it as
`../plm-resume/...` (sibling checkout); their `qa.cjs` scripts need Playwright,
which lives only in `plm-resume`'s `node_modules` — re-run them by copying the
mockup folder into a `plm-resume` checkout, not by installing Playwright in the
docs repo. **Exception:** graphics/assets actually used by the running
application (imported in `app/`, served from `public/`) stay in `plm-resume` —
this rule is for design *exploration and documentation*, not production assets.

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

## Ownership boundaries

| Area | Relevant implementation | Contract/reference |
| --- | --- | --- |
| Session and identity | [Server auth](../app/lib/auth-server.ts), [request auth](../app/lib/auth-request.ts), [proxy](../proxy.ts), `app/api/auth/` | [Auth/RBAC phase](phases/phase-c-auth-rbac-admin.md) |
| Roles and audit | [RBAC](../app/lib/rbac.ts), [admin audit](../app/lib/admin-audit.ts), `app/api/admin/` | [Privacy policy](guides/policies/privacy-first-admin-access-policy.md) |
| Editor and languages | [Editor canvas](../app/master-resume/editor-canvas-client.tsx), [locale buffers](../app/master-resume/use-multi-locale-resume-documents.ts) | [Multi-locale ADR](adr/0017-multi-locale-master-resume-editor-tabs.md) |
| Schema and data | [Resume schema](../app/lib/resume-schema.ts), [resume server](../app/lib/resume-server.ts), [Supabase HTTP](../app/lib/supabase-http.ts) | [YAML contract](guides/policies/opencv-yaml-public-contract-policy.md) |
| Publication/export | `app/api/resume/presets/`, [resume server](../app/lib/resume-server.ts), `app/api/public/opencv/v1/` | [Public API policy](guides/policies/opencv-public-api-export-policy.md) |
| Rendering | `app/components/resume-renderer/`, [live preview](../app/master-resume/resume-live-preview.tsx), `app/lib/pdf/` | [Rendering ADR](adr/0014-pdf-rendering-architecture.md) |
| Styling | [Shared CSS](../app/globals.css), [theme](../app/lib/app-theme.ts), feature CSS | [Responsive UI patterns](guides/development/responsive-ui-and-drawer-patterns.md) |
| Onboarding | `app/onboarding/`, `app/api/resume/onboarding/`, `app/api/admin/onboarding-test/` | [Feature guide](guides/features/first-use-master-cv.md) |

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

See the [publication test contracts](guides/testing/cv-publication-test-contracts.md)
and [onboarding scenarios](guides/test-scenarios/ONBOARDING_TEST_SCENARIOS.md)
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
