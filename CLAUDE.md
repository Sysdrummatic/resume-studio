# OpenCiVera/OpenCVHub Claude Configuration

**Last Updated:** July 2026  
**Phase Tracking:** See [docs/STATUS.md](docs/STATUS.md) for current phase, status, and roadmap  
**Stack:** Next.js (App Router) + React + TypeScript + Supabase + Tailwind CSS

---

## 🎯 Project Overview

**OpenCiVera** is a full-stack SaaS resume/CV builder with:
- **Master Resume Editor** (Phase D): Split-canvas YAML editor with live preview, revisioning, and rollback
- **Published CV System**: Snapshot-based versioning with public links, SEO/AEO controls, and audit logging
- **Authentication & RBAC**: Supabase auth with 4 role tiers (`admin`, `manager`, `user`, `recruiter`)
- **Multilingual Support**: EN and PL document types with locale-aware rendering
- **Public Sharing**: Canonical URLs (`/{person-slug}/{public-id}`) — the only public route (see Public URL Routing below)

**Architecture (post-migration):**
- Legacy static app (HTML/CSS/JS in `/public/`) fully removed pre-launch (`e675940`, 2026-06-29) — no HTML entry points, no legacy scripts/styles, no compatibility redirects remain (`netlify.toml` is build config + Next.js plugin only; see `tests/legacy-static-cleanup.test.mjs`)
- Single Next.js app in `/app/` (App Router, TypeScript, React)
- YAML-first data model in Supabase

---

## 📊 Decision Priorities

When evaluating solutions, trade-offs, or architectural choices, prioritize in this order:

1. **Security and data integrity** (never compromise; RLS policies, auth boundaries, secret management)
2. **Functional correctness** (code must do what it promises; tests validate this)
3. **Maintainability and readability** (code is read 10× more than written)
4. **Performance** (optimize when it matters; don't micro-optimize everything)
5. **Delivery speed** (lowest priority; speed at expense of above 4 = technical debt)

---

## 📂 Directory Structure

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
│   ├── docs/              # In-app docs site (Tutorials / Test Scenarios, ADR 0020)
│   ├── [personSlug]/      # Public CV route: /{person-slug}/{public-id}
│   ├── resume/            # Public sample CV
│   ├── privacy/, terms/   # Public policy pages
│   ├── login/             # Auth UI
│   ├── lib/               # Utilities (auth-*, rbac, pdf/, Supabase, validation)
│   ├── globals.css        # App shell styling (Tailwind)
│   ├── layout.tsx         # Root layout + header navigation
│   └── page.tsx           # Home/landing
├── proxy.ts                # Session refresh + CSP nonce (Next 16 renamed middleware.ts)
├── public/                # Static assets only (no HTML; legacy public/styles/ retired)
│   ├── data/public/       # YAML content (EN/PL locales)
│   ├── data/private/      # Template YAML (admin only)
│   └── vendor/            # js-yaml.min.js, etc.
├── supabase/
│   └── migrations/        # SQL migrations (in order)
├── tests/                 # Node-based test suites
├── content/docs/          # Git-committed Markdown for the in-app docs site
├── docs/                  # Guides, checklists, ADRs
└── .codex/                # System instructions, state.yaml

Key files NOT to edit (read-only):
- public/vendor/           (vendor scripts)
- supabase/migrations/     (ask Backend Engineer)
```

Protected routes have no `(authenticated)` route group — `dashboard/`, `admin/`, `master-resume/`, `user/` are plain top-level segments, each independently gated by `requireRequestActor()`.

---

## 🏗️ Architecture & Key Contracts

### 1. YAML-First Data Model
- Resume content stored as YAML in Supabase `resume_documents` table
- Schema enforced via `validate_resume_document_yaml` RPC function
- Two locale types: `en` and `pl` as separate document rows
- Editor imports/exports YAML; publish stores snapshot in `resume_revisions`

### 2. Role-Based Access Control (RBAC)
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
- Enforced via Supabase RLS policies + `app/lib/rbac.ts`
- Never weaken RLS without Architecture review

### 3. Published CV Versioning
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
- Publish creates immutable snapshot in `resume_revisions`
- Public links stored with SEO controls (`allow_indexing`)
- Rollback restores previous snapshot, not Master Resume

### 4. Public URL Routing
- **Canonical:** `/{person-slug}/{public-id}` (from `resume_public_links`), the only public route
- **Compatibility:** `/r/{slug}` retired pre-launch (ADR 0004 superseded, 2026-07-03) — no redirect exists, `.html` entry points and their Netlify redirects were removed with the legacy app

### 5. Change Discipline (From .codex/instructions.md)

**Incremental Approach (legacy parity gate closed pre-launch):**
- **Evolve incrementally:** only change inside `app/` when needed
- **Preserve existing contracts:**
  - YAML shapes (if changing schema, update both EN/PL consistently + ensure fallbacks)
  - DB schema/RLS expectations (ask Backend Engineer for migrations)
- **Prefer explicit, boring solutions** over hidden magic
- **When changing YAML content contracts:** update both PL/EN consistently, ensure fallbacks exist

---

## 🛠️ Technology Stack & Conventions

### Frontend (Client-Side)
- **Framework:** Next.js 14+ (App Router, React Server Components)
- **Language:** TypeScript (strict mode required)
- **Styling:** Tailwind CSS + design-system atoms (`app/components/design-system/`)
- **Icons/UI:** No external component library yet (build in-house)
- **State Management:** React hooks (useState, useContext)
- **Data Fetching:** fetch() in client components, direct Supabase in server components

**NEVER DO:**
- Inline styles (except design-system Button.tsx migration)
- CSS modules for new work (use Tailwind)
- Class components (hooks only)
- `any` type in TypeScript

### Backend (Server-Side)
- **API Framework:** Next.js route handlers (`app/api/`)
- **Database:** Supabase PostgreSQL with RLS policies
- **Auth:** Supabase Auth (JWT + httpOnly cookies)
- **Validation:** Zod for runtime safety
- **RPC Functions:** `resume-server.ts` delegates to Supabase RPC

### Supabase CLI
- Zainstalowany globalnie: `npm install -g supabase`
- Use: `supabase db push` (push local migrations)
- Use: `supabase pull` (pull schema z production)

**NEVER DO:**
- Hardcode secrets (use env vars only)
- Weaken RLS policies without explicit justification and Architecture review
- Trust user input without validation
- Make unencrypted API calls
- Log sensitive data (auth tokens, passwords)

### Engineering Standards (From .codex/instructions.md)
- **JavaScript/TypeScript:** modern syntax, `const` by default, small composable functions, explicit error handling
- **Code Comments:** avoid inline comments unless logic is genuinely non-obvious or security-sensitive
- **Secrets:** never hardcode; rely on env vars and documented setup
- **Code Style:** ESLint enforced; run `npm run lint` before committing

---

## 📋 Common Workflows & Patterns

### Pattern 1: Adding a Protected API Route (Cost: 150-200 tokens)
```typescript
// app/api/[resource]/[action]/route.ts
import { requireRequestActor } from '@/lib/auth-request';
import { validateWithZod } from '@/lib/validation';

export async function POST(req: Request) {
  const actor = await requireRequestActor(req);
  
  if (actor.role !== 'admin' && actor.role !== 'manager') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const validated = validateWithZod(schema, body);
  
  // Implementation
  
  return Response.json({ success: true, data: result });
}
```

**Checklist:**
- [ ] Use `requireRequestActor()` for auth
- [ ] Check role boundaries explicitly (never trust actor.role implicitly)
- [ ] Validate input with Zod
- [ ] Return 400 for bad input, 403 for forbidden, 500 for errors
- [ ] Add tests to `tests/`

### Pattern 2: Creating a Client Component with Data (Cost: 150-200 tokens)
```typescript
// app/dashboard/dashboard-client.tsx
'use client';

import { useEffect, useState } from 'react';

export function DashboardClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/endpoint', { method: 'POST' });
      if (!res.ok) throw new Error('Request failed');
      const result = await res.json();
      setData(result.data);
    } catch (err) {
      console.error(err);
      // Show error to user
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

**Checklist:**
- [ ] Use `'use client'` directive
- [ ] Handle loading state
- [ ] Use try-catch with proper error UI
- [ ] Avoid hardcoding URLs (use env vars if external)

### Pattern 3: YAML Operations in Editor (Cost: 100-150 tokens)
```typescript
import YAML from 'js-yaml';

// Parse YAML string to object
const resumeObj = YAML.load(yamlString) as ResumeDocument;

// Convert object back to YAML
const yamlString = YAML.dump(resumeObj, { indent: 2 });

// Validate against schema
const validated = validateResumeSchema(resumeObj);
```

**Notes:**
- `js-yaml` loaded from `/public/vendor/js-yaml.min.js` in browser
- Server validates via RPC: `validate_resume_document_yaml`
- Always validate BOTH client (UX) and server (security)

### Pattern 4: Querying Supabase with RLS (Cost: 100-150 tokens)
```typescript
// Server-side (server component or API route)
import { createServerClient } from '@supabase/ssr';

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // or ANON_KEY
);

const { data, error } = await supabase
  .from('resume_documents')
  .select('*')
  .eq('user_id', userId)
  .single();

if (error) throw new Error(error.message);
return data;
```

**RLS Behavior:**
- Service role key: Bypasses RLS (use for admin operations only)
- Anon key: Enforces RLS (use for user operations)

---

## 🔐 Security & Auth Critical Points

### Never Weaken These (Architecture Review Required)
1. **RLS Policies:** Require explicit Architecture approval before any change
2. **Role Boundaries:** Always check `actor.role` before operations
3. **Service Role Key:** Never expose in client code or logs
4. **YAML Validation:** Always validate on server before saving

### Always Check These Before Committing
- Is user authenticated? (`requireRequestActor`)
- Does user own this resource? (RLS + explicit check)
- Is input sanitized? (Zod validation)
- Is error message safe for client? (No system details leaked)

### Critical Files (Never Weaken Without Review)
- `app/lib/rbac.ts` - Role boundary logic
- `supabase/migrations/` - RLS policies
- `app/lib/auth-request.ts`, `app/lib/auth-server.ts`, `app/lib/auth-cookies.ts` - JWT/cookie handling (auth is split across these, not a single `auth.ts`)
- `app/api/auth/` - Authentication endpoints

### For Auth/Admin Changes: Verify These
- Role boundaries: `admin` > `manager` > `user`/`recruiter` capabilities
- Audit logging: Admin actions are logged
- Self-escalation prevention: Users cannot escalate their own roles
- Recursive policy issues: Avoid policies that reference the same table in `USING` clauses

---

## 📝 Git Workflow & Commits

@docs/guides/development/git-workflow.md

---

## 🧪 Testing & Validation (Mandatory)

### Before Considering a Task "Done": Run All Checks

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript strict check
npm test           # Node test runner (tests/*.test.js)
```

**If environment is restricted** (e.g., spawn EPERM error):
```bash
node tests/phase-b-yaml-data-layer.test.js
node tests/phase-c-sql-migration.test.js
node tests/phase-d-editor-implementation.test.js
# Document what you ran and why you couldn't run npm test
```

### Critical Flows to Validate (If Your Change Touches Them)

| Flow | Test When Touching | Checklist |
|------|-------------------|-----------|
| **Auth** | `app/api/auth/`, `app/lib/auth.ts` | Signup → verify → signin → signout → reset password |
| **Protected Routes** | `app/(authenticated)/**`, RBAC logic | Redirects work, role boundaries enforced |
| **Resume Rendering** | `app/resume/`, `app/components/resume-renderer/` | Locale switching (EN/PL) works, all sections render |
| **Editor** | `app/master-resume/**` | Publish, rollback, draft save/restore |
| **Public View** | `app/[person-slug]/[public-id]/` | Canonical route renders, indexing controls |
| **Admin RBAC** | `app/admin/`, `app/api/admin/**` | Role hierarchy enforced, user deletion respects boundaries |

### Testing Discipline (From .codex/instructions.md)

- Run the **smallest relevant check** after each meaningful change
- Before submitting for review, run **full suite:** lint + typecheck + test
- Document any blockers or why you skipped a check
- If a check fails: **fix it, don't skip it**

---

## 📚 Key Documentation to Reference

| Document | What's Inside | When to Use |
|----------|---------------|-----------|
| `docs/phases/phase-d-editor-canvas.md` | Editor workflows, API contracts | Feature work on `/master-resume` |
| `docs/guides/testing/cv-publication-test-contracts.md` | Public link testing, validation | Testing publish/unpublish flows |
| `docs/adr/0001-cv-publication-model.md` | Design decisions on versioning | Understanding snapshot-based model |
| `.codex/instructions.md` | Full team discipline + agent rules | Understanding change discipline |
| `docs/STATUS.md` | Current sprint + next phase | Understanding priorities |

---

## 📝 Prompting Instructions for Claude

### What NOT to Explain (Save Tokens)
- Basic React/TypeScript concepts (hooks, generics, etc.)
- How `fetch()` works
- Tailwind CSS properties
- npm package usage basics
- Standard Next.js App Router patterns

**Assume you know:** React 18+, TypeScript strict mode, CSS, async/await, promises

### What ALWAYS Include
1. When asking for code: Show the exact file path
2. When asking for refactoring: Paste current code (or diffs if large)
3. When asking for debugging: Include error message + relevant file snippet
4. When asking about architecture: Reference the relevant Phase (see [docs/STATUS.md](docs/STATUS.md)) + explain impact

### Formatting Preferences
- **For refactoring:** `show diffs, not full files`
- **For bugs:** `minimal reproduction + error message`
- **For features:** `show usage example first, then implementation`
- **For explanations:** `code comments for WHY, not WHAT`

### Question Structure (Token Budget: 200-400 tokens)
```
Context: [1-2 sentences about what you're building]

Files involved:
- app/master-resume/editor-canvas-client.tsx (lines 45-120)
- app/lib/resume-server.ts (lines 30-50)

Task: [What you want to accomplish]

Constraints:
- Must preserve existing X behavior
- Token budget preference (Haiku/Sonnet)
- Any specific patterns to follow

Show only: [Diffs/changes/new code, not explanations]
```

---

## 🎯 Project Phases

**Phase tracking lives in [docs/STATUS.md](docs/STATUS.md)** — the single source of truth for phase status, progress table, active sprint items, and links to all phase documentation.

**When a phase task completes:**
1. Update the relevant section in `docs/STATUS.md` (status, % complete, active sprint checklist).
2. Update the corresponding `docs/phases/phase-X-*.md` (or `docs/guides/phase-X-*.md`) guide with implementation details.
4. Commit using Conventional Commits (`docs: ...`) per the Git Workflow section above — do not duplicate phase checklists in this file.

---

## 🏗️ Implementation Notes

Durable "how things work" reference material for specific features, independent of phase status.

**PDF Rendering Module (ADR 0014):** Professional PDF export lives in `app/lib/pdf/`:
- `theme.ts` — `PdfTheme` contract + `cvBasicDotTheme`. **Every value is written as `pt(<the web pixel value>)`, where `pt()` applies the single `PX_TO_PT = 0.625` factor** (chosen so the inherited body size lands on 10pt, the print-CV convention, while every other token keeps its exact web proportion). Fluid CSS (`clamp`, `vw`) is resolved at `REFERENCE_VIEWPORT_PX = 1200`. Never hand-tune a pt value: the PDF is the LiveCV design scaled, not a second design. `tests/pdf-web-style-parity.test.mjs` parses both files and fails on drift — it caught the section dot sitting at 27% of its web size and the spacing scale shifted a whole step (`spacing.lg` was 16 while `--space-lg` is 20px).
- `engine-react-pdf.ts` — registers **static** `SpaceGrotesk-{Regular,Medium,Bold}.ttf` (400/500/700) from `public/fonts/`. Do **not** point weights at `SpaceGrotesk-VariableFont_wght.ttf`: `Font.register` selects a file per weight and does not instance a variation axis, so every weight embedded that file's default instance — Light (300) — and the PDF had no bold at all. Selecting a named instance via `postscriptName` loads but crashes fontkit's glyf subsetter. Because Space Grotesk ships no 600 static instance, the CV render path in `resume.css` is restricted to 400/500/700 (the parity test enforces this); the browser could interpolate 600, the PDF can never match it.
- `sections/` — isolated section components receiving `(data, theme)`; shared card/timeline/dot-meter/pill/meter-item primitives in `primitives.tsx`. Employer blocks render with `wrap={false}` (never split across pages). **Every styled `<Text>` must set its own `lineHeight`** — react-pdf measures a Text's box from a `lineHeight` on that Text and only *paints* with an inherited one, so a Page-level value silently overlapped the hero role onto the name. `PdfSectionCard` draws no border, matching `.section`/`.card`, which use a soft `box-shadow` react-pdf cannot express; a substitute border read as a hard box.
- `templates/TwoColumnTemplate.tsx` — A4 layout (main 2.5 : sidebar 1).
- `CvPdfDocument.tsx` — entry point; `app/lib/CvPdfTemplate.tsx` is a backward-compat re-export only.
- `filename.ts` — `buildPdfFilename()` → `{name-slug}-{YYYY-MM-DD}-opencivera-{publicId}.pdf`.
- Draft PDF export is controlled by `platform_feature_flags.pdf_draft_enabled` (Supabase), read via `app/lib/pdf-feature-flags.ts` (`isPdfDraftEnabled()`, fail-open) and threaded as `draftPdfEnabled` prop into `BasicResumeDocument`.
See [ADR 0014](docs/adr/0014-pdf-rendering-architecture.md).

**ATS Export Refactor:** Export rules/constants and Phase K scoring types are isolated in `app/lib/ats-export-rules.ts`; `convertResumeToPlainText`/`convertResumeToAtsYaml`/`getRawYamlSource` consume them. ATS Ready dropdown (CVasCode / .txt / .yaml) downloads the currently selected language version. Foundation for Phase K — see [Phase K ATS Intelligence](docs/phases/phase-k-ats-intelligence-plan.md).

**Published Export Selection Contract (R09):** `fetchPublishedResumeExportByPublicLink`
(`app/lib/resume-server.ts`) is the single resolver behind every published-CV
export surface (PDF, ATS `.txt`, ATS `.yaml`, CVasCode, public OpenCV API v1).
It must always apply the saved-version selection before returning
`yamlContent` — snapshot rows (`resume_published_cv_locales.yaml_content`)
store the **full Master Resume** with the selection stored alongside, so
returning `yaml_content` verbatim leaks content the user excluded (ADR 0008:
master data is never exposed publicly). The resolver delegates to
`buildPublishedExportContent` (`app/lib/published-export.ts`, pure/runtime-testable)
→ `applyResumeSelectionToRawDocument` (`app/lib/preset-selection.ts`), which
filters the indexed arrays on the **raw** YAML object so schema-unknown
extension fields survive the export. **Selection indexes are raw-domain**: the
editor builds them against raw parsed YAML arrays, so every consumer — public
view (`buildResumeDocumentFromPreset` → `buildPublishedResumeDocument`),
dashboard preview (`buildPresetResumeDocument` in
`app/dashboard/dashboard-client.tsx`), and all exports — must apply the
selection **before** normalization; normalizing first shifts indexes past
records normalization drops and can expose the wrong entry. A selection that
cannot be applied faithfully (non-object document, index out of range,
selected-summary count ≠ 1) yields `null` → 404. The resolver returns both
`yamlContent` (CVasCode / OpenCV API v1) and the parsed `resume` document —
export routes must consume `resume` instead of re-parsing `yamlContent` (one
YAML parse per request), and every public export route (PDF/TXT/ATS YAML) is
rate limited.
Any new export surface must consume this resolver (or apply the same
selection) — never read snapshot `yaml_content` directly. "Raw" (CVasCode)
means no ATS transformations, not unselected master content. Contract tests
execute `buildPublishedExportContent` directly:
`tests/resume-export-contract.test.mjs`,
`tests/adr-0008-opencv-public-api-contract.test.mjs`.

**API Routes (Public CV / Export):**
- GET/POST `/api/resume/document?locale=en|pl` — Fetch/save documents
- POST `/api/resume/publish` — Create revision snapshot
- POST `/api/resume/rollback` — Restore previous version
- GET|POST|PATCH `/api/resume/languages` — Language management
- GET `/api/resume/presets` — List Saved Versions
- POST/PATCH `/api/resume/presets/[id]/publish` — Publish version
- POST `/api/resume/presets/[id]/unpublish` — Unpublish version
- GET `/api/resume/export/text` — ATS-cleaned plain text export
- GET `/api/resume/export/yaml` — ATS-cleaned YAML export
- GET `/api/resume/export/cvac` — Raw CVasCode source YAML export
- GET `/api/resume/export/pdf` — Published CV PDF export
- POST `/api/resume/export/pdf/preview` — Draft CV PDF export (admin, gated by `pdf_draft_enabled` flag)

**Routing Model:**
- **Canonical:** `/{person-slug}/{public-id}` (primary, from `resume_public_links`), the only public route
- **Compatibility:** `/r/{slug}` retired pre-launch (ADR 0004 superseded, 2026-07-03) — no redirect remains
- **Netlify:** Build config + Next.js plugin only; the legacy `.html` redirects were removed with the static app (`tests/legacy-static-cleanup.test.mjs`)

**Privacy Policy Page:** Public, indexable route at `app/privacy/page.tsx`
(English only, docs/security/security-and-risk-plan.md R01). Linked from the homepage footer
(`app/components/footer.tsx`), the Personal Hub "Policies" section
(`app/user/user-client.tsx`), and the sign-up form
(`app/login/account-access-client.tsx`). Listed as a static entry in
`app/sitemap.ts`. The policy text is a founder-authored draft based on the current
data model (Supabase EU hosting, Netlify hosting, no ad tracking); pending legal
review. Data retention ADR, processor DPA checklist, and a data-subject-request
runbook are tracked as a follow-up (PR2). Test contract:
`tests/privacy-policy-page.test.mjs`.

**Terms of Service Page:** Public, indexable route at `app/terms/page.tsx`,
mirroring the structure and placeholder values (controller name, contact email,
last-updated date, minimum age of 16) of the Privacy Policy page. Linked from the
homepage footer (`app/components/footer.tsx`), the Personal Hub "Policies" section
(`app/user/user-client.tsx`), and the sign-up form's policy-acceptance checkbox
(`app/login/account-access-client.tsx`). Listed as a static entry in
`app/sitemap.ts`. Section 6 references the OpenCV data format (ADR 0002/0008) as
separate from the OpenCiVera trademark. **Sections 10 (Limitation of Liability) and
11 (Governing Law) are placeholder text and require legal review before this
Service has any paying customers or a significant user base — not verified against
Polish or EU consumer-protection law.** Test contract:
`tests/terms-of-service-page.test.mjs`.

**Account Data Retention ADR + Runbook (PR2):**
[ADR 0016](docs/adr/0016-account-data-retention-and-deletion.md) documents the manual
account-deletion process and a verified cascade map from `auth.users` through
`profiles` to every CV/content table (`resume_documents`, `resume_revisions`,
`resume_presets`, `resume_preset_variants`, `resume_public_links`,
`resume_published_cvs`, `resume_published_cv_locales`, `resume_user_locales`) — all
cascade cleanly, no schema gaps. `admin_audit_logs` retention stays governed by ADR
0007 and stores UUIDs/roles only (no PII). Two **Known Gaps** are tracked for future
PRs: (1) the `user.deleted` audit entry is silently dropped because
`writeAdminAuditLog` runs after the cascading delete and violates the
`target_user_id` FK — `app/api/admin/users/[userId]/route.ts`; (2) staff accounts
(`actor_user_id` on any audit row) cannot be deleted due to `ON DELETE RESTRICT`.
Operational steps live in `.codex/runbooks/data-subject-request.md`; sub-processor
status in `docs/guides/processor-compliance-checklist.md`. Test contract:
`tests/docs-data-retention.test.mjs`.

**Self-Service Account Deletion (GDPR Art. 17):** `DELETE /api/user/account`
(`app/api/user/account/route.ts`) deletes the authenticated caller's own account via
`requireRequestActor()` + `deleteAuthUserAsService()` — the target is derived only
from the session, never a request body field. All personal-data tables cascade per
ADR 0016's Scope and Cascade Map, and no Supabase Storage objects exist to clean up,
so the route is capture-email → delete `auth.users` → feature-flagged confirmation
email. Profile modal (`app/components/account-menu.tsx`) adds a "Usuń konto i
wszystkie dane" danger-zone section with two-step, type-to-confirm-email destructive
flow; on success the user is redirected to `/login?reason=account_deleted`.
**Resolved decisions:** no write to `admin_audit_logs` or any new account-lifecycle
table for this flow (actor == target is a category error for that table, and
`admin_audit_logs.actor_user_id` has `ON DELETE RESTRICT` to `profiles`, which would
block the deletion) — the deleted account row plus the confirmation email are the
accountability trail; Phase G's admin audit panel is untouched.
**Confirmation email (Resend, feature-flagged, currently inactive):**
`app/lib/email.ts` exports `sendEmail()`, a self-contained, fail-open helper (reads
`RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` from `process.env` directly — not via
`app/lib/env.ts`, to avoid TS `allowImportingTsExtensions`/Node test-runner import
conflicts). No-ops with `{sent:false, reason:"not_configured"}` and a `console.warn`
when either var is unset; never throws. `.env.example` documents both vars as
present-but-empty. Enabling requires only setting the two env vars (no code change).
`app/privacy/page.tsx` Section 5 now distinguishes immediate self-service deletion
from the 30-day manual/admin-mediated path; `.codex/runbooks/data-subject-request.md`
and `docs/guides/processor-compliance-checklist.md` updated accordingly. Test
contracts: `tests/account-deletion.test.mjs`, `tests/email-feature-flag.test.mjs`.
**Known limitation (not yet fixed):** `requireRequestActor()` imposes no role
restriction, so an admin/manager can call this route on their own account; if that
account has ever been `actor_user_id` on an `admin_audit_logs` row, the cascading
delete would likely fail at the Postgres level due to `ON DELETE RESTRICT` on
`admin_audit_logs.actor_user_id`. RBAC does not currently prevent this — flagged as a
follow-up, not handled in this change.

**Test User / OCV Staff Account Flags (ADR 0019):** `profiles.is_test_user` and
`profiles.is_ocv_staff` (independent booleans, default `false`) mark QA and
project-affiliated accounts. Accounts with either flag are excluded from every
platform counter in `get_admin_platform_stats()` (users, active, resumes, public
links, public views), which also reports `excluded_test_users`/`excluded_staff_users`
— shown as a breakdown in the Admin panel Users tile. Flags are toggled via checkbox
columns in the admin users list → `PATCH /api/admin/users/[userId]`
(`isTestUser`/`isOcvStaff`) → `set_user_flag` RPC (SECURITY DEFINER, same
manager/admin boundaries as `set_user_active`, audited as `user.flag_updated`).
Flags are metrics metadata only — no RBAC/RLS/publishing behavior depends on them.
The exclusion predicate `not (is_test_user or is_ocv_staff)` lives inside the stats
RPC, not a view: new analytics queries must apply it themselves. Migration:
`supabase/migrations/20260711_profile_test_and_staff_flags.sql`. Test contract:
`tests/admin-user-flags.test.mjs`. See [ADR 0019](docs/adr/0019-test-user-and-staff-account-flags.md).

**Last-Admin Deletion Safeguard:** The system can never reach a zero-admin
state. `supabase/migrations/20260614_prevent_last_admin_deletion.sql` adds
`is_last_admin(p_user_id)` / `is_only_profile(p_user_id)` (security-definer SQL
functions) plus `prevent_last_admin_deletion()`, a `BEFORE DELETE` trigger on
`public.profiles` with `WHEN (old.role = 'admin')` that raises an exception if the
row being deleted is the last `admin` — a path-independent backstop covering both
the admin-panel "delete user" flow (`can_delete_user_account` already permits an
admin to delete another admin) and `DELETE /api/user/account`
(`app/api/user/account/route.ts`). The self-service route additionally pre-checks
`is_last_admin`/`is_only_profile` via RPC for admin callers, before any deletion
step, and returns `409 { error: "last_admin" | "only_account", message }` — the
Profile modal Danger Zone (`app/components/account-menu.tsx`) shows that message
inline without clearing the session or redirecting. Documented in
`docs/security/security-and-risk-plan.md` (R08, cross-ref R06). Test
contract: `tests/last-admin-safeguard.test.mjs`.

**Public CV Stored-XSS Remediation (Phase G G-P0-01):** The public CV route
(`app/[personSlug]/[publicId]/page.tsx`) previously rendered JSON-LD via
`dangerouslySetInnerHTML` from raw `JSON.stringify`, letting a CV field containing
`</script>` terminate the script element. `app/lib/jsonld.ts` (`safeJsonLdScript()`)
escapes `<`, `>`, `&`, U+2028, U+2029 as `\uXXXX` JSON escapes — valid JSON, but the
literal sequence can never appear in the emitted HTML. `app/lib/safe-url.ts`
(`sanitizeExternalHref()`) allowlists `http:`/`https:`/`mailto:`/`tel:` for the one
other user-controlled `href` in that render path
(`resume.contact[].link` in `app/components/resume-renderer/ResumeRenderer.tsx`);
disallowed protocols render as plain text instead of a link. Two additional,
independent layers were added on top (CSP is defense-in-depth, not a substitute for
the fixes above): (1) a per-request nonce CSP (`script-src 'self' 'nonce-...'
'strict-dynamic'`) merged into the existing session-refresh `proxy.ts` (Next 16
renamed `middleware.ts` → `proxy.ts`; the two files conflict and cannot coexist);
(2) `app/lib/content-safety.ts` detects likely script-injection shapes (dangerous
tag names, event-handler attributes, `javascript:`/`data:` URIs in attribute
position) without flagging benign angle-bracket text (`Array<string>`, `5 < 10`),
and `app/lib/content-safety-audit.ts` logs matches from `saveResumeDraftDocument`
saves to a dedicated `content_safety_flags` table (migration
`20260713_content_safety_flags.sql`), surfaced read-only to staff in
`/admin/audit`. **Deliberately not logged to `admin_audit_logs`**: that table's
`actor_user_id` is `not null references profiles(id) on delete restrict`, which
would permanently block `DELETE /api/user/account` self-service deletion (GDPR
Art. 17) for any user who ever triggers a detection, including a false positive;
`content_safety_flags.user_id` uses `on delete cascade` instead, matching every
other content table per ADR 0016. The editor-facing inline "this value looks
unsafe" validator was scoped out and deferred to
[Phase O](docs/phases/phase-o-opencv-standard.md) (O02), so that ruleset is
designed once as part of the OpenCV standard rather than ad hoc in this app. Test
contracts: `tests/jsonld-safe-serializer.test.mjs`,
`tests/safe-url-protocol-allowlist.test.mjs`, `tests/content-safety-detector.test.mjs`,
`tests/content-safety-flags-migration.test.js`. Manual/E2E scenarios:
`docs/guides/test-scenarios/stored-xss-public-cv-jsonld/stored-xss-public-cv-jsonld.md`. See
[Phase G](docs/phases/phase-g-community-beta-testing.md) G-P0-01.

**Dependency Security Gate:** `js-yaml` pinned to `^4.3.0` (not the 5.x rewrite —
breaking schema/API changes across every `yaml.load`/`dump` call site for no
extra CVE coverage; 4.3.0 backports the merge-key fix). `next` pinned to
`^16.2.11` (bumped from `16.2.10` for GHSA-6gpp-xcg3-4w24 and related
high-severity advisories; `postcss` additionally forced to `^8.5.23` via
`overrides` since next's own dependency still resolved a vulnerable nested
copy). `public/vendor/js-yaml.min.js` is the browser copy used by the
editor/import UI (`app/dashboard/dashboard-client.tsx`,
`app/resume/resume-view-client.tsx`) — copy it from
`node_modules/js-yaml/dist/js-yaml.min.js` (plus its matching
`js-yaml.min.js.map`, so the `//# sourceMappingURL` directive it embeds
doesn't dangle) on every js-yaml bump, don't fetch from a CDN. `app/lib/user-data-transfer.ts` (`parseUserDataBundle`) is the
authenticated-user YAML import boundary: capped at 1MB
(`USER_DATA_BUNDLE_MAX_BYTES`) and 50 total merge keys
(`USER_DATA_BUNDLE_MAX_MERGE_KEYS`, well under js-yaml's own 10000 default) to
close the quadratic-complexity merge-key DoS (GHSA-h67p-54hq-rp68). The
`audit:prod` script (`npm audit --omit=dev --audit-level=high`) needs live
npm-registry access, so it's deliberately **not** part of `npm run
verify`/`npm run ci` (which stay lint+typecheck+test[+build], per
`.codex/runbooks/testing-and-validation.md` and `README.md`, and must keep
working offline/registry-restricted) — `.github/workflows/ci.yml` calls
`audit:prod` as its own step instead. Test contracts:
`tests/user-data-transfer.test.mjs` and `tests/vendor-js-yaml.test.mjs` both
use the advisory's actual repeated-alias shape — one anchor with K keys
referenced R times in a single merge list (`<<: [*base, *base, ...]`), so
total merge work is O(K·R) against O(K+R) source text — the second file runs
it against the real vendored bundle via `node:vm` (a separate artifact from
the npm package, so it needs its own proof it rejects the payload).

**Beta-Tester Opt-In + Role-Gated Docs Site (ADR 0020, extends ADR 0019):**
Sign-up has an optional "I'm joining as a beta-tester" checkbox →
`wantsBetaTestUser` → `POST /api/auth/signup` → Supabase signup `data`
(`wants_beta_test_user`) → `handle_new_auth_user()` sets `profiles.is_test_user`
at INSERT time only (`20260719000000_beta_tester_signup_optin.sql`; the
`profiles_guard_update` trigger is UPDATE-only, so this path is not blocked —
post-signup changes remain admin-only via the guarded RPCs). `SessionActor`
carries `isTestUser`. The in-app docs site (`/docs`, nav entry for all
authenticated users) renders git-committed Markdown from
`content/docs/{tutorials,test-scenarios}/*.md` via `app/lib/docs/`
(`content.ts` minimal frontmatter parser, `markdown.ts` = `marked` with raw-HTML
pass-through escaped, `access.ts` = `canViewTestScenarios(actor)` composing
`isTestUser` + the fail-open `beta_test_scenarios_visible` flag,
`20260719010000_beta_test_scenarios_flag.sql`, SQL-toggled per ADR 0018
precedent). Test Scenarios access is enforced server-side on
`/docs/test-scenarios/[slug]` (`notFound()`); nav visibility is UX only. Always
gate through `canViewTestScenarios`, never raw flag checks. **Admin bypass
(ADR 0021):** `canViewTestScenarios()` returns `true` unconditionally for
`isAdminRole(actor.role)` — before the test-user and flag checks; managers keep
the non-admin rule. **Docs shell:** every `/docs*` page renders through
`app/components/docs-layout.tsx` (client) — persistent grouped sidebar
(`listDocNavGroups(showTestScenarios)` from `content.ts`), category eyebrow
(`product-surface__eyebrow`) above the doc title, right-rail "On this page"
H2/H3 outline on detail pages only. `renderMarkdownWithOutline()`
(`app/lib/docs/markdown.ts`) returns `{ html, headings }` with heading `id`s
matching the outline slugs (deduped). Sidebar/rail collapse below the shared
`DESKTOP_NAVIGATION_BREAKPOINT_QUERY` exported from
`app-header-navigation.tsx` — import it, never redefine 980px. No scroll-spy,
search, or version switcher (deferred). Test contracts:
`tests/beta-tester-signup-optin.test.mjs`, `tests/beta-docs-feature-flag.test.mjs`,
`tests/beta-docs-site.test.mjs`, `tests/docs-layout.test.mjs`. See
[ADR 0020](docs/adr/0020-test-user-flag-gates-beta-docs-access.md) and
[ADR 0021](docs/adr/0021-admin-full-docs-visibility.md).

**Profile Privileged-Field Update Boundary:** `profiles` updates from an
authenticated session (not the service role) are restricted at the DB boundary
to an explicit safe-field allowlist — `role`, `is_active`, `is_test_user`, and
`is_ocv_staff` can only change through the guarded, audited RPCs
(`set_user_role`, `set_user_active`, `set_user_flag`), never a direct
`UPDATE profiles`. Migration `20260714000000_profile_privileged_update_boundary.sql`
introduces a `NOLOGIN` trigger-owner role
(`profile_privileged_rpc_owner`) so only those fixed-path RPCs can touch the
privileged columns. Test contract: `tests/guard-profile-update-contract.test.mjs`.

**Published CV Snapshot Detach-on-Delete Fix:** `prevent_published_cv_mutation()`
rejected every `UPDATE` on `resume_published_cvs` / `resume_published_cv_locales`
to keep snapshots immutable, but `ON DELETE SET NULL` foreign keys
(`preset_id`, `source_variant_id`, `source_document_id`, `source_revision_id`,
`created_by`) fire an `UPDATE` when the referenced row is deleted — so deleting
a preset, or an account under ADR 0016's cascade, aborted with "Published CV
snapshots are immutable." Migration `20260717000000_allow_snapshot_source_detach.sql`
narrows the trigger to permit an `UPDATE` only when it nulls out one or more of
those source-pointer columns; snapshot content (`yaml_content`, `selection`,
`locale`, `title`, ...) stays immutable. Test contracts:
`tests/preset-selection-locale-clamp.test.mjs`, `tests/cv-publication-schema.test.mjs`.

**Auth Boundary Hardening (G-P0-04, 2026-07-18):** Signup policy is enforced
**inside the database** via the `before_user_created` Auth Hook
(`public.hook_before_user_created`, migration
`20260718000000_auth_signup_policy_and_staff_mfa.sql`): login-restriction flag
+ `blocked_signup_email_domains` denylist apply even to direct Supabase Auth
API calls. The Disify external verifier is **disabled by default** (processor
governance M08) — `app/lib/disposable-email.ts` uses a local
`DISPOSABLE_EMAIL_DOMAINS` list kept in parity with the DB seed (contract test
enforces parity); `DISPOSABLE_EMAIL_CHECK_URL` re-enables an external verifier
only after processor assessment + privacy disclosure. **MFA/AAL2 for staff** is
enforced at the DB boundary: `public.assert_staff_aal2()` runs first in every
privileged RPC (`set_user_role`, `set_user_active`, `set_user_flag`,
`update_user_privileges`, `can_delete_user_account`) — staff with a verified
`auth.mfa_factors` row must present `aal=aal2` (always on); the
`staff_mfa_required` platform flag (seeded `false`) additionally makes MFA
mandatory for all staff once TOTP enrollment is done. `SessionActor.aal`
(decoded in `app/lib/auth-request.ts`) mirrors this app-side; the service-role
access-restriction toggle (`app/api/admin/access-restriction/route.ts`) checks
it explicitly because service-role writes bypass the DB gate. `/api/auth/*`
routes: per-IP in-memory rate limits (`getClientKey`/`rateLimitResponse`,
G-P0-05 tracks the distributed replacement), enumeration-safe generic
responses for signup/reset/resend, min password length 12
(`app/lib/auth-policy.ts`, mirrored in `supabase/config.toml`), and Turnstile
captcha pass-through (`withCaptcha` in `supabase-http.ts`; widget gated on
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` — never enable GoTrue captcha without it).
`supabase/config.toml` is **local-only**: production controls require manual
dashboard verification via
`docs/security/supabase-production-auth-checklist.md` (21 controls, all
unverified until ticked). Test contracts: `tests/auth-security-config.test.mjs`,
`tests/auth-signup-policy-hook.test.mjs`, `tests/staff-mfa-aal2-boundary.test.mjs`,
`tests/auth-endpoint-hardening.test.mjs`; live probes (env-gated):
`tests/integration/direct-supabase-auth.test.mjs`.

---

## ✅ Pre-Commit Checklist

Before pushing code:

- [ ] `npm run lint` passes (ESLint)
- [ ] `npm run typecheck` passes (TypeScript)
- [ ] `npm test` passes (Node tests)
- [ ] Code follows conventions above
- [ ] No hardcoded secrets/env vars
- [ ] Error handling included
- [ ] Zod validation for user input
- [ ] RLS policy unchanged (or Architecture-approved)
- [ ] Branch created fresh from main
- [ ] Commit message follows Conventional Commits
- [ ] If auth/admin changes: role boundaries verified
- [ ] If YAML changes: EN/PL parity checked
- [ ] If database changes: migration documented
- [ ] Critical flows validated if touched (see Testing & Validation section)

**If any check fails:** Don't commit. Fix the issue or ask Claude for help.

---

## 🎓 Learning Resources

- **Supabase Docs:** https://supabase.com/docs
- **Next.js App Router:** https://nextjs.org/docs/app
- **Zod Validation:** https://zod.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Project Docs:** `docs/` folder (especially STATUS.md, ADRs)
- **Team Discipline:** `.codex/instructions.md`

---

## 🚨 High-Risk Areas (Extra Caution)

### RLS & Security
- **File:** `supabase/migrations/`
- **Risk:** Weakening row-level security policies
- **Action:** Always ask Backend Engineer before modifying

### Auth & Session
- **File:** `app/lib/auth-request.ts`, `app/lib/auth-server.ts`, `app/lib/auth-cookies.ts`, `app/api/auth/`
- **Risk:** JWT expiry, cookie handling, role verification
- **Action:** Run full test suite; manual QA of login/logout flows

### YAML Schema Changes
- **File:** `app/lib/resume-schema.ts`, RPC validation
- **Risk:** Breaking both EN and PL documents
- **Action:** Update PL/EN consistently; test with sample data

### Public Route Changes
- **File:** `app/[person-slug]/[public-id]/page.tsx`
- **Risk:** Breaking public links, SEO regressions
- **Action:** Test canonical URL + compatibility redirects; validate og:tags

---

## 💡 Session Notes (Update Before Working)

**Current Focus:** [What are you building this session?]
- Example: "Exposing Saved Versions panel in editor (Phase E)"

**Expected Changes:** [What files will be modified?]
- Example: "app/master-resume/editor-canvas-client.tsx + new API route"

**Token Budget:** [Estimate for this session]
- Example: "50k tokens max (Haiku-heavy for implementation)"

**Known Risks:** [Anything to watch for?]
- Example: "Must not break existing publish/rollback flow in Phase D"

---

**Status:** Production-ready (merged with .codex/instructions.md)  
**Last Review:** July 2026  
**Next Update:** See [docs/STATUS.md](docs/STATUS.md) for current phase and next milestones
