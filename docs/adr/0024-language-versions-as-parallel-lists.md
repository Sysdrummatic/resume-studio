# ADR 0024: Language Versions as Parallel Lists

Status: Accepted (supersedes the ID mechanism of [ADR 0023](0023-multi-locale-entry-linkage.md))
Date: 2026-10-11

## Context

ADR 0023 kept the language versions of one Master Resume consistent with a
private `entry_id` on every entry (and an `__ocv` block for the plain-text
lists). That worked, but the IDs lived inside the YAML the user edits and
pastes. Pasting a CV into the YAML editor meant caring whether IDs matched, and
every user-visible YAML carried metadata that the user never asked for.

What the IDs guaranteed, in practice, was narrower: that an entry added in one
language exists in the others, and that translated text stays with its entry when
an entry in the middle of a list is removed or moved. Everything else
(`changed-id`, `duplicate-id`, `legacy-pairing`) only protected the IDs themselves.

## Decision

The language versions of one CV are **parallel lists**. Entry N of every version
is the same entry. Nothing identifies an entry except its position, and no ID
is stored in the YAML or anywhere else.

- **Invariant at rest:** every version has the same sections, the same number of
  entries in the same order, and the same number of bullets (`highlights`) in
  every experience entry.
- **Neutral fields** are identical in every version and copied from the version
  that was saved: experience `period`/`company`, education `period`/`school`,
  courses `year`, skills and languages `level`, and the default summary flag.
  Contact and QR rows have none, because a location or a link may be translated.
- **A new language** is a template: the same number of entries and bullets,
  translatable fields empty, neutral fields copied. Nobody has to translate it all;
  empty rows are omitted from the public CV (a translation row with no translated
  content is a blank slot).
- **Structure changes are explicit index operations** in the form (add, remove,
  move an entry or a bullet) and are applied to **every** version at once; the
  other versions get empty slots. Removing an entry that already has text in
  another version asks for confirmation first.
- **Changes made by hand in YAML** are validated, not guessed: the platform
  compares the structure with the other versions and shows how different it is.
  Saving is blocked until the user clicks **Match**, which brings the other
  versions to the structure of the one being edited (empty slots at the end, or
  the tail cut, with a confirmation when text would be removed).
- **The server** does not rewrite translations when a version is saved. It
  enforces the invariant where a mismatch would reach the public: publishing a
  CV version, an import, and a rollback of one version are refused with
  `409 { code: "parity", parityIssues }`.
- **Reading** accepts documents that still carry `entry_id` or `__ocv`
  (stored documents, revisions, snapshots, old export bundles); they are dropped
  on the next save. Public exports still strip them.

## Consequences

- The YAML is clean; pasting a CV needs no thought about IDs.
- Saving a version no longer rewrites other versions, so the sync, its partial
  failure reporting and the legacy-pairing confirmation flow are gone.
- A structural change made only in the YAML (not through the form) cannot be
  mapped to entries automatically; the user matches the versions explicitly.
- After a single-version save the other versions can briefly be out of step
  until the user saves them too; the editor blocks saving and publishing is
  refused until they match.
- Immutable published snapshots are not touched (the earlier plan to rewrite them
  is dropped).

## Implementation

`app/lib/resume-language-parity.ts` (pure: template, structural operations,
parity inspection, difference percentage, matching), `app/lib/resume-server.ts`
(save, publish preflight, import, rollback, default switch),
`app/master-resume/use-multi-locale-resume-documents.ts` and
`editor-canvas-client.tsx` (operations on all buffers, Match button).
Tests: `tests/resume-language-parity.test.mjs`, `tests/language-parity-server.test.mjs`,
`tests/import-language-parity.test.mjs`, `tests/import-canonical-preflight.test.mjs`,
`tests/locale-save-plan.test.mjs`.
