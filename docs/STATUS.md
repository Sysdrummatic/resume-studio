# OpenCiVera — Project Status

**Last Updated:** 2026-07-03
**Current Phase:** I — Hardening, QA & Launch Readiness
**Overall Progress:** ~72% (A–F complete; I 60%; G, H, J–M pending)

---

## Phase Progress

| Phase | Name | Status | % | ETA |
|-------|------|--------|---|-----|
| A | Platform Foundation | ✅ Complete | 100% | Apr 2026 |
| B | YAML Data Layer | ✅ Complete | 100% | Apr 2026 |
| C | Auth, RBAC & Admin | ✅ Complete | 100% | May 2026 |
| D | Editor Canvas | ✅ Complete | 100% | May 2026 |
| E | UX & Community | ✅ Complete (delivered early) | 100% | May 2026 |
| F | Public Surface & MVP Launch | ✅ Complete (closed 2026-07-03) | 100% | May–Jun 2026 |
| G | Community Beta Testing | ⏳ Planned (incl. recruitment of 5 beta testers, moved from F) | 0% | After I |
| H | PDF Fidelity — Vercel + Puppeteer | ⏳ Planned | 0% | Jun–Jul 2026 |
| I | Hardening, QA & Launch Readiness | 🔄 Active | 60% | Jun 2026 |
| J | AI & Ecosystem | ⏳ Post-launch | 0% | Q3 2026 |
| K | ATS Intelligence | ⏳ Post-launch | 0% | TBD |
| L | Semantic Public Link URL | ⏳ Post-launch | 0% | TBD |
| M | Professional Identity Platform | ✦ Vision | 0% | 2027+ |

---

## Phase Dependency Graph

```
A → B → C → D → E ──┬── F (Public Surface) ── G (Beta Testing)
                     └── H (PDF Fidelity)
                             └── I (Hardening & Launch)
                                     ├── J (AI) → M (Vision)
                                     └── K (ATS) → L (Semantic URL)
```

---

## Active Sprint: Phase I — Remaining Items

**Completed:**
- [x] Local CI gates green (lint / typecheck / test / build — 187 tests ✓)
- [x] Privacy Policy page, Terms of Service page
- [x] Self-service account deletion (GDPR Art. 17)
- [x] Last-admin deletion safeguard (DB trigger + API guard)
- [x] PDF rendering module (ADR 0014) + draft feature flag

**Pending — Deploy QA:**
- [ ] Apply `20260610_pdf_feature_flags.sql` to production (`supabase db push`)
- [ ] Preview deploy QA complete
- [ ] Production deploy QA complete
- [ ] Auth smoke checks (sign-up, sign-in, reset, verify)
- [ ] Protected route smoke checks
- [ ] Admin panel and audit smoke checks
- [ ] Editor publish / rollback smoke checks
- [ ] Legacy redirect verification (`*.html` routes)

**Pending — Release:**
- [ ] E2E regression suite for critical paths
- [ ] Performance and accessibility checks
- [ ] Security controls and RLS policy validation
- [ ] Observability dashboards and alerting configured
- [ ] Release checklist and rollback playbook prepared
- [ ] Production smoke test protocol executed

---

## Reference

| What | Where |
|------|-------|
| Phase details | [`docs/phases/phase-*.md`](phases/) |
| Architecture decisions (ADRs) | [`docs/adr/`](adr/) |
| Dev setup & patterns | [`docs/guides/development/`](guides/development/) |
| Testing & QA checklists | [`docs/guides/testing/`](guides/testing/) |
| Policy documents | [`docs/guides/policies/`](guides/policies/) |
| Future features | [`docs/guides/features/`](guides/features/) |
| Phase K plan | [`docs/phases/phase-k-ats-intelligence-plan.md`](phases/phase-k-ats-intelligence-plan.md) |
| Phase L plan | [`docs/phases/phase-l-semantic-url-plan.md`](phases/phase-l-semantic-url-plan.md) |
| New phase template | [`docs/support/PHASE_TEMPLATE.md`](support/PHASE_TEMPLATE.md) |
