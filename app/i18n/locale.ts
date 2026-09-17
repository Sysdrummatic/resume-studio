export const APP_LOCALE_COOKIE_NAME = "opencivera-app-locale";
export const APP_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const APP_LOCALE_HEADER_NAME = "x-opencivera-app-locale";
export const APP_COUNTRY_HEADER_NAME = "x-opencivera-country-code";

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
  cookieLocale,
  headerLocale,
  countryCode,
  acceptLanguage,
  enabledLocales,
  countryLocales,
  knownCountryFallback,
  defaultLocale,
}: {
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
    selectEnabledLocale(cookieLocale, enabledLocales) ||
    selectEnabledLocale(headerLocale, enabledLocales) ||
    countryLocale ||
    resolveAcceptLanguage(acceptLanguage || null, enabledLocales) ||
    selectEnabledLocale(defaultLocale, enabledLocales) ||
    enabledLocales[0] ||
    "en"
  );
}
