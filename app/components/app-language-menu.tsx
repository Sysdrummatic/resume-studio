"use client";

import { isPublicCvPath } from "../lib/ai-bots";
import { APP_LANG_QUERY_PARAM, APP_LOCALE_COOKIE_MAX_AGE, APP_LOCALE_COOKIE_NAME } from "../i18n/locale";
import { useAppI18n } from "./app-i18n-provider";
import { SegmentedControl } from "./design-system/primitives";

function persistAppLocale(locale: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${APP_LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=${APP_LOCALE_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

export default function AppLanguageMenu() {
  const { locale, locales, dictionary } = useAppI18n();

  function selectLocale(nextLocale: string) {
    if (nextLocale === locale) {
      return;
    }

    persistAppLocale(nextLocale);
    const url = new URL(window.location.href);
    // On a public CV ?lang= selects the CV language, not the app language; the cookie carries the app locale there.
    if (!isPublicCvPath(url.pathname)) {
      url.searchParams.set(APP_LANG_QUERY_PARAM, nextLocale);
    }
    window.location.assign(url.toString());
  }

  return (
    <SegmentedControl
      className="ocv-topbar__language"
      label={dictionary.language_menu.aria_label}
      options={locales.map((option) => ({ value: option.code, label: option.code.toUpperCase() }))}
      value={locale}
      onChange={selectLocale}
    />
  );
}
