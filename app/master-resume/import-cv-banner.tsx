"use client";

import { useRef } from "react";

type ImportCvBannerProps = {
  language?: "en" | "pl";
  isBusy: boolean;
  onFileSelected: (file: File) => void;
};

// Matches the approved editor mockup's "already have a CV?" import panel —
// see CLAUDE.md's mockup implementation notes / "iteration 2" scope.
export default function ImportCvBanner({ isBusy, onFileSelected, language = "en" }: ImportCvBannerProps) {
  const t = (en: string, pl: string) => language === "pl" ? pl : en;
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFileSelected(file);
  }

  return (
    <div className="resume-editor-import-banner">
      <div>
        <b>{t("Already have a CV?", "Masz już CV?")}</b>
        <span>{t("Upload a PDF, DOCX, YAML, or TXT file and we'll transfer the content into the form.", "Wgraj PDF, DOCX, YAML lub TXT, a przeniesiemy dane do formularza.")}</span>
      </div>
      <button type="button" className="button" onClick={() => inputRef.current?.click()} disabled={isBusy}>
        {isBusy ? t("Reading file...", "Odczytywanie pliku…") : t("Upload file", "Wgraj plik")}
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
