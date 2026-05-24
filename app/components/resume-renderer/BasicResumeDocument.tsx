"use client";

import type { ResumeDocument, ResumeLocale } from "../../lib/resume-schema";
import type { ResumeLanguageOption } from "../resume-language-switcher";
import ResumeRenderer from "./ResumeRenderer";
import { buildPublishedResumeExportUrls } from "../../lib/resume-export";
import type { ResumeRenderAction, ResumeRendererLabels } from "./build-resume-render-model";

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
  scrollContainerRef?: React.RefObject<HTMLElement>;
  embedded?: boolean;
};

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
  scrollContainerRef,
  embedded = false,
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
      scrollContainerRef={scrollContainerRef}
      embedded={embedded}
    />
  );
}

export type { BasicResumeDocumentProps };
