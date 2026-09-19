# ADR 0023: Linked Master Resume Language Entries

Status: Accepted
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
7. Legacy documents without IDs are paired by existing position during their
   first reconciliation, then retain generated IDs. Public snapshots continue to
   use the existing numeric selection contract after locale reconciliation.

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

## Implementation

- Linkage helpers: `app/lib/resume-language-linkage.ts`
- Locale creation and reconciliation: `app/lib/resume-server.ts`
- Editor protections and default-summary behavior:
  `app/master-resume/editor-canvas-client.tsx`
- Private metadata normalization and public stripping:
  `app/lib/resume-schema.ts`, `app/lib/published-export.ts`
- Behavioral contract tests: `tests/resume-language-linkage.test.mjs`
- Data import (ADR 0018): `importLanguagesAndDocuments` in `app/lib/resume-server.ts`
  registers the bundle's languages without changing the default, saves the
  bundle's default-language document as the canonical one (`asDefault`), switches
  the default, and only then saves the other documents. Switching the default
  requires that language's document to exist, and a document is reconciled
  against the current default, so any other order fails or blanks the imported
  translation. Regression: `tests/import-default-language-switch.test.mjs`.
