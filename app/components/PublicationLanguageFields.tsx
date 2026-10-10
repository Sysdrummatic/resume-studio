"use client";

import { useMemo } from "react";
import type { ResumeLocale } from "../lib/resume-schema";
import { useAppI18n } from "./app-i18n-provider";

export type PublicationLanguages = {
  selectedLocales: ResumeLocale[];
  defaultLocale: ResumeLocale;
};

type LanguageMetadata = {
  code: ResumeLocale;
  label: string;
};

/** The message to show when the choice cannot be published, or null when it can. */
export function validatePublicationLanguages(value: PublicationLanguages, labels: Record<string, string>): string | null {
  if (value.selectedLocales.length === 0) return labels.select_one;
  if (!value.selectedLocales.includes(value.defaultLocale)) return labels.default_required;
  return null;
}

/** Which language versions a LiveCV link serves, and which one opens by default. */
export default function PublicationLanguageFields({
  locales,
  languageOptions,
  value,
  onChange,
}: {
  locales: ResumeLocale[];
  languageOptions: LanguageMetadata[];
  value: PublicationLanguages;
  onChange: (next: PublicationLanguages) => void;
}) {
  const { locale: appLocale, dictionary } = useAppI18n();
  const labels = dictionary.dashboard.publish_modal;
  const languageLabel = useMemo(() => {
    const map = new Map(languageOptions.map((item) => [item.code, item.label]));
    const displayNames = new Intl.DisplayNames([appLocale], { type: "language" });
    return (locale: ResumeLocale) => map.get(locale) || displayNames.of(locale) || locale.toUpperCase();
  }, [appLocale, languageOptions]);

  function toggleLocale(locale: ResumeLocale) {
    const set = new Set(value.selectedLocales);
    if (set.has(locale)) set.delete(locale);
    else set.add(locale);
    const selectedLocales = Array.from(set).sort();
    const defaultLocale = selectedLocales.includes(value.defaultLocale) || selectedLocales.length === 0 ? value.defaultLocale : selectedLocales[0];
    onChange({ selectedLocales, defaultLocale });
  }

  return (
    <>
      <section className="stack">
        <h3>{labels.languages}</h3>
        {locales.map((locale) => (
          <label key={locale} className="checkbox-row">
            <input type="checkbox" checked={value.selectedLocales.includes(locale)} onChange={() => toggleLocale(locale)} />
            {languageLabel(locale)}
          </label>
        ))}
      </section>

      <label>
        {labels.default}
        <select value={value.defaultLocale} onChange={(event) => onChange({ ...value, defaultLocale: event.target.value as ResumeLocale })}>
          {value.selectedLocales.map((locale) => (
            <option key={locale} value={locale}>
              {languageLabel(locale)}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
