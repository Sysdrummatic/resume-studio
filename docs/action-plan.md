# Action Plan

Cross-referenced fix log for work items tracked outside the phase documents.
Phase status lives in [STATUS.md](STATUS.md); security risks in
[security/security-and-risk-plan.md](security/security-and-risk-plan.md).

## Phase G fixes

### 2026-07-15 — Published CV export endpoints ignored Saved Version selection (R09)

- **Problem:** `fetchPublishedResumeExportByPublicLink` returned the stored
  snapshot `yaml_content` (full Master Resume) verbatim, while the public web
  view applied the saved-version selection. PDF, ATS `.txt`, ATS `.yaml`,
  CVasCode, and the public OpenCV API v1 all leaked excluded master content.
- **Fix:** the export resolver applies the same selection as the web view via
  `buildPublishedExportYamlContent` (`app/lib/resume-server.ts`), backed by the
  pure, runtime-tested selection core in `app/lib/preset-selection.ts`.
- **Contract:** per ADR 0008, "raw" export means no ATS transformations — the
  saved-version selection is always applied; unselected master content is never
  exposed. See ADR 0008 clarification and risk R09.
- **Tests:** `tests/resume-export-contract.test.mjs`,
  `tests/adr-0008-opencv-public-api-contract.test.mjs`.
