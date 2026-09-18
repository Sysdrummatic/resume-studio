"use client";

import { useMemo, useState } from "react";
import { Button } from "./design-system/atoms/Button";
import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumePresetRow } from "../lib/resume-server";
import { useAppI18n } from "./app-i18n-provider";

type LanguageMetadata = {
  code: ResumeLocale;
  label: string;
};

export type PublishDraft = {
  preset: ResumePresetRow;
  selectedLocales: ResumeLocale[];
  defaultLocale: ResumeLocale;
  allowIndexing: boolean;
};

type Props = {
  draft: PublishDraft;
  locales: ResumeLocale[];
  languageOptions: LanguageMetadata[];
  onClose: () => void;
  onPublish: (payload: {
    preset: ResumePresetRow;
    selectedLocales: ResumeLocale[];
    defaultLocale: ResumeLocale;
    allowIndexing: boolean;
  }) => Promise<void>;
};

export default function PublishSavedVersionModal({
  draft,
  locales,
  languageOptions,
  onClose,
  onPublish,
}: Props) {
  const { locale: appLocale, dictionary } = useAppI18n();
  const labels = dictionary.dashboard.publish_modal;
  const [selectedLocales, setSelectedLocales] = useState<ResumeLocale[]>(draft.selectedLocales);
  const [defaultLocale, setDefaultLocale] = useState<ResumeLocale>(draft.defaultLocale);
  const [allowIndexing, setAllowIndexing] = useState(draft.allowIndexing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const languageLabel = useMemo(() => {
    const map = new Map(languageOptions.map((item) => [item.code, item.label]));
    const displayNames = new Intl.DisplayNames([appLocale], { type: "language" });
    return (locale: ResumeLocale) => map.get(locale) || displayNames.of(locale) || locale.toUpperCase();
  }, [appLocale, languageOptions]);

  function toggleLocale(nextLocale: ResumeLocale) {
    setSelectedLocales((current) => {
      const set = new Set(current);
      if (set.has(nextLocale)) {
        set.delete(nextLocale);
      } else {
        set.add(nextLocale);
      }
      const next = Array.from(set).sort();
      if (!next.includes(defaultLocale) && next.length > 0) {
        setDefaultLocale(next[0]);
      }
      return next;
    });
  }

  async function submit() {
    if (selectedLocales.length === 0) {
      setError(labels.select_one);
      return;
    }
    if (!selectedLocales.includes(defaultLocale)) {
      setError(labels.default_required);
      return;
    }
    setError("");
    setIsSubmitting(true);
    await onPublish({ preset: draft.preset, selectedLocales, defaultLocale, allowIndexing });
    setIsSubmitting(false);
  }

  return (
    <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={labels.aria_label}>
      <button type="button" className="dashboard-modal__backdrop" onClick={onClose} aria-label={labels.close_aria}></button>
      <div className="dashboard-modal__body">
        <div className="section-row">
          <h2>{labels.title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {labels.close}
          </Button>
        </div>

        <p className="card-lead">{draft.preset.title}</p>

        <section className="stack">
          <h3>{labels.languages}</h3>
          {locales.map((nextLocale) => (
            <label key={nextLocale} className="checkbox-row">
              <input type="checkbox" checked={selectedLocales.includes(nextLocale)} onChange={() => toggleLocale(nextLocale)} />
              {languageLabel(nextLocale)}
            </label>
          ))}
        </section>

        <label>
          {labels.default}
          <select value={defaultLocale} onChange={(event) => setDefaultLocale(event.target.value as ResumeLocale)}>
            {selectedLocales.map((nextLocale) => (
              <option key={nextLocale} value={nextLocale}>
                {languageLabel(nextLocale)}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox-row">
          <input type="checkbox" checked={allowIndexing} disabled={Boolean(draft.preset.onboarding_test_run_id)} onChange={(event) => setAllowIndexing(event.target.checked)} />
          {labels.allow_indexing}
        </label>

        <div className="card stack">
          <strong>{labels.link_state}</strong>
          <p className="card-lead">{labels.canonical_note}</p>
          <p className="card-lead">{draft.preset.canonical_public_path ? labels.active_link : labels.new_link}</p>
        </div>

        {error ? <p className="status status--error">{error}</p> : null}

        <div className="actions-row">
          <Button variant="primary" onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? labels.publishing : labels.publish}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {labels.cancel}
          </Button>
        </div>
      </div>
    </div>
  );
}
