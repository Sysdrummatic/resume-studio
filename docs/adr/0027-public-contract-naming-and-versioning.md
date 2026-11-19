# ADR 0027: Public Contract Naming And Versioning

Status: Proposed

Date: 2026-11-19

Extends: [ADR 0002](0002-opencv-yaml-public-contract.md) (OpenCV YAML public
contract), [ADR 0008](0008-opencv-public-api-and-export-surface.md) (public API and
export surface)

Related: [Phase O](../phases/phase-o-opencv-standard.md)

Tracking: issue #297.

## Context

The public data contract is called **OpenCV** everywhere it is visible:

- the public API path `/api/public/opencv/v1/{personSlug}/{publicId}`;
- the response headers `X-OpenCV-Contract-Version`, `X-OpenCV-Schema-Version` and
  `X-OpenCV-Locale`;
- code identifiers such as `openCvYamlContractVersion`;
- the policy guides `opencv-yaml-public-contract-policy.md` and
  `opencv-public-api-export-policy.md`;
- the Terms of Service, section 6 ("The OpenCiVera Brand, and the OpenCV Format"),
  in English and Polish (`app/i18n/locales/{en,pl}/legal.yaml`).

A search of the repository finds the word in 40 files: 9 under `app/`, 10 under
`tests/`, 19 under `docs/` and 2 under `supabase/`. The headers are set in one route
handler. The footprint is small, which is why the question is cheap to settle now
and expensive after launch.

Phase O plans to extract the format into a standalone, independently versioned
specification with its own repository, a reference validator package and a
conformance suite. Its name becomes a repository name, a package scope and a public
brand. Two problems follow from "OpenCV":

1. It is also the name of a widely used computer-vision library. That affects search
   results, package registries and trademark clearance for the specification.
2. The product has discussed other names for the standard (an OpenCiVera-branded
   schema with the machine stem `civera`, and OpenVita) but none is adopted in code
   or documents, so the repository currently has no decision on record.

ADR 0008 fixes the rule for change: the major version is path-based, and an
incompatible change requires a new major path with migration notes. Renaming the path
in place would therefore be a breaking change to the documented v1 contract.

## Decision

This ADR cannot be accepted until the name is chosen (open question 1). The rest of
the decision does not depend on which name wins.

1. **Choose the name before the first external consumer and before the Phase O
   repository is created.** Candidates: keep OpenCV; OpenCiVera Schema (stem
   `civera`); OpenVita.
2. **Rename through an alias window, not in place.** When the name changes, the new
   path `/api/public/<stem>/v1/...` and the new header family become canonical. The
   old path and the `X-OpenCV-*` headers keep working, served by the same handler, and
   are marked deprecated with a stated sunset date. The data does not change, so the
   schema and contract versions are not bumped. If open question 3 shows that no
   external consumer exists, the window may be zero.
3. **Names that stay as they are.** `schema_version` and the stored snapshots. The
   user-data bundle `format: opencivera-user-data` (ADR 0018) is already product-named
   and is a separate contract.
4. **Legal text follows the name.** Section 6 of the Terms is part of the legal text
   that already awaits review (`TECH_DEBT.md`); a rename is added to that review
   rather than edited separately.
5. **Phase O inherits the decision.** The specification repository, the package
   scope and the conformance suite use the chosen name. Before adopting a name,
   availability is checked on the package registry, the code host and the domain
   registry.

## Alternatives considered

- **Keep "OpenCV" and rename at Phase O through a v2.** Cheapest today, but the
  collision stays, and the rename then lands after public consumers exist and costs a
  major version.
- **Rename in place under v1 with no aliases.** Breaks the documented contract and
  ADR 0008's own rule. Acceptable only if open question 3 proves there is no consumer.
- **Rename only the brand in prose and keep the machine identifiers.** Leaves the
  collision visible in every response header and in the path.

## Consequences

- One decision covers the API, the headers, the documents, the legal text and Phase O.
- During the alias window both header families are emitted, and the contract tests
  assert both.
- The rename touches the files counted above, plus any generated documentation.

## Open questions

1. Which name? This needs the owner's decision, after the registry and trademark
   check in decision 5.
2. Sunset length for the old path, if there is an alias window.
3. Does anything outside the application call the v1 endpoint today? Check the
   production access logs before choosing between an alias window and a direct rename.

## Test contract (planned)

- `tests/adr-0008-opencv-public-api-contract.test.mjs` is extended to assert the
  canonical and the deprecated headers, and that both paths return the same body.
- A guard test lists the remaining occurrences of the old name outside the alias
  paths, so the rename cannot stall half done.

## Implementation Checklist

- [ ] Registry and trademark check for the candidate names.
- [ ] Owner chooses the name; this ADR moves to Accepted.
- [ ] Check production logs for external v1 consumers.
- [ ] Add the canonical path and headers, keep the old ones with a deprecation
      signal and a sunset date.
- [ ] Update the two policy guides, `docs/CODE-MAP.md` and the Phase O plan.
- [ ] Include Terms section 6 (EN/PL) in the pending legal review.
