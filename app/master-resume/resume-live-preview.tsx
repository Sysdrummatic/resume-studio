"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ResumeDocument, ResumeLocale } from "../lib/resume-schema";
import type { ResumeLanguageOption } from "../components/resume-language-switcher";
import { BasicResumeDocument } from "../components/resume-renderer/BasicResumeDocument";

export type ResumeEditorStyle = "basic" | "empty";

type Props = {
  locale: ResumeLocale;
  resume: ResumeDocument;
  languages?: ResumeLanguageOption[];
  onLanguageSelect?: (locale: string) => void;
  styleCode: ResumeEditorStyle;
  yamlContent: string;
  isExpanded: boolean;
  aiGenerated?: boolean;
  allowDraftPdf?: boolean;
  onExpand: () => void;
  onClose: () => void;
};

const BASIC_PREVIEW_WIDTH = 920;

export default function ResumeLivePreview({
  locale,
  resume,
  languages,
  onLanguageSelect,
  styleCode,
  yamlContent,
  isExpanded,
  aiGenerated = false,
  allowDraftPdf = false,
  onExpand,
  onClose,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [previewMetrics, setPreviewMetrics] = useState({ scale: 1, height: 0 });

  function handleFrameKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onExpand();
  }

  useEffect(() => {
    if (styleCode !== "basic") {
      return;
    }

    const currentFrame = frameRef.current;
    const currentDocument = documentRef.current;
    if (!currentFrame || !currentDocument) {
      return;
    }
    const frame = currentFrame;
    const documentEl = currentDocument;

    function updatePreviewMetrics() {
      const nextScale = frame.clientWidth / BASIC_PREVIEW_WIDTH;
      const nextHeight = documentEl.scrollHeight * nextScale;
      setPreviewMetrics({
        scale: nextScale,
        height: nextHeight,
      });
    }

    updatePreviewMetrics();

    const resizeObserver = new ResizeObserver(updatePreviewMetrics);
    resizeObserver.observe(frame);
    resizeObserver.observe(documentEl);

    return () => {
      resizeObserver.disconnect();
    };
  }, [locale, resume, styleCode]);

  if (styleCode === "empty") {
    return <pre className="resume-editor-raw-preview">{yamlContent}</pre>;
  }

  return (
    <>
      <div
        className="resume-editor-preview-frame"
        ref={frameRef}
        role="button"
        tabIndex={0}
        onClick={onExpand}
        onKeyDown={handleFrameKeyDown}
        aria-label="Open enlarged CV preview"
      >
        <div className="resume-editor-preview-scale-box" style={{ height: previewMetrics.height || undefined }}>
          <div
            className="resume-editor-preview-scale-content"
            ref={documentRef}
            style={{ transform: `scale(${previewMetrics.scale})` }}
          >
            <BasicResumeDocument
              locale={locale}
              resume={resume}
              languages={languages}
              onLanguageSelect={onLanguageSelect}
              status="draft"
              aiGenerated={aiGenerated}
              showChrome
              mode="editor"
              allowDraftPdf={allowDraftPdf}
            />
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="resume-editor-preview-modal" role="dialog" aria-modal="true" aria-label="Enlarged CV preview">
          <button type="button" className="resume-editor-preview-modal__backdrop" onClick={onClose} aria-label="Close preview"></button>
          <div className="resume-editor-preview-modal__body">
            <button type="button" className="button button--ghost resume-editor-preview-modal__close" onClick={onClose}>
              Close
            </button>
            <BasicResumeDocument
              locale={locale}
              resume={resume}
              languages={languages}
              onLanguageSelect={onLanguageSelect}
              status="draft"
              aiGenerated={aiGenerated}
              showChrome
              mode="editor"
              allowDraftPdf={allowDraftPdf}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
