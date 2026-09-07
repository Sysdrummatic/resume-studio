"use client";

import { useRef } from "react";

type ImportCvBannerProps = {
  isBusy: boolean;
  onFileSelected: (file: File) => void;
};

// Matches the approved editor mockup's "already have a CV?" import panel —
// see CLAUDE.md's mockup implementation notes / "iteration 2" scope.
export default function ImportCvBanner({ isBusy, onFileSelected }: ImportCvBannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onFileSelected(file);
  }

  return (
    <div className="resume-editor-import-banner">
      <div>
        <b>Already have a CV?</b>
        <span>Upload a PDF, DOCX, YAML, or TXT file and we&apos;ll transfer the content into the form.</span>
      </div>
      <button type="button" className="button" onClick={() => inputRef.current?.click()} disabled={isBusy}>
        {isBusy ? "Reading file..." : "Upload file"}
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
