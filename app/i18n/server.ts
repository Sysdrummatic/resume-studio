import "server-only";

import fs from "node:fs";
import path from "node:path";
import { cookies, headers } from "next/headers";
import yaml from "js-yaml";
import {
  APP_COUNTRY_HEADER_NAME,
  APP_LOCALE_COOKIE_NAME,
  APP_LOCALE_HEADER_NAME,
  resolveAppLocale,
  selectEnabledLocale
} from "./locale";
import type { AppDictionary, AppI18nContextValue, AppLocaleOption } from "./types";

type LocaleConfigEntry = {
  code: string;
  enabled: boolean;
  name: string;
  native_name: string;
  dictionary: string;
};

type AppI18nConfig = {
  default_locale: string;
  fallback_locale: string;
  locales: LocaleConfigEntry[];
  geo: {
    country_locales: Record<string, string>;
    known_country_fallback: string;
  };
};

const I18N_ROOT = path.join(process.cwd(), "app", "i18n");
let configCache: AppI18nConfig | null = null;
const dictionaryCache = new Map<string, AppDictionary>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readYamlFile(filePath: string): unknown {
  return yaml.load(fs.readFileSync(filePath, "utf8"));
}

function loadConfig(): AppI18nConfig {
  if (configCache) {
    return configCache;
  }

  const parsed = readYamlFile(path.join(I18N_ROOT, "config.yaml"));
  if (!isRecord(parsed) || !Array.isArray(parsed.locales) || !isRecord(parsed.geo)) {
    throw new Error("Invalid application locale configuration.");
  }

  const locales = parsed.locales.filter(isRecord).map((entry) => ({
    code: String(entry.code || "")
      .trim()
      .toLowerCase(),
    enabled: entry.enabled !== false,
    name: String(entry.name || "").trim(),
    native_name: String(entry.native_name || "").trim(),
    dictionary: String(entry.dictionary || "").trim()
  }));
  const enabledCodes = locales.filter((locale) => locale.enabled).map((locale) => locale.code);
  const defaultLocale = selectEnabledLocale(parsed.default_locale, enabledCodes);
  const fallbackLocale = selectEnabledLocale(parsed.fallback_locale, enabledCodes);
  const countryLocales = isRecord(parsed.geo.country_locales)
    ? Object.fromEntries(
        Object.entries(parsed.geo.country_locales).map(([country, locale]) => [
          country.toUpperCase(),
          String(locale)
        ])
      )
    : {};
  const knownCountryFallback = selectEnabledLocale(parsed.geo.known_country_fallback, enabledCodes);

  if (
    !defaultLocale ||
    !fallbackLocale ||
    !knownCountryFallback ||
    locales.some((locale) => !/^[a-z]{2}$/.test(locale.code) || !locale.dictionary)
  ) {
    throw new Error("Application locale configuration contains an invalid or disabled locale.");
  }

  configCache = {
    default_locale: defaultLocale,
    fallback_locale: fallbackLocale,
    locales,
    geo: {
      country_locales: countryLocales,
      known_country_fallback: knownCountryFallback
    }
  };
  return configCache;
}

function mergeDictionary(fallback: unknown, selected: unknown): unknown {
  if (!isRecord(fallback) || !isRecord(selected)) {
    return selected ?? fallback;
  }

  const merged: Record<string, unknown> = { ...fallback };
  for (const [key, value] of Object.entries(selected)) {
    merged[key] = key in fallback ? mergeDictionary(fallback[key], value) : value;
  }
  return merged;
}

function loadRawDictionary(locale: string): AppDictionary {
  const config = loadConfig();
  const entry = config.locales.find((candidate) => candidate.enabled && candidate.code === locale);
  if (!entry) {
    throw new Error(`Application dictionary is not enabled for locale "${locale}".`);
  }

  const resolvedPath = path.resolve(I18N_ROOT, entry.dictionary);
  if (!resolvedPath.startsWith(`${I18N_ROOT}${path.sep}`)) {
    throw new Error(
      `Application dictionary path escapes the i18n directory for locale "${locale}".`
    );
  }
  const parsed = readYamlFile(resolvedPath);
  if (!isRecord(parsed)) {
    throw new Error(`Invalid application dictionary for locale "${locale}".`);
  }
  return parsed as AppDictionary;
}

export function getAppI18nConfig(): {
  defaultLocale: string;
  fallbackLocale: string;
  locales: AppLocaleOption[];
  countryLocales: Record<string, string>;
  knownCountryFallback: string;
} {
  const config = loadConfig();
  return {
    defaultLocale: config.default_locale,
    fallbackLocale: config.fallback_locale,
    locales: config.locales
      .filter((locale) => locale.enabled)
      .map((locale) => ({ code: locale.code, name: locale.name, nativeName: locale.native_name })),
    countryLocales: config.geo.country_locales,
    knownCountryFallback: config.geo.known_country_fallback
  };
}

export function getAppDictionary(localeInput: string): AppDictionary {
  const config = getAppI18nConfig();
  const enabledCodes = config.locales.map((locale) => locale.code);
  const locale = selectEnabledLocale(localeInput, enabledCodes) || config.defaultLocale;
  const shouldCache = process.env.NODE_ENV === "production";
  const cached = shouldCache ? dictionaryCache.get(locale) : null;
  if (cached) {
    return cached;
  }

  const fallback = loadRawDictionary(config.fallbackLocale);
  const selected = locale === config.fallbackLocale ? fallback : loadRawDictionary(locale);
  const dictionary = mergeDictionary(fallback, selected) as AppDictionary;
  if (shouldCache) {
    dictionaryCache.set(locale, dictionary);
  }
  return dictionary;
}

export async function getRequestAppI18n(): Promise<AppI18nContextValue> {
  const config = getAppI18nConfig();
  const enabledCodes = config.locales.map((locale) => locale.code);
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const locale = resolveAppLocale({
    cookieLocale: cookieStore.get(APP_LOCALE_COOKIE_NAME)?.value,
    headerLocale: requestHeaders.get(APP_LOCALE_HEADER_NAME),
    countryCode: requestHeaders.get(APP_COUNTRY_HEADER_NAME),
    acceptLanguage: requestHeaders.get("accept-language"),
    enabledLocales: enabledCodes,
    countryLocales: config.countryLocales,
    knownCountryFallback: config.knownCountryFallback,
    defaultLocale: config.defaultLocale
  });

  return {
    locale,
    locales: config.locales,
    dictionary: getAppDictionary(locale)
  };
}
