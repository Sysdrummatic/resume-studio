"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ResumeDocument, ResumeLocale } from "../lib/resume-schema";
import type { ResumeLanguageOption } from "../components/resume-language-switcher";
import ResumeRenderer from "../components/resume-renderer/ResumeRenderer";
import { buildPublishedResumeExportUrls } from "../lib/resume-export";
import type { ResumeRenderAction, ResumeRendererLabels } from "../components/resume-renderer/build-resume-render-model";

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

type BasicResumeDocumentProps = {
  locale: ResumeLocale;
  resume: ResumeDocument;
  languages?: ResumeLanguageOption[];
  onLanguageSelect?: (locale: string) => void;
  status?: "public" | "draft";
  aiGenerated?: boolean;
  personSlug?: string;
  publicId?: string;
  showChrome?: boolean;
  mode?: "public" | "editor" | "preview";
  roleOverride?: string | null;
  allowDraftPdf?: boolean;
  labels?: Partial<ResumeRendererLabels>;
  isBusy?: boolean;
};

const BASIC_PREVIEW_WIDTH = 920;

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  pl: "Polski",
};

async function exportPreviewPdf(resume: ResumeDocument, locale: ResumeLocale) {
  const res = await fetch("/api/resume/export/pdf/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resume, locale }),
  });
  if (!res.ok) {
    throw new Error("Failed to generate preview PDF.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `preview-${resume.brand_initials || "CV"}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function BasicResumeDocument({
  locale,
  resume,
  languages,
  onLanguageSelect,
  status = "draft",
  aiGenerated = false,
  personSlug,
  publicId,
  showChrome = true,
  mode = "preview",
  roleOverride,
  allowDraftPdf = false,
  labels,
  isBusy = false,
}: BasicResumeDocumentProps) {
  const languageOptions = languages?.length ? languages : [{ code: locale, label: LANGUAGE_LABELS[locale] || locale.toUpperCase() }];
  const exportUrls =
    personSlug && publicId
      ? buildPublishedResumeExportUrls(`/${encodeURIComponent(personSlug)}/${encodeURIComponent(publicId)}`, locale)
      : null;

  let pdfAction: ResumeRenderAction | undefined;
  if (exportUrls?.pdfUrl) {
    pdfAction = { label: "PDF", href: exportUrls.pdfUrl };
  } else if (allowDraftPdf) {
    pdfAction = { label: "PDF", onClick: () => exportPreviewPdf(resume, locale) };
  } else {
    pdfAction = { label: "PDF", disabled: true, disabledReason: "Available after publish" };
  }

  let atsAction: ResumeRenderAction | undefined;
  if (exportUrls?.textUrl) {
    atsAction = { label: "ATS Ready", href: exportUrls.textUrl };
  } else {
    atsAction = {
      label: "ATS Ready",
      disabled: true,
      disabledReason: "Available after publish",
    };
  }

  return (
    <ResumeRenderer
      locale={locale}
      resume={resume}
      languages={languageOptions}
      activeLocale={locale}
      onLanguageSelect={onLanguageSelect}
      status={status}
      aiGenerated={aiGenerated}
      mode={mode}
      roleOverride={roleOverride}
      showChrome={showChrome}
      labels={labels}
      isBusy={isBusy}
      actions={{
        pdf: pdfAction,
        ats: atsAction,
      }}
    />
  );
}

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
