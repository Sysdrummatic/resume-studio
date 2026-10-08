"use client";

import type { ResumeUserLocaleRow } from "../lib/resume-server";
import { useAppI18n } from "../components/app-i18n-provider";
import { formatAppMessage } from "../i18n/locale";

interface LanguageBadgeRailProps {
  languages: ResumeUserLocaleRow[];
  onAddLanguage: () => void;
  onEditLanguage: (language: ResumeUserLocaleRow) => void;
  isLoading?: boolean;
}

export function LanguageBadgeRail({ languages, onAddLanguage, onEditLanguage, isLoading = false }: LanguageBadgeRailProps) {
  const { dictionary } = useAppI18n();
  const labels = dictionary.dashboard.language_modal;
  const sorted = [...languages].sort(
    (left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999) || left.code.localeCompare(right.code),
  );

  return (
    <div className="dashboard-language-rail">
      <div className="dashboard-language-rail__list" aria-label={labels.list_aria}>
        {sorted.map((language) => (
          <button
            key={language.code}
            type="button"
            className="dashboard-language-rail__pill"
            onClick={() => onEditLanguage(language)}
            aria-label={formatAppMessage(labels.edit_item_aria, { language: language.label })}
            title={language.is_default ? `${language.label} (${labels.default_label})` : language.label}
          >
            <span>{language.label}</span>
            {language.is_default ? <span className="dashboard-language-rail__pill-meta">{labels.default_label}</span> : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="dashboard-language-rail__add"
        onClick={onAddLanguage}
        disabled={isLoading}
        aria-label={labels.add_item_aria}
        title={labels.add_item_aria}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}
