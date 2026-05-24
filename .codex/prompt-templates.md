# Prompt Templates (OpenCiVera)

Use these templates to start new tasks. They are designed to keep scope small, follow the repo plans, and enforce validation and rollback discipline.

---

## Template: Small change (docs / minor refactor)

**Title**
`[CHANGE] <short name> (scope <area>)`

**Goal**
- Primary outcome:
- Non-goals:

**Scope**
- Files/directories:
- Out of scope:

**Definition of Done**
- `npm run lint`
- `npm run typecheck`
- `npm test`

**Instructions to Codex**
- Use `update_plan` and keep it current.
- If current branch is `master`/`main`, create a new branch before changing files.

---

## Template: Phase E slice (public resume: `/r/[slug]`)

**Title**
`[CHANGE] Phase E: public resume by slug (route /r/[slug])`

**Sources of truth (must consult)**
- `docs/guides/saas-transition-work-plan.md`
- `.codex/site-map-and-dependencies.md`
- `docs/guides/deployment-qa.md`

**Goal**
- Implement SSR/ISR rendering for `/r/[slug]` using `resume_public_links` + `resume_documents`.
- Enforce `allow_indexing` behavior in robots/meta.

**Non-goals (out of scope)**
- Do not migrate legacy HTML pages.
- Do not change YAML schema unless explicitly required (and then update both EN/PL + validation).

**Scope**
- `app/r/[slug]/page.tsx` (+ supporting `app/lib/*` helpers as needed)
- SEO metadata (`Metadata` / `generateMetadata`)
- Optional: `robots.txt` / sitemap strategy, but keep it minimal and aligned with Phase E plan.

**Definition of Done**
- Automated: `npm run lint`, `npm run typecheck`, `npm test`
- Manual QA:
  - Open `/r/<slug>` for an active public link.
  - Verify 404/“not found” for inactive/missing slug.
  - Verify robots meta toggles with `allow_indexing`.
  - Verify EN/PL locale selection rules (documented behavior).

**Rollout / rollback**
- Define safe rollout (feature flag or staged route enablement) if behavior could regress SEO.
- Provide rollback steps (revert PR + confirm legacy redirects still work).

---

## Template: Supabase migration change (schema/RLS/RPC)

**Title**
`[CHANGE] Supabase migration: <what> (Phase <X>)`

**Sources of truth (must consult)**
- `docs/guides/phase-c-supabase-schema-setup.md` (if relevant)
- `docs/guides/phase-b-yaml-data-layer.md` / `docs/guides/phase-c-auth-rbac-admin.md` (as applicable)

**Goal**
- What is changing (tables, policies, functions) and why:

**Non-goals**
- No destructive changes without explicit rollback plan.

**Scope**
- New migration file under `supabase/migrations/` (do not edit already-applied migrations for production environments).
- Frontend/backend changes needed to match the contract.

**Definition of Done**
- Automated: `npm test` (migration-related tests) + `npm run lint` + `npm run typecheck`
- Documentation:
  - Update the relevant guide(s) and describe impact.

**Rollback / safety**
- Add rollback notes (new rollback migration if needed).
- Call out data migration risk and how to back up before apply.

---

## Template: YAML contract change (public locale data)

**Title**
`[CHANGE] YAML contract: <field/key change> (public data)`

**Sources of truth (must consult)**
- `data/public/locales.yaml`
- `scripts/phase-b/resume-yaml-contract.js`
- `.codex/site-map-and-dependencies.md`

**Goal**
- Define the new/changed key(s) and how they render.

**Scope**
- Update both `data/public/resume-en.yaml` and `data/public/resume-pl.yaml` consistently.
- Update any configs under `data/public/config/*` if labels are needed.
- Update validators/tests that enforce the contract.

**Definition of Done**
- Automated: `npm test`
- Manual QA:
  - Load `resume.html` and verify EN/PL parity + rendering.

