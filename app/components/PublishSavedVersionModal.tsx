"use client";

import { useState } from "react";
import { Button, Checkbox, Modal } from "./design-system/primitives";
import type { ResumeLocale } from "../lib/resume-schema";
import type { ResumePresetRow } from "../lib/resume-server";
import { useAppI18n } from "./app-i18n-provider";
import PublicationLanguageFields, { validatePublicationLanguages } from "./PublicationLanguageFields";

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
  open?: boolean;
  draft: PublishDraft;
  locales: ResumeLocale[];
  languageOptions: LanguageMetadata[];
  indexingEnabled: boolean;
  onClose: () => void;
  onPublish: (payload: {
    preset: ResumePresetRow;
    selectedLocales: ResumeLocale[];
    defaultLocale: ResumeLocale;
    allowIndexing: boolean;
  }) => Promise<void>;
};

export default function PublishSavedVersionModal({
  open = true,
  draft,
  locales,
  languageOptions,
  indexingEnabled,
  onClose,
  onPublish,
}: Props) {
  const { dictionary } = useAppI18n();
  const labels = dictionary.dashboard.publish_modal;
  const [languages, setLanguages] = useState({ selectedLocales: draft.selectedLocales, defaultLocale: draft.defaultLocale });
  const [allowIndexing, setAllowIndexing] = useState(draft.allowIndexing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const invalid = validatePublicationLanguages(languages, labels);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    setIsSubmitting(true);
    await onPublish({ preset: draft.preset, ...languages, allowIndexing: indexingEnabled && allowIndexing });
    setIsSubmitting(false);
  }

  return (
    <Modal
      open={open}
      onClose={() => onClose()}
      title={labels.title}
      description={draft.preset.title}
      closeLabel={labels.close_aria}
      footer={
        <>
          <Button onClick={onClose}>{labels.cancel}</Button>
          <Button variant="primary" busy={isSubmitting} onClick={() => void submit()}>
            {isSubmitting ? labels.publishing : labels.publish}
          </Button>
        </>
      }
    >
      <p className="ocv-body">{labels.description}</p>

      <PublicationLanguageFields locales={locales} languageOptions={languageOptions} value={languages} onChange={setLanguages} />

      {indexingEnabled ? (
        <Checkbox
          label={labels.allow_indexing}
          checked={allowIndexing}
          disabled={Boolean(draft.preset.onboarding_test_run_id)}
          onChange={(event) => setAllowIndexing(event.target.checked)}
        />
      ) : (
        <p className="ocv-meta">{labels.link_only_note}</p>
      )}

      <div className="publish-link-box">
        <p className="ocv-label">{labels.link_state}</p>
        <p className="ocv-meta">{labels.canonical_note}</p>
        <p className="ocv-meta">{draft.preset.canonical_public_path ? labels.active_link : labels.new_link}</p>
      </div>

      {error ? (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
