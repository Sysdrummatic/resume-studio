"use client";

import type { ResumeUserLocaleRow } from "../lib/resume-server";

interface LanguageBadgeRailProps {
  languages: ResumeUserLocaleRow[];
  onAddLanguage: () => void;
  onEditLanguage: (language: ResumeUserLocaleRow) => void;
  isLoading?: boolean;
}

export function LanguageBadgeRail({ languages, onAddLanguage, onEditLanguage, isLoading = false }: LanguageBadgeRailProps) {
  const sorted = [...languages].sort(
    (left, right) => (left.sort_order ?? 999) - (right.sort_order ?? 999) || left.code.localeCompare(right.code),
  );

  return (
    <div className="dashboard-language-rail">
      <div className="dashboard-language-rail__list" aria-label="Language versions">
        {sorted.map((language) => (
          <button
            key={language.code}
            type="button"
            className="dashboard-language-rail__pill"
            onClick={() => onEditLanguage(language)}
            aria-label={`Edit language version ${language.label}`}
            title={language.is_default ? `${language.label} (Default)` : language.label}
          >
            <span>{language.label}</span>
            {language.is_default ? <span className="dashboard-language-rail__pill-meta">Default</span> : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="dashboard-language-rail__add"
        onClick={onAddLanguage}
        disabled={isLoading}
        aria-label="Add language version"
        title="Add language version"
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
