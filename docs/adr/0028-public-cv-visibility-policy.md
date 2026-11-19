# ADR 0028: Public CV Visibility Policy

Status: Proposed

Date: 2026-11-19

Amends: [ADR 0001](0001-cv-publication-model.md), [ADR 0005](0005-seo-aeo-structured-data-policy.md)
and [ADR 0008](0008-opencv-public-api-and-export-surface.md) (their visibility
sections; the inline notes in those files stay as history)

Related: [ADR 0025](0025-public-basic-documentation.md),
[indexing concept T20](../seo/indexing-concept-t20.md),
[robots inventory](../seo/robots-inventory.md)

Tracking: issue #297 (and issue #220 for the AI-crawler policy).

## Context

Who may read and index what is currently stated in four places:

- ADR 0001 and ADR 0005 describe user opt-in indexing and the robots matrix, with a
  2026-10-13 note that indexing is paused platform-wide by the flag
  `public_cv_indexing_enabled`.
- ADR 0008 carries a 2026-10-15 addendum that returns `403` to known AI crawlers on
  public CV paths, exports and the v1 API (issue #220).
- `docs/seo/indexing-concept-t20.md` records the private-route decision (option B).
- `CLAUDE.md` summarises the routing model.

Read together they are consistent, but no single document says so, and ADR 0005 still
reads as if CVs were indexable and as if AI visibility (AEO) applied to them. A reader
who opens only ADR 0005 reaches the wrong conclusion. This ADR is the one current
statement. It records decisions that were already taken; it adds one proposal
(reopen criteria) and one open question.

## Decision

### Current policy

| Surface | Search engines | AI crawlers |
| --- | --- | --- |
| Marketing pages (`/`, `/resume`, `/privacy`, `/terms`, `/login`) | `index, follow`; `/login` is `noindex` while sign-up is restricted | Allowed (allowlist in `app/lib/ai-bots.ts`, `llms.txt`, `llms-full.txt`) |
| Public docs (`/docs`, public tutorials, ADR 0025) | `index, follow`; non-public tutorials `noindex, nofollow` | Allowed |
| Published CVs `/{personSlug}/{publicId}` | `noindex, nofollow` for every CV while `public_cv_indexing_enabled` is off (default, fail-closed). The stored per-CV `allow_indexing` is kept and takes effect only when the flag is enabled. The sitemap lists no CVs | Known AI user agents get `403`; `robots.txt` has `Disallow: /` for them |
| Exports and v1 API (`/api/resume/export/*`, `/api/public/opencv/v1/*`) | `X-Robots-Tag: noindex, nofollow, noarchive` | Known AI user agents get `403`, checked in each handler |
| Private routes (`/dashboard`, `/admin`, `/master-resume`, `/user`, `/settings`, `/onboarding`) | `noindex, nofollow` in metadata, not blocked in `robots.txt`, so the directive can be read (T20, option B) | Disallowed by the AI rule except the allowlist |
| Test scenarios | Never public (ADR 0025) | Never public |

So AI visibility (the answer-engine part of ADR 0005) applies to marketing and
documentation only. It does not apply to CVs.

The AI-crawler block is a request to honest bots, not a security boundary. The data
boundary remains the saved selection, unguessable `publicId` values and rate limiting
(ADR 0008). `Google-Extended` and `Applebot-Extended` act through `robots.txt` only,
because they never appear in a User-Agent.

### Who can change it

The CV indexing flag is changed in the database by an admin (`platform_feature_flags`),
as with the other flags (ADR 0018). The AI-bot list is reviewed quarterly.

### Proposed criteria for reopening CV indexing

Do not enable `public_cv_indexing_enabled` until all of these hold:

1. The Phase G P0 security gate is closed (`docs/STATUS.md` currently shows 0 of 5).
2. The privacy policy and terms have had their legal review.
3. The publish dialog states plainly what search indexing means for the user, per CV.
4. The AI-crawler stance for CVs is decided separately (open question 1).

## Alternatives considered

- **Keep four partial statements.** Cheapest, but it is the reason this ADR is needed.
- **Open CVs to search engines now.** Rejected for the launch period: the security
  gate is open and the legal text is a draft.
- **One switch for search and AI together.** Rejected: the audiences differ, and a user
  who accepts search listing has not accepted use by AI crawlers.

## Consequences

- ADR 0005 stays valid as the rule set that applies once the flag is on; this ADR says
  when that is.
- A future per-CV AI opt-in is a separate setting from search indexing.
- Changing any row of the table is a change to this ADR, not an inline note elsewhere.

## Open questions

1. Should CVs ever be visible to AI crawlers, as an explicit per-CV choice? Until the
   owner decides, the answer in force is no.
2. Should the criteria above be adopted as written?

## Test contract

Already in place and unchanged: `tests/public-cv-indexing-paused.test.mjs`,
`tests/ai-bots-policy.test.mjs`, `tests/robots-and-sitemap-contract.test.mjs`,
`tests/private-routes-noindex.test.mjs`. A change to the table must change these.

## Implementation Checklist

- [ ] Owner confirms the table and the reopen criteria; this ADR moves to Accepted.
- [ ] Add a one-line pointer to this ADR in `docs/seo/indexing-concept-t20.md` and in
      the `CLAUDE.md` routing model.
- [ ] Move the "decision 2026-10-13" and "addendum 2026-10-15" notes in ADR 0001, 0005
      and 0008 under this ADR when the next amendment is needed; do not edit them now.
