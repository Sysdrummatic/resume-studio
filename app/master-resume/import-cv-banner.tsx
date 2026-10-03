"use client";

import { useRef } from "react";
import { useAppI18n } from "../components/app-i18n-provider";

type ImportCvBannerProps = {
  isBusy: boolean;
  onFileSelected: (file: File) => void;
};

// Matches the approved editor mockup's "already have a CV?" import panel —
// see CLAUDE.md's mockup implementation notes / "iteration 2" scope.
export default function ImportCvBanner({ isBusy, onFileSelected }: ImportCvBannerProps) {
  const { dictionary } = useAppI18n();
  const t = (text: string) => dictionary.editor.text[text] ?? text;
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFileSelected(file);
  }

  return (
    <div className="resume-editor-import-banner">
      <div>
        <b>{t("Already have a CV?")}</b>
        <span>
          {t("Upload a PDF, DOCX, YAML, or TXT file and we'll transfer the content into the form.")}
        </span>
      </div>
      <button
        type="button"
        className="button"
        onClick={() => inputRef.current?.click()}
        disabled={isBusy}
      >
        {isBusy ? t("Reading file…") : t("Upload file")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.yaml,.yml,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        onChange={handleChange}
        hidden
      />
    </div>
  );
}
