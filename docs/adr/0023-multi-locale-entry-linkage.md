# ADR 0023: Linked Master Resume Language Entries

Status: Superseded by [ADR 0024](0024-language-versions-as-parallel-lists.md) (the `entry_id`/`__ocv` mechanism; the compare-and-swap rules in §8-9 still apply)
Date: 2026-09-19

## Context

Master Resume documents are stored separately for each locale. Previously a new
locale received an empty document, repeated entries had no cross-locale identity,
and `summary[].default` was local to one YAML document. This allowed a translated
document to lose an experience or to select a different default role than the
default-language document.

## Decision

1. The user's default language owns the canonical inventory and ordering of
   repeatable CV entries. Non-default locales may translate those entries but may
   not add or remove independent records.
2. Repeatable records receive a private `entry_id` shared by all locales. String
   lists use the private `__ocv.entries` metadata map. These fields remain in
   private Master Resume YAML and transfer bundles, but are removed from public
   OpenCV exports.
3. Creating a locale clones the default-language structure. Translation fields are
   blank; neutral fields such as company, period, school and year are retained.
   Blank linked slots remain visible in the editor but are omitted by rendering.
   A published CV version therefore never selects them: for a translated
   locale, selection keeps only linked entries with translated content;
   company/period, school/period and year alone do not make a linked entry
   publishable. The public page and exports apply the same rule to older
   snapshots, while source-document and unlinked legacy entries keep their
   existing rendering behavior. The source document, not the public CV's
   selectable default language, identifies a translated snapshot locale.
   If the selected
   summary is blank or absent in that language, publication is refused; it never
   substitutes an unselected summary. The public resolver also rejects older
   snapshots whose selected summary has no text (ADR 0008).
4. Saving the default locale reconciles every other locale: missing slots are
   created, removed canonical slots disappear, neutral fields and ordering follow
   the default, and the default summary entry is mirrored by `entry_id`.
5. Saving a non-default locale reconciles it against the current default, so a
   linked record cannot be removed through the YAML editor or a stale client.
   The editor also disables structural add/remove controls outside the default
   locale and shows a linkage status panel. Changed, missing or duplicate IDs
   block saving and are reported with the affected YAML collection and index.
6. The server treats IDs as immutable linkage metadata. A complete existing
   document must keep its IDs stable; legacy documents receive a one-time ID
   upgrade. The default locale may intentionally add or remove records, while
   non-default locales must have exactly the same ID set as the default.
   Every save of the default (publish, draft, import), including its first save
   and a legacy one, rejects an ID used twice in a collection or in
   `__ocv.entries` with `409 { linkageIssues: [duplicate-id] }` before anything
   is written; saving unique IDs repairs a stored document with duplicates.
   A stored default that already reuses an ID (possible after older code) is
   never the canonical side of a reconciliation and is never renumbered
   automatically: a translation save, a default switch and an import without
   its own default document are refused with `409 { code:
   "default-duplicate-ids", linkageIssues }` before anything is written, until
   the user saves the default with unique IDs (or imports a complete, consistent
   bundle that replaces it; a default switch skips the documents an import
   replaces but checks every document it will synchronize).
   The repair never re-pairs by ID alone: a translation whose stored rows share
   an ID is left unchanged by the sync and reported as `duplicate-ids`
   (a switch or import that would synchronize it is refused with
   `409 { code: "duplicate-ids" }` before any write). The user then gives the
   translation's entries the default's IDs in YAML and saves it, which is an
   explicit mapping; a translation save that reuses an ID is refused.
7. Legacy documents without IDs are paired by existing position during their
   first reconciliation, then retain generated IDs. Public snapshots continue to
   use the existing numeric selection contract after locale reconciliation.
   A document is legacy only when it has neither `__ocv` metadata nor any
   `entry_id`. Its IDs are derived from the position (`legacy-<collection>-<index>`),
   so the editor, a save, the language sync and a default switch, which each
   parse it independently, produce IDs that pair. A legacy translation takes the
   canonical IDs at the same positions, including `tech_stack` and `interests`.
   A missing ID in an already linked document is never guessed from its position,
   and ID-less content that replaces an already linked document (a template
   reset, pasted YAML) gets fresh random IDs, so the stored position-derived IDs
   are never reused for different entries.
   **Positions are trusted only when they are proven** (amended 2026-09-27).
   For every non-empty collection of a legacy translation
   (`findLegacyPairingConflicts`):
   - the count must equal the default's, otherwise `count`;
   - every entry, a single one included, needs a key that identifies it in every
     language:
     company + start year (`experience`), school + start year (`education`),
     the value (`contact`, `qr_codes`) or the exact text (`tech_stack`,
     `interests`). When all keys are present, unique and equal at every
     position, the collection pairs. When a key appears in both lists at
     different positions, it is `order` (for example Alpha/Beta both starting in
     2020 but swapped). When neutral keys (company/school + year, contact or QR
     value) differ at a position, it is `mismatch`: those fields are the same in
     every language, so the entry is a different one. Anything else is
     `ambiguous`: a missing start year, duplicate keys, a translated text key,
     or a collection with no comparable field (`summary`, `skills`,
     `languages`, `courses`), even with a single entry.
   Any conflict stops the automatic migration, and both documents stay unchanged
   (on a default save only the user's own default document is written). §4's
   "removed canonical slots disappear" never applies to unlinked legacy content.
   The check runs on the content, not on IDs, whenever the stored translation is
   still legacy, because the editor gives a legacy document position-derived
   `legacy-...` IDs that prove nothing. After the check passes, those IDs are
   dropped and the rows take the canonical IDs by position before reconciliation,
   so the translation is kept even when the default already uses UUIDs. A
   translation that is already linked is never re-mapped by position. In the
   editor, a stored legacy translation is not blocked by its own IDs (the server
   decides), and after the save the editor adopts the stored canonical IDs.

   **Resolution.** The sync reports `legacy-pairing` for the locale. A save,
   a default switch or an import returns `409 { code: "legacy-pairing",
   legacyConflicts }`, which the editor shows from its EN/PL dictionaries.
   - `ambiguous`: the user can confirm that the collections are in the same order.
     The editor asks, then resends the save with `confirmLegacyPairing: true`.
     That confirmation is the explicit, user-approved mapping.
   - `count`, `order` and `mismatch` cannot be confirmed: the user makes the translation's
     entries match the default (for example by reordering them in YAML) and saves
     again.
   - A data import replaces stored documents with its own linked content, so it
     skips the check and the sync for the locales it replaces.

8. Concurrent saves never overwrite silently. Every write to `resume_documents`
   is a compare-and-swap on `updated_at` (bumped by the `touch_updated_at`
   trigger). The editor sends the `baseUpdatedAt` it edited; a stale base or a
   write that loses the race returns `409 { conflict: true }` and nothing is
   written. The default-language sync re-reads and reconciles a translation that
   changed under it, since reconciliation keeps translated text. The editor saves
   translations before the default and adopts a synchronized translation only
   when the sync started from the version it holds (`synchronizedDocuments`);
   a translation the sync could not update is reported as a failed save.
   A failed read is never read as "nothing to do": if the translations cannot
   be listed the response says `synchronizationComplete: false`, and a failed
   re-read after a lost compare-and-swap reports that locale with reason `read`.
9. Steps after the `resume_documents` write are recoverable, not atomic: the
   revision, the profile-name sync and the public-identity refresh run after the
   document is stored. If one fails, `POST /api/resume/publish` answers
   `500 { saved: true, document, incomplete: [...] }`; the editor takes
   `document` as its new base, keeps the language dirty and shows a localized
   "save again to finish" message. A retry is idempotent: an unchanged document
   is not written again, and a revision is recorded only when the latest one
   does not already hold the same content and title. The same rule completes a
   sync revision whose translation YAML was written but whose
   `create_resume_revision` call failed. Consequences: saving an unchanged
   language no longer adds a duplicate revision or bumps `updated_at`, and a
   translation last written without a revision (a draft save or an import) gets
   a "Synchronized with default language" revision on the next default save.
   A failed profile read counts as an incomplete `profile` step; a missing
   profile and manual name-sync mode do not.
   Making these steps atomic would need a new database function; deferred.

## Consequences

- A user can prepare a translation gradually without losing the experience,
  summary or education slots that exist in the default language.
- Switching the default language triggers the same reconciliation against the
  newly selected canonical document.
- Private YAML gains implementation metadata; public exports do not expose it.
- YAML editing exposes IDs for diagnostics, but the save action and API reject
  changed, missing or duplicate IDs in an already linked language version.
- Application-level reconciliation updates several locale documents and creates
  revision entries. A future structured content store may replace this YAML
  metadata without changing the user-facing contract.

## Manual publication check

1. In the source language, select two work entries for one CV version. Translate
   only the first entry in a second language; leave the other linked slot blank.
   Confirm the editor still offers both slots while its CV preview shows only
   the translated entry.
2. Publish both languages. Check the public page, PDF, ATS text/YAML and CVasCode
   in each language: the source retains both selected entries; the translation
   contains only the translated entry. Repeat with the translated language set
   as the public CV's default; it must not become the source document.
3. Clear the selected summary in the translation while leaving a different,
   unselected summary translated. Publication must fail without changing the
   existing public snapshot, profile or saved per-language selections.

## Implementation

- Linkage helpers: `app/lib/resume-language-linkage.ts`
- Locale creation and reconciliation: `app/lib/resume-server.ts`
- Editor protections and default-summary behavior:
  `app/master-resume/editor-canvas-client.tsx`
- Private metadata normalization and public stripping:
  `app/lib/resume-schema.ts`, `app/lib/published-export.ts`
- Behavioral contract tests: `tests/resume-language-linkage.test.mjs`,
  `tests/resume-language-legacy-linkage.test.mjs`,
  `tests/resume-language-save-race.test.mjs`, `tests/locale-save-plan.test.mjs`,
  `tests/resume-save-partial-failure.test.mjs`, and the isolated editor browser
  check `tests/editor-save-retry-browser.test.mjs` (`EDITOR_BROWSER_TEST=1`),
  `tests/publish-blank-linked-slots.test.mjs`, and
  `tests/publish-locale-preflight.test.mjs`
- Editor save order and sync adoption: `app/master-resume/locale-save-plan.ts`,
  `app/master-resume/use-multi-locale-resume-documents.ts`
- Data import (ADR 0018): `importLanguagesAndDocuments` in `app/lib/resume-server.ts`
  registers the bundle's languages without changing the default, saves the
  bundle's default-language document as the canonical one (`asDefault`), switches
  the default, and only then saves the other documents. Switching the default
  requires that language's document to exist, and a document is reconciled
  against the current default, so any other order fails or blanks the imported
  translation. Before its first write, an import (and every default switch)
  plans the canonical document in memory: the bundle's default, or the stored
  new default; a stored new default that is still legacy takes its IDs by
  position from the current default, which is then an ID source and may be
  neither replaced by the import (`409 { code: "default-document-required" }`)
  nor broken. Every bundle translation and every stored document the new
  canonical document would synchronize is checked against it (duplicates,
  legacy pairing, linked IDs), and an import is refused when a stored
  translation outside the bundle would lose translated entries
  (`409 { code: "translations-would-be-lost" }`). A refused import writes
  nothing, languages included. The bundle only has to be internally consistent: before anything
  is written, the bundle's default must not reuse an ID within a collection
  (including `__ocv.entries`), and every bundle translation that carries IDs must pair with the
  bundle's default (otherwise `409 { linkageIssues }`), and the bundle's default
  may then replace the stored default with different IDs; the edit-time ID
  stability check still guards every ordinary save. Outside import, a new or
  legacy-stored translation that carries its own IDs must pair with the default
  by ID too, instead of being reconciled into blank slots.
  Regression: `tests/import-default-language-switch.test.mjs`.
