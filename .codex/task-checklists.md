# Task Checklists (OpenCiVera)

Use these checklists while implementing changes. Copy the relevant section into your task description and mark items as you go.

---

## Checklist: General PR hygiene

- Scope is explicit; out-of-scope is explicit.
- Rollout/rollback plan exists (even if it is “revert this PR”).
- No secrets added to repo; env vars documented if needed.
- Docs updated if behavior/workflow changed.

---

## Checklist: Testing + validation (mandatory at task completion)

- `npm run lint`
- `npm run typecheck`
- `npm test`
- If any command cannot be run locally, record why and what was run instead.

---

## Checklist: Auth/session changes (Next.js)

- Sign up (if applicable) and confirm verification email behavior.
- Sign in requires verified email (expected: block unverified).
- Inactive accounts are blocked.
- Session refresh path works (`/api/auth/session`).
- Protected routes redirect correctly when unauthenticated.
- Admin/staff routes enforce role boundaries.

---

## Checklist: Supabase / RLS / RPC changes

- Migration is a new file (no editing of previously applied migrations for prod-like envs).
- RLS is not weakened; policies are least-privilege.
- `security definer` functions are justified, minimal, and have safe `search_path`.
- RPC functions validate inputs and enforce roles.
- Rollback guidance exists (new rollback migration if needed).
- Impact on existing data is documented.

---

## Checklist: YAML contract / i18n changes

- EN/PL keys and section ordering stay aligned.
- `data/public/locales.yaml` remains valid and points to existing files.
- Legacy renderer (`scripts/main.js` + `scripts/public-resume.js`) renders both locales correctly.
- If Next renderer consumes the YAML too, parity expectations are documented.
- Contract tests updated (`scripts/phase-b/resume-yaml-contract.js` and/or `tests/`).

---

## Checklist: Public resume / SEO (Phase E)

- `/r/[slug]` handles:
  - active slug -> renders
  - missing slug -> 404
  - inactive slug -> 404 or explicit “unavailable”
- `allow_indexing` drives robots meta and any headers as designed.
- Canonical URL is correct.
- Structured data (if added) is valid and stable.
- Sitemap/robots strategy is documented.

