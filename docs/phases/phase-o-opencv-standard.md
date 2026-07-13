# Phase O: OpenCV Format Standard & Specification

**Status**: ◯ **PLANNED, NOT STARTED**

**ETA**: TBD (post-launch; no hard dependency on I/G/H/M completion, but should not start before Phase G P0 gate closes)

**Depends On**: [ADR 0002](../adr/0002-opencv-yaml-public-contract.md), [ADR 0008](../adr/0008-opencv-public-api-and-export-surface.md) — both already anticipate OpenCV as a standard independent of the OpenCiVera product.

> Extract the OpenCV YAML CV format from being an implementation detail embedded in
> the OpenCiVera codebase into an independently versioned, publicly documented
> specification — the way OpenAPI is a standard many tools consume, not something
> any single product owns. OpenCiVera becomes the spec's first reference consumer,
> not its private owner.

---

## Overview

Today the OpenCV schema lives only as application code: `app/lib/resume-schema.ts`,
the `validate_resume_document_yaml` Supabase RPC, and prose in ADR 0002/0008. That's
fine for a single product, but it means every rule — including content-safety rules
like "this field must not contain script-injection patterns" — gets designed and
implemented ad hoc, inside OpenCiVera's editor, with no reuse path if a second
consumer (a CLI, another editor, a third-party integration) ever needs the same
guarantees.

Phase O treats OpenCV the way OpenAPI, JSON:API, or CommonMark treat their formats:
a versioned spec repository with its own release cadence, a formal schema definition,
a conformance test suite, and a reference validator package that implementations
import instead of reimplementing. OpenCiVera then becomes a *consumer* of that
package, same as any future third party would be.

### Key Theme

**From app-embedded schema → externally published standard, with OpenCiVera as
reference consumer.** Rules that today live only in `app/lib/*` move to a
standalone, independently versioned artifact; OpenCiVera imports it rather than
owning the only implementation.

---

## Why Now (Origin)

This phase was scoped out of the 2026-07-11 stored-XSS remediation
(`app/[personSlug]/[publicId]/page.tsx` JSON-LD escaping, see
[ADR context in that fix's PR]). During that work we considered adding an
editor-side "forbidden value" validator (warning users when a CV field looks like
a script-injection attempt) directly inside `app/master-resume/`. Building that
ad hoc, inside the app, would mean:

- The "what counts as a dangerous pattern" ruleset lives only in OpenCiVera's
  editor, with no portable definition.
- Any future non-OpenCiVera consumer of OpenCV YAML (import tooling, a CLI
  linter, a third-party integration) has to reinvent or copy the same rules.
- Content-safety validation and structural schema validation stay split across
  two unrelated code paths instead of one spec-defined contract.

Deferring it to Phase O means the ruleset gets designed once, versioned, tested
against a conformance suite, and consumed — not reinvented per integration.

---

## Scope & Deliverables

### O01 — Spec Extraction

- [ ] Stand up a standalone spec repository (separate from `plm-resume`) for the
      OpenCV format.
- [ ] Port the structural contract currently expressed in `app/lib/resume-schema.ts`
      and the `validate_resume_document_yaml` RPC into a formal schema definition
      (JSON Schema or equivalent), independently versioned (semver).
- [ ] Fold ADR 0002 (schema versioning/evolution) and ADR 0008 (public API/export
      surface) into the spec's own governance docs; OpenCiVera's ADRs become
      "how we consume the standard," not "what the standard is."

**Definition of Done**: the schema exists as a versioned artifact outside
`plm-resume`, with its own changelog and release process.

### O02 — Content-Safety Validation Ruleset (reference validator)

- [ ] Define, as part of the standard, a canonical ruleset for values that must be
      rejected or flagged regardless of consumer: script-injection markers
      (`</script>`, inline event-handler attributes), disallowed URL protocols
      (superset of `app/lib/safe-url.ts`'s `http:`/`https:`/`mailto:`/`tel:`
      allowlist), and any other structurally-valid-but-unsafe patterns.
- [ ] Ship a reference validator implementation (publishable package) that any
      consumer — including OpenCiVera's master-resume editor — imports instead of
      hand-rolling pattern matching.
- [ ] Design the validator to warn, not silently mutate or hard-block, by default —
      final enforcement policy (warn vs. block) is a per-consumer decision, not
      baked into the spec.

**Definition of Done**: OpenCiVera's editor imports the reference validator for
inline "this value looks unsafe" warnings instead of a locally-defined pattern
list. This is the deferred deliverable from the 2026-07-11 XSS remediation.

### O03 — Conformance Test Suite

- [ ] Publish a portable test suite (fixtures + expected pass/fail results) any
      implementation can run to prove OpenCV compliance, analogous to OpenAPI's
      conformance suites.
- [ ] Wire OpenCiVera's own test suite to run the conformance suite as a subset,
      proving the reference consumer stays compliant as the app evolves.

### O04 — Versioning & Publishing Process

- [ ] Semver policy, deprecation policy, and changelog process for the standard,
      decoupled from OpenCiVera's own release cadence (mirrors ADR 0002's schema
      versioning intent, but at the standard level, not the product level).
- [ ] Decide distribution mechanism (npm package, git submodule, vendored copy
      with a version pin) for consumers.

### O05 — OpenCiVera Migration to the Standard

- [ ] Replace `app/lib/resume-schema.ts`'s structural validation and
      `validate_resume_document_yaml` with calls into the published spec package
      (client and server), preserving existing EN/PL parity and fallback behavior.
- [ ] Wire the O02 reference validator into the master-resume editor UI as a
      non-blocking inline warning (see [Phase D](phase-d-editor-canvas.md) for the
      editor surface this attaches to).
- [ ] Confirm no regression in publish/rollback, YAML contract tests, or the
      publish-time snapshot immutability guarantees from ADR 0001/0002.

**Definition of Done**: OpenCiVera consumes the standard rather than owning the
only implementation of it; existing YAML contract tests (`tests/`) continue to
pass unmodified in behavior, only in implementation source.

---

## Non-Goals

- This phase does **not** re-litigate or weaken the fixes already shipped
  (JSON-LD escaping in `app/lib/jsonld.ts`, protocol allowlist in
  `app/lib/safe-url.ts`). Those stay as OpenCiVera's own output-side defenses
  regardless of when/whether Phase O ships — the reference validator is an
  additional, earlier-in-the-flow signal to the user, not a replacement for
  escaping untrusted output at render time.
- Not a rewrite of the YAML *shape* — O01 formalizes the existing contract, it
  doesn't redesign it.

---

## Related Documentation

- [ADR 0002: OpenCV YAML Public Contract And Schema Evolution](../adr/0002-opencv-yaml-public-contract.md)
- [ADR 0008: OpenCV Public API And Export Surface](../adr/0008-opencv-public-api-and-export-surface.md)
- [STATUS.md](../STATUS.md)

---

## Notes & Decisions

- **2026-07-11**: Editor-side content-safety validator scoped out of the stored-XSS
  remediation and deferred here, to avoid building app-specific validation logic
  that this phase would later need to duplicate or reconcile against the standard.
