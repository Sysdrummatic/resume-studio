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
    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
      {sorted.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => onEditLanguage(language)}
          aria-label={`Edit language version ${language.label}`}
          title={language.is_default ? `${language.label} (Default)` : language.label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            borderRadius: "999px",
            background: "var(--accent-light, rgba(94, 106, 210, 0.12))",
            color: "var(--accent-dark, var(--portal-accent))",
            fontSize: "0.85rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: "none",
            cursor: "pointer",
          }}
        >
          <span>{language.label}</span>
          {language.is_default ? <span style={{ fontSize: "0.72rem", opacity: 0.8 }}>Default</span> : null}
        </button>
      ))}
      <button
        type="button"
        onClick={onAddLanguage}
        disabled={isLoading}
        aria-label="Add language version"
        title="Add language version"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "24px",
          height: "24px",
          border: "none",
          borderRadius: "4px",
          background: "transparent",
          color: "var(--text)",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1,
          fontSize: "16px",
          lineHeight: 1,
          padding: 0,
          transition: "opacity 120ms ease",
        }}
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
