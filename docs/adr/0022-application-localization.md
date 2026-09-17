# ADR 0022: Application Localization With YAML Dictionaries And Country Detection

Status: Accepted

Date: 2026-09-03

## Context

OpenCiVera already models CV language versions as locale-specific YAML documents
and immutable published snapshots. The Next.js application interface, however,
was mostly hardcoded in English. Its language menu displayed English only and did
not change application state. Product requirements call for Polish-first UI,
English fallback, country-aware initial selection, manual override, and a
file-based language catalog that can be extended without changing routing or
database publication contracts.

Application language, authored CV language, and a Published CV's default locale
are different concerns. Using visitor geolocation to replace a Published CV's
owner-selected default would change canonical, hreflang, and snapshot behavior.

## Decision

- Application locale configuration lives in `app/i18n/config.yaml`.
- Enabled locale dictionaries live under `app/i18n/locales/`, one YAML file per
  locale during the initial rollout.
- Polish (`pl`) is the application default and English (`en`) is the fallback.
- Request locale precedence is:
  1. valid manual `opencivera-app-locale` cookie;
  2. valid trusted application-locale request header;
  3. Netlify country mapping (`PL` to `pl`, any other known country to `en`);
  4. `Accept-Language` when country is unavailable;
  5. configured default (`pl`).
- A Netlify Edge Function forwards only the ISO country code to Next.js. The
  locale mapping remains in the YAML config so there is one source of truth.
- The manual language switch writes a SameSite=Lax cookie and reloads the current
  URL, preserving its route and query string.
- Existing unprefixed routes remain stable. Locale-prefixed marketing routes may
  be considered separately if multilingual SEO requires independently indexable
  URLs.
- CV language versions and Published CV default-locale resolution remain
  unchanged. The sample `/resume` view may align its initial variant with the
  application locale when that locale is available.

## Security and privacy

- Only a two-letter country code is forwarded. IP address, city, coordinates,
  and other location data are not stored.
- Cookie and header values are validated against currently enabled locales.
- Dictionary paths are resolved beneath `app/i18n`; escaping that directory is
  rejected.
- Geo-personalized dynamic HTML is not explicitly CDN-cached by this feature.

## Rollout

1. Add configuration, dictionaries, resolver, provider, switcher, and Netlify
   country forwarding.
2. Localize the public shell, landing page, authentication, and sample CV chrome.
3. Move dashboard, editor, account, admin, docs, and remaining UI strings into
   dictionaries in bounded follow-up changes.
4. Translate Privacy Policy and Terms with legal review before claiming locale
   parity for legal content.
5. Treat a Polish-first Master CV template for new accounts as a separate data
   contract change requiring an additive Supabase migration.

## Test contract

`tests/app-i18n.test.mjs` validates the enabled/default/fallback locale catalog,
PL/EN dictionary shape parity, locale negotiation, dynamic document language,
sample locale selection, and Netlify country forwarding.
