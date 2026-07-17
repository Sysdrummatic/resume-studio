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
