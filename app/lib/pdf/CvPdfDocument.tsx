import React from "react";
import { Document } from "@react-pdf/renderer";
import { resumeFullName, type ResumeDocument } from "../resume-schema";
import {
  buildResumeRendererLabels,
  getResumeHeroRole,
} from "../../components/resume-renderer/build-resume-render-model";
import { cvBasicDotTheme, type PdfTheme } from "./theme";
import { registerPdfFonts } from "./engine-react-pdf";
import { TwoColumnTemplate } from "./templates/TwoColumnTemplate";

registerPdfFonts();

type CvPdfDocumentProps = {
  resume: ResumeDocument;
  locale?: string;
  publicId?: string;
  theme?: PdfTheme;
  title?: string;
};

export const CvPdfDocument = ({ resume, locale = "en", publicId, theme = cvBasicDotTheme, title }: CvPdfDocumentProps) => {
  const labels = buildResumeRendererLabels(locale);
  const heroRole = getResumeHeroRole(resume);
  const fullName = resumeFullName(resume);

  return (
    <Document
      title={title || fullName || "Resume"}
      author={fullName || undefined}
      subject={publicId ? `opencivera/${publicId}` : undefined}
    >
      <TwoColumnTemplate resume={resume} labels={labels} heroRole={heroRole} theme={theme} />
    </Document>
  );
};

export type { CvPdfDocumentProps };
