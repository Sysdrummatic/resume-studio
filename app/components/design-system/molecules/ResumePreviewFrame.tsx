import React from "react";
import type { ResumeDocument, ResumeLocale } from "../../../lib/resume-schema";
import { BasicResumeDocument } from "../../resume-renderer/BasicResumeDocument";

interface ResumePreviewFrameProps {
  resume: ResumeDocument;
  locale: ResumeLocale;
}

export const ResumePreviewFrame: React.FC<ResumePreviewFrameProps> = ({ resume, locale }) => {
  return (
    <div className="relative w-full aspect-[1/1.414] overflow-hidden bg-transparent">
      <div className="absolute top-0 left-1/2 w-[210mm] -translate-x-1/2 origin-top scale-[0.4] pointer-events-none">
         <BasicResumeDocument 
           resume={resume} 
           locale={locale} 
           status="public" 
           showChrome={false}
           mode="preview"
         />
      </div>
    </div>
  );
};
