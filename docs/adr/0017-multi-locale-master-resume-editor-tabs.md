# ADR 0017: Multi-Locale Master Resume Editor Tabs

Status: Accepted

Date: 2026-06-30

Extends: [ADR 0006](0006-saved-version-language-ux-contract.md)

## Context

The Master Resume editor (`app/master-resume/editor-canvas-client.tsx`) held exactly one
in-memory document buffer (`resume` + `yamlPanel`) at a time. Switching the active
language version called `GET /api/resume/document?locale=...` and wholesale-replaced
that buffer, silently discarding any unsaved edits in the locale being left. The
language switcher itself lived in the page header as a row of short-label buttons
(e.g. "EN", "PL") plus a single "+" trigger for an "Add language version" modal —
disconnected from both the YAML Editor and the Human-Friendly Editor (HFE) panes.

The product ask was to make language-version management feel native to each editor
surface: a tab strip with the full language name (plus a `(default)` suffix on
whichever locale is flagged default) directly above the YAML textarea, a matching
compact `[CODE] [edit]` row above the HFE "Core" section, and a `[Languages]` trigger
next to "Download YAML" — all driving the same underlying language-version CRUD
(`/api/resume/languages`, unchanged) and document APIs (`/api/resume/document`,
`/api/resume/publish`, `/api/resume/rollback`, unchanged).

## Decision

- **All of a user's language versions load into memory at once**, each as an
  independent buffer (parsed `resume`, raw `yamlPanel`, dirty flag, per-locale
  error state) owned by a new hook,
  `app/master-resume/use-multi-locale-resume-documents.ts`. Switching the active
  locale tab is a pure client-side state swap — it never re-fetches and never
  discards unsaved edits in another locale.
- **The page-header locale switcher is removed.** Locale switching now lives only
  as a `<LocaleTabStrip>` (`app/master-resume/locale-tab-strip.tsx`) rendered twice:
  full tabs (`"{label}"` / `"{label} (default)"`) above the YAML textarea, and a
  compact `[CODE] [CODE] [edit]` row above the HFE "Core" section. Both read from
  the same hook state, so the two panes can never disagree about which locale is
  active or which locales are dirty.
- **One shared language-version modal**, extracted to
  `app/master-resume/language-version-modal.tsx`, is opened from two trigger
  points — the `[Languages]` button next to "Download YAML" in the YAML pane, and
  the `[edit]` button in the HFE locale row. CRUD behavior (create/edit/set
  default/delete) is unchanged from the prior inline implementation.
- **"Save MasterCV" / "Save unpublished" save every dirty locale in one click**,
  not just the active tab. The hook's `saveAllDirty()` fires one
  `POST /api/resume/publish` per dirty locale (always including the active locale,
  even if not dirty, to preserve the pre-existing "always (re)publish current tab"
  behavior) via `Promise.allSettled`, and reports partial success/failure back to
  the toast (e.g. "Saved 2, failed 1: pl: ..."). A snapshot guard ensures a locale
  edited again while its save request is in flight does not have its dirty flag
  incorrectly cleared.
- **"Load template" and "Download YAML" remain scoped to the active tab only** —
  multi-locale loading does not change their semantics.
- **Bootstrap failure isolation**: if the per-locale `GET /api/resume/document`
  call fails for one language among several (expired token, RLS denial, transient
  5xx), that locale's buffer is marked `loadFailed: true` with a surfaced
  `saveError` instead of silently falling back to a blank document. `saveAllDirty`
  refuses to publish over a `loadFailed` buffer, preventing a transient fetch
  failure from silently overwriting a user's previously-saved content with an
  empty document.
- **Rollback** (`rollbackActiveToRevision`) uses the same yamlPanel-snapshot guard
  as save, so a rollback response arriving after the user has already resumed
  editing the same locale does not clobber the new edits. The HFE form fields are
  also wrapped in a `<fieldset disabled={isBusy}>` so they cannot be edited while a
  save or rollback request is in flight.

## Consequences

- Users can freely explore/edit multiple language versions in one editing session
  without losing work when switching tabs — the core UX goal of this change.
- Editor bootstrap cost increases from one document fetch to N (one per
  configured language) parallel fetches; acceptable for the realistic locale
  counts this product supports (a handful), revisit only if someone configures
  many (10+) language versions.
- `editor-canvas-client.tsx` shrinks from owning single-document state directly to
  consuming a dedicated hook; the ~15 Human-Friendly-Editor field-update functions
  (`updateContact`, `updateSkill`, `updateExperience`, etc.) were left mechanically
  unchanged, only their write target moved from local `useState` to the hook's
  `updateActiveResume`.
- No backend/API/schema changes were required — `GET /api/resume/languages?withDocuments=true`
  already returned each locale's full `yaml_content`, and
  `POST /api/resume/languages` already returned the newly-created locale's blank
  document + revisions in the same response, so bootstrapping and "add language"
  both avoid any N+1 round-trip beyond the per-locale document fetch.

## Implementation Checklist

- [x] `useMultiLocaleResumeDocuments` hook: bootstrap all locale buffers, dirty
      tracking, YAML↔resume sync scoped to the active tab, save-all-dirty,
      rollback, language CRUD.
- [x] `LocaleTabStrip` shared component (yaml/human variants) replaces the
      page-header locale switcher.
- [x] `LanguageVersionModal` extracted, triggered from both the YAML pane and HFE.
- [x] "Save MasterCV"/"Save unpublished" save all dirty locales with
      partial-failure reporting.
- [x] Per-locale bootstrap fetch failures isolated (`loadFailed`), excluded from
      save targets.
- [x] Rollback and HFE inputs guarded against in-flight-request races.
- [x] Test contracts (`tests/language-versions-interface.test.mjs`,
      `tests/phase-d-editor-implementation.test.js`, `tests/status-toast.test.mjs`)
      updated to point at the new file locations for relocated logic.
