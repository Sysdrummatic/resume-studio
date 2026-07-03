# Changelog

All notable changes to this project are documented in this file, grouped by
year, month, and day. See [docs/adr](docs/adr/README.md) for the architectural
reasoning behind larger changes.

## 2026

### June

#### 2026-06-30

- **feat:** Master Resume editor language versions now live as tabs in-place,
  instead of a page-header switcher. The YAML Editor pane shows a tab strip
  above the textarea (`"{Language} (default)"` for the default locale), and the
  Human-Friendly Editor shows a compact `[CODE] [edit]` row above the "Core"
  section. Both surfaces share one in-memory state, so switching tabs never
  discards unsaved edits in another language version.
- **feat:** All of a user's configured language versions load into memory at
  editor start, each as an independent buffer (parsed resume + raw YAML + dirty
  flag), via the new `useMultiLocaleResumeDocuments` hook
  (`app/master-resume/use-multi-locale-resume-documents.ts`).
- **feat:** A single `[Languages]` button (next to "Download YAML") and the HFE
  `[edit]` button both open the same language-version management modal,
  extracted to `app/master-resume/language-version-modal.tsx`.
- **feat:** "Save MasterCV" and "Save unpublished" now save every language
  version with unsaved changes in one click (not just the active tab), with
  partial-success/failure reporting in the status toast.
- **fix:** Rollback to a prior revision and HFE field edits no longer race —
  rollback now guards against overwriting edits made to the same locale while
  the rollback request was in flight, and HFE inputs are disabled while a
  save/rollback is in progress.
- **fix:** A failed per-locale document fetch during editor bootstrap (expired
  token, RLS denial, transient server error) no longer silently falls back to a
  blank document; the affected language version is marked as failed-to-load and
  excluded from "Save MasterCV" until the page is reloaded.
- **docs:** Added [ADR 0017](docs/adr/0017-multi-locale-master-resume-editor-tabs.md)
  documenting the multi-locale buffer architecture and the decisions above.
- **refactor:** Removed the page-header locale switcher
  (`.resume-editor-shell__locale-switch`) from `editor-canvas-client.tsx`; its
  responsibility moved entirely into the new `LocaleTabStrip` component.
