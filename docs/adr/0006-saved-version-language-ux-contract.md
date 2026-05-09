# ADR 0006: Saved Version, Language Versions, And Link Management UX Contract

Status: Accepted

Date: 2026-05-09

Extends: [ADR 0001](0001-cv-publication-model.md)

## Context

Domain model is defined, but UX contracts for naming and publish operations must stay consistent across dashboard/editor/user panel.

## Decision

- Product term is `Saved Version` (not preset) for user-facing UI.
- Publish UI must explicitly show selected language set, default locale, indexing toggle, and resulting public link state.
- Unpublish keeps Saved Version private and editable.
- Canonical URL is primary in UI; `/r/[slug]` appears only as compatibility.
- Link management actions (copy/open/publish/unpublish) must reflect actual Public Link state.

## Consequences

- Cleaner mental model for users and lower risk of draft/public confusion.
- Requires coordinated frontend copy/state updates.

## Implementation Checklist

- [x] Replace remaining user-facing "preset" copy with "Saved Version".
- [x] Define publish modal contract for locale selection and default locale.
- [x] Define link management UX states (active/revoked/indexable).
- [x] Ensure dashboard/editor show canonical first, compatibility second.
- [x] Add UX regression tests for publish/unpublish language flows.
