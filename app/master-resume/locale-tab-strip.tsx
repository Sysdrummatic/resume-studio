"use client";

import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumeLanguageMetadata } from "./use-multi-locale-resume-documents";

type LocaleTabStripProps = {
  variant: "yaml" | "human";
  languageOptions: ResumeLanguageMetadata[];
  activeLocale: ResumeLocale;
  defaultLocale: ResumeLocale;
  dirtyLocales: ResumeLocale[];
  errorLocales?: ResumeLocale[];
  disabled?: boolean;
  /** YAML pane has its own "[Languages]" button elsewhere; HFE shows "[edit]" inline. */
  showManageTrigger?: boolean;
  onSelect: (locale: ResumeLocale) => void;
  onManageLanguages: () => void;
};

export default function LocaleTabStrip({
  variant,
  languageOptions,
  activeLocale,
  defaultLocale,
  dirtyLocales,
  errorLocales = [],
  disabled = false,
  showManageTrigger = false,
  onSelect,
  onManageLanguages,
}: LocaleTabStripProps) {
  return (
    <div className={`locale-tab-strip locale-tab-strip--${variant}`} role="tablist" aria-label="Resume language versions">
      {languageOptions.map((language) => {
        const isDefault = language.code === defaultLocale;
        const label = variant === "yaml" ? `${language.label}${isDefault ? " (default)" : ""}` : language.short_label;
        return (
          <button
            key={language.code}
            type="button"
            role="tab"
            aria-selected={activeLocale === language.code}
            className={`locale-tab-strip__tab ${activeLocale === language.code ? "is-active" : ""}`}
            onClick={() => onSelect(language.code)}
            disabled={disabled}
          >
            {label}
            {dirtyLocales.includes(language.code) ? (
              <span className={`locale-tab-strip__dot ${errorLocales.includes(language.code) ? "locale-tab-strip__dot--error" : ""}`} aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
      {showManageTrigger ? (
        <button type="button" className="locale-tab-strip__manage" onClick={onManageLanguages} disabled={disabled}>
          edit
        </button>
      ) : null}
    </div>
  );
}
