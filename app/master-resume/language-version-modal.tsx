"use client";

import { useMemo, useState } from "react";
import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumeLanguageMetadata } from "./use-multi-locale-resume-documents";
import { useAppI18n } from "../components/app-i18n-provider";
import { formatAppMessage } from "../i18n/locale";

function TrashIcon() {
  return (
    <svg className="button__icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

type LanguageVersionModalProps = {
  isOpen: boolean;
  activeLocale: ResumeLocale;
  defaultLocale: ResumeLocale;
  languageOptions: ResumeLanguageMetadata[];
  onClose: () => void;
  onSave: (input: { code: string; label: string; shortLabel: string }, editingCode: ResumeLocale | null) => Promise<void>;
  onSetDefault: (code: ResumeLocale) => Promise<void>;
  onDelete: (code: ResumeLocale) => Promise<void>;
  onError: (message: string) => void;
};

export default function LanguageVersionModal({
  isOpen,
  activeLocale,
  defaultLocale,
  languageOptions,
  onClose,
  onSave,
  onSetDefault,
  onDelete,
  onError,
}: LanguageVersionModalProps) {
  const { dictionary } = useAppI18n();
  const t = (text: string) => dictionary.editor.text[text] ?? text;
  const [newLanguageCode, setNewLanguageCode] = useState("");
  const [newLanguageLabel, setNewLanguageLabel] = useState("");
  const [newLanguageShortLabel, setNewLanguageShortLabel] = useState("");
  const [editingLanguageCode, setEditingLanguageCode] = useState<ResumeLocale | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const normalizedCode = useMemo(() => newLanguageCode.trim().toLowerCase().split("-")[0].slice(0, 2), [newLanguageCode]);
  const normalizedShortLabel = useMemo(
    () => (newLanguageShortLabel.trim() || normalizedCode).toUpperCase().slice(0, 2),
    [newLanguageShortLabel, normalizedCode],
  );

  if (!isOpen) return null;

  function resetForm() {
    setEditingLanguageCode(null);
    setNewLanguageCode("");
    setNewLanguageLabel("");
    setNewLanguageShortLabel("");
  }

  async function handleSave() {
    if (!/^[a-z]{2}$/.test(normalizedCode)) {
      onError(t("Use a two-letter language code."));
      return;
    }
    if (!newLanguageLabel.trim()) {
      onError(t("Language name is required."));
      return;
    }
    if (!/^[A-Z]{2}$/.test(normalizedShortLabel)) {
      onError(t("Short label must contain two letters."));
      return;
    }
    if (!editingLanguageCode && languageOptions.some((language) => language.code === normalizedCode)) {
      onError(t("This language already exists."));
      return;
    }

    setIsSaving(true);
    try {
      await onSave({ code: normalizedCode, label: newLanguageLabel.trim(), shortLabel: normalizedShortLabel }, editingLanguageCode);
      resetForm();
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : t("Language version save failed."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSetDefault(code: ResumeLocale) {
    try {
      await onSetDefault(code);
    } catch (error) {
      onError(error instanceof Error ? error.message : t("Default language update failed."));
    }
  }

  async function handleDelete(code: ResumeLocale) {
    try {
      await onDelete(code);
    } catch (error) {
      onError(error instanceof Error ? error.message : t("Language version delete failed."));
    }
  }

  return (
    <div
      className="dashboard-modal"
      role="dialog"
      aria-modal="true"
      aria-label={editingLanguageCode ? formatAppMessage(t("Edit language version {code}"), { code: editingLanguageCode }) : t("Add language version")}
    >
      <button
        type="button"
        className="dashboard-modal__backdrop"
        onClick={() => {
          resetForm();
          onClose();
        }}
        aria-label={t("Close language version modal")}
      ></button>
      <div className={`dashboard-modal__body${editingLanguageCode ? " is-editing" : ""}`}>
        <div className="section-row">
          <h2>{editingLanguageCode ? t("Edit language version") : t("Add language version")}</h2>
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={() => {
              resetForm();
              onClose();
            }}
          >
            {t("Close")}
          </button>
        </div>
        <p className="card-lead">
          {t("Selected now")}: <strong>{languageOptions.find((language) => language.code === activeLocale)?.short_label || activeLocale.toUpperCase()}</strong>
        </p>
        <label>
          {t("Code")}
          <input value={newLanguageCode} onChange={(event) => setNewLanguageCode(event.target.value)} placeholder="de" maxLength={8} />
        </label>
        <label>
          {t("Language name")}
          <input value={newLanguageLabel} onChange={(event) => setNewLanguageLabel(event.target.value)} placeholder="Deutsch" />
        </label>
        <label>
          {t("Short label")}
          <input
            value={newLanguageShortLabel}
            onChange={(event) => setNewLanguageShortLabel(event.target.value)}
            placeholder={normalizedShortLabel || "DE"}
            maxLength={4}
          />
        </label>
        <section className="stack">
          <h3>{t("Versions")}</h3>
          <p className="card-lead">{formatAppMessage(t("{count} configured languages"), { count: languageOptions.length })}</p>
          <ul className="language-versions__list">
            {languageOptions.map((language) => (
              <li key={language.code}>
                <div className="language-versions__identity">
                  <span>{language.short_label}</span>
                  <div>
                    <strong>{language.label}</strong>
                    <p>{language.code}</p>
                  </div>
                </div>
                <div className="language-versions__meta">
                  {language.code === activeLocale && language.code !== defaultLocale ? (
                    <span className="dashboard-resume-list__badge">{t("Selected")}</span>
                  ) : null}
                  {language.code === defaultLocale ? <span className="dashboard-resume-list__badge">{t("Default")}</span> : null}
                </div>
                <div className="dashboard-resume-list__actions">
                  <div className="actions-row">
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => void handleSetDefault(language.code)}
                      disabled={language.code === defaultLocale}
                    >
                      {t("Set default")}
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => {
                        setEditingLanguageCode(language.code);
                        setNewLanguageCode(language.code);
                        setNewLanguageLabel(language.label);
                        setNewLanguageShortLabel(language.short_label);
                      }}
                    >
                      {t("Edit")}
                    </button>
                  </div>
                  <div className="dashboard-resume-list__delete-separator">
                    <button
                      type="button"
                      className="button button--ghost button--small button--icon button--danger"
                      aria-label={formatAppMessage(t("Delete language version {language}"), { language: language.label })}
                      title={t("Delete language version")}
                      onClick={() => void handleDelete(language.code)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <div className="actions-row">
          <button type="button" className="button button--primary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? t("Saving…") : editingLanguageCode ? t("Save changes") : t("Create version")}
          </button>
          {editingLanguageCode ? (
            <button type="button" className="button button--ghost" onClick={resetForm}>
              {t("Cancel edit")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
