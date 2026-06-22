# OpenCiVera — Project Status

**Last Updated:** 2026-06-19
**Current Phase:** I — Hardening, QA & Launch Readiness
**Overall Progress:** ~70% (A–D, G complete; E 95%; I 60%; F, H, J–M pending)

---

## Phase Progress

| Phase | Name | Status | % | ETA |
|-------|------|--------|---|-----|
| A | Platform Foundation | ✅ Complete | 100% | Apr 2026 |
| B | YAML Data Layer | ✅ Complete | 100% | Apr 2026 |
| C | Auth, RBAC & Admin | ✅ Complete | 100% | May 2026 |
| D | Editor Canvas | ✅ Complete | 100% | May 2026 |
| E | Public Surface & MVP Launch | ✅ Technical complete, ⚠️ launch prep pending | 95% | May–Jun 2026 |
| F | Community Beta Testing | ⏳ Planned | 0% | After E launch prep |
| G | UX & Community | ✅ Complete (delivered early) | 100% | May 2026 |
| H | PDF Fidelity — Vercel + Puppeteer | ⏳ Planned | 0% | Jun–Jul 2026 |
| I | Hardening, QA & Launch Readiness | 🔄 Active | 60% | Jun 2026 |
| J | AI & Ecosystem | ⏳ Post-launch | 0% | Q3 2026 |
| K | ATS Intelligence | ⏳ Post-launch | 0% | TBD |
| L | Semantic Public Link URL | ⏳ Post-launch | 0% | TBD |
| M | Professional Identity Platform | ✦ Vision | 0% | 2027+ |

---

## Phase Dependency Graph

```
A → B → C → D → E ──┬── F (Beta Testing)
                     ├── G → H (PDF Fidelity)
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

**Also pending (Phase E launch prep):**
- [ ] Founder's demo CV published as live example
- [ ] Beta tester recruitment (5 initial testers for Phase F)

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
| Phase K plan | [`docs/guides/phase-k-ats-intelligence-plan.md`](guides/phase-k-ats-intelligence-plan.md) |
| Phase L plan | [`docs/guides/phase-l-semantic-url-plan.md`](guides/phase-l-semantic-url-plan.md) |
| New phase template | [`docs/support/PHASE_TEMPLATE.md`](support/PHASE_TEMPLATE.md) |
