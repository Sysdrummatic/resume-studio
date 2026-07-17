# ADR 0009: Publish Atomic Variant Fallback

## Status
Accepted

## Context
A **500 Internal Server Error** occurred when users tried to publish a resume preset that included multiple languages, especially when some languages did not have an explicit entry in `resume_preset_variants`. 

The root cause was identified in the `publish_resume_saved_version` RPC function, which enforced a strict check requiring all selected locales to have explicit variant records. Since `saveResumePreset` only creates variants for the active locale, any preset saved in one language would fail to publish if other languages were selected.

## Decision
1.  **Relax Validation**: Remove the strict requirement for explicit variant records in the database RPC.
2.  **Fallback Logic**: Implement a fallback mechanism in the publication snapshot query. If a variant record is missing for a selected locale, the system will use the base selection from the `resume_presets` table for the corresponding document.
3.  **Descriptive Errors**: Update the API route and server-side logic to propagate specific PostgreSQL exceptions back to the client, converting generic 500 errors into actionable 400/500 errors with context.

## Consequences
- **Robustness**: Publishing works even for partially configured presets.
- **Improved UX**: Users see clear error messages if validation fails (e.g., invalid YAML).
- **Reduced State Bloat**: We no longer need to ensure variant records exist for every possible language-preset combination before publishing.

## Implementation Checklist

- [x] Relax validation in `publish_resume_saved_version` RPC to allow missing variants.
- [x] Implement fallback logic to base selection in `resume_published_cv_locales` snapshot.
- [x] Propagate descriptive PostgreSQL exceptions through `publishResumePreset` and the API route.

## Amendment (2026-07-17): Clamp the fallback selection per locale

The base-selection fallback assumed every locale document mirrors the
default-locale array shapes. When a locale document has fewer entries (e.g. a
freshly created language version), the snapshot stored a selection with
out-of-range indexes that `applyResumeSelectionToRawDocument` can never apply,
so the public route returned 404 for that language and the dashboard preview
showed a render error.

`publishResumePreset` now materializes a `resume_preset_variants` row for
every selected locale before invoking the RPC, using
`clampResumeSelectionToRawDocument` (`app/lib/preset-selection.ts`): the
effective selection (existing variant, else base) is filtered to indexes that
exist in that locale's document, with a fallback to that document's default
summary when the selected summary is out of range. Clamping only ever removes
entries relative to the user's selection — it never exposes unselected content
(ADR 0008). The dashboard preset preview applies the same clamp. Snapshots
published before this change must be republished to repair their locale rows.
Test contract: `tests/preset-selection-locale-clamp.test.mjs`.

Follow-up refinements (same date):

- **Plain-text summary support.** Legacy documents store `summary` as a YAML
  string; `normalizeSummaryItems` renders that as one default summary entry,
  so `clampResumeSelectionToRawDocument` and
  `applyResumeSelectionToRawDocument` treat it as a virtual one-element array
  (apply keeps the string verbatim). The public snapshot fidelity check also
  counts this shape as one selected record. Without this, publishing or reading
  any language version using the legacy shape failed outright or hid that
  language from the public switcher.
- **Fail closed for selected locales.** Every locale explicitly selected by
  the user must produce a renderable variant before the snapshot RPC runs.
  Missing or invalid locale documents abort publication with a locale-specific
  error; a successful response therefore guarantees that no selected language
  was silently omitted.
- **Verify variant writes.** Insert and update results for
  `resume_preset_variants` are checked before publication continues. Database,
  RLS, constraint, and zero-row failures abort the operation instead of letting
  the RPC copy a stale selection into a new snapshot.
- **Harden existing public snapshots.** The public page and export resolver
  validate locale rows before choosing a language. Invalid rows are excluded
  from language switching and the resolver falls back to a renderable default
  locale instead of returning 404. Republish the saved version to restore an
  excluded language with a newly clamped immutable snapshot.
- **Preset delete vs. immutable snapshots.** Deleting an ever-published preset
  fires `ON DELETE SET NULL` updates against `resume_published_cvs.preset_id`
  and (via the `resume_preset_variants` cascade)
  `resume_published_cv_locales.source_variant_id`, which the
  `prevent_published_cv_mutation` trigger rejected — such presets could never
  be deleted. Migration
  `20260717000000_allow_snapshot_source_detach.sql` permits updates that only
  null source-pointer columns (`preset_id`, `source_variant_id`,
  `source_document_id`, `source_revision_id`, `created_by`); all other
  snapshot mutations remain rejected. `deleteResumePreset` additionally
  revokes an active public link (via the unpublish RPC) before deleting, so a
  live link can never be orphaned with `preset_id = null`.
