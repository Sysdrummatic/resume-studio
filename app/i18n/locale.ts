export const APP_LOCALE_COOKIE_NAME = "opencivera-app-locale";
export const APP_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const APP_LOCALE_HEADER_NAME = "x-opencivera-app-locale";
export const APP_COUNTRY_HEADER_NAME = "x-opencivera-country-code";
export const APP_LANG_QUERY_PARAM = "lang";
export const APP_LANG_QUERY_HEADER_NAME = "x-opencivera-lang-query";
export const X_DEFAULT_LANGUAGE = "x-default";

const LOCALIZED_PATH_PATTERN = /^\/(?:$|resume$|privacy$|terms$|docs(?:\/|$))/;

/**
 * Adds `?lang=` to internal links to public, indexable pages so a crawler keeps
 * the chosen language after the first click. Other links are returned unchanged.
 */
export function withLangParam(href: string, locale: string | null | undefined): string {
  if (!locale || !href.startsWith("/") || href.startsWith("//")) {
    return href;
  }
  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const queryIndex = withoutHash.indexOf("?");
  const pathname = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  if (!LOCALIZED_PATH_PATTERN.test(pathname)) {
    return href;
  }
  const params = new URLSearchParams(queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : "");
  params.set(APP_LANG_QUERY_PARAM, locale);
  return `${pathname}?${params.toString()}${hash}`;
}

export type LanguageAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

/** Self-referencing canonical, hreflang variants and x-default (bare URL) for one public page. */
export function buildLanguageAlternates({
  baseUrl,
  pathname,
  locale,
  locales,
}: {
  baseUrl: string;
  pathname: string;
  locale: string;
  locales: string[];
}): LanguageAlternates {
  const bare = `${baseUrl.replace(/\/+$/, "")}${pathname}`;
  const variant = (code: string) => `${bare}?${APP_LANG_QUERY_PARAM}=${encodeURIComponent(code)}`;
  return {
    canonical: variant(locale),
    languages: {
      ...Object.fromEntries(locales.map((code) => [code, variant(code)])),
      [X_DEFAULT_LANGUAGE]: bare,
    },
  };
}

export function formatAppMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (placeholder, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : placeholder,
  );
}

export function normalizeAppLocale(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
}

export function selectEnabledLocale(value: unknown, enabledLocales: string[]): string | null {
  const normalized = normalizeAppLocale(value);
  return enabledLocales.includes(normalized) ? normalized : null;
}

export function resolveAcceptLanguage(value: string | null, enabledLocales: string[]): string | null {
  if (!value) {
    return null;
  }

  const candidates = value
    .split(",")
    .map((part, index) => {
      const [localePart, ...parameters] = part.trim().split(";");
      const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
      const quality = qualityParameter ? Number.parseFloat(qualityParameter.trim().slice(2)) : 1;
      return {
        locale: selectEnabledLocale(localePart, enabledLocales),
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter(
      (candidate): candidate is { locale: string; quality: number; index: number } => Boolean(candidate.locale) && candidate.quality > 0,
    )
    .sort((left, right) => right.quality - left.quality || left.index - right.index);

  return candidates[0]?.locale || null;
}

export function resolveAppLocale({
  queryLocale,
  cookieLocale,
  headerLocale,
  countryCode,
  acceptLanguage,
  enabledLocales,
  countryLocales,
  knownCountryFallback,
  defaultLocale,
}: {
  queryLocale?: string | null;
  cookieLocale?: string | null;
  headerLocale?: string | null;
  countryCode?: string | null;
  acceptLanguage?: string | null;
  enabledLocales: string[];
  countryLocales: Record<string, string>;
  knownCountryFallback: string;
  defaultLocale: string;
}): string {
  const normalizedCountry = String(countryCode || "").trim().toUpperCase();
  const countryLocale = normalizedCountry
    ? selectEnabledLocale(countryLocales[normalizedCountry] || knownCountryFallback, enabledLocales)
    : null;

  return (
    selectEnabledLocale(queryLocale, enabledLocales) ||
    selectEnabledLocale(cookieLocale, enabledLocales) ||
    selectEnabledLocale(headerLocale, enabledLocales) ||
    countryLocale ||
    resolveAcceptLanguage(acceptLanguage || null, enabledLocales) ||
    selectEnabledLocale(defaultLocale, enabledLocales) ||
    enabledLocales[0] ||
    "en"
  );
}
