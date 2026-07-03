"use client";

import { useEffect, useRef, useState, type RefObject, type KeyboardEvent } from "react";
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
  draftPdfEnabled?: boolean;
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
  draftPdfEnabled = true,
  onExpand,
  onClose,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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
    const frame = frameRef.current;
    if (!frame) return;

    function updateScale() {
      if (!frame) return;
      setScale(frame.clientWidth / BASIC_PREVIEW_WIDTH);
    }

    updateScale();
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(frame);
    return () => resizeObserver.disconnect();
  }, [styleCode]);

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
        <div style={{ zoom: scale, width: `${BASIC_PREVIEW_WIDTH}px` }}>
          <BasicResumeDocument
            locale={locale}
            resume={resume}
            languages={languages}
            onLanguageSelect={onLanguageSelect}
            status="draft"
            aiGenerated={aiGenerated}
            showChrome
            mode="editor"
            draftPdfEnabled={draftPdfEnabled}
            embedded
          />
        </div>
      </div>

      {isExpanded ? (
        <div className="resume-editor-preview-modal" role="dialog" aria-modal="true" aria-label="Enlarged CV preview">
          <button type="button" className="resume-editor-preview-modal__backdrop" onClick={onClose} aria-label="Close preview"></button>
          <div ref={modalBodyRef} className="resume-editor-preview-modal__body">
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
            mode="public"
            draftPdfEnabled={draftPdfEnabled}
            scrollContainerRef={modalBodyRef as RefObject<HTMLElement>}
          />
          </div>
        </div>
      ) : null}
    </>
  );
}
