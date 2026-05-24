"use client";

import React, { useEffect, useRef, useState } from "react";
import type { ResumeDocument, ResumeLocale } from "../../../lib/resume-schema";
import type { ResumeLanguageOption } from "../../resume-language-switcher";
import { BasicResumeDocument } from "../../resume-renderer/BasicResumeDocument";

const CV_NATURAL_WIDTH = 793;

export interface ResumePreviewFrameProps {
  resume: ResumeDocument;
  locale: ResumeLocale;
  languages?: ResumeLanguageOption[];
  activeLocale?: string;
  onLanguageSelect?: (locale: string) => void;
}

export const ResumePreviewFrame: React.FC<ResumePreviewFrameProps> = ({
  resume,
  locale,
  languages,
  activeLocale,
  onLanguageSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ width: 0, height: 0 });

  const scale = dims.width > 0 ? Math.min(1, dims.width / CV_NATURAL_WIDTH) : 1;
  // The scroller's natural height must equal visibleHeight/scale so that
  // after zoom it fills the container exactly and allows internal scrolling.
  const innerHeight = scale > 0 && dims.height > 0 ? Math.round(dims.height / scale) : 500;

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry?.contentRect ?? { width: 0, height: 0 };
      setDims((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="resume-preview-frame">
      <div
        ref={scrollRef}
        className="resume-preview-frame__scroller"
        style={
          {
            zoom: scale,
            width: `${CV_NATURAL_WIDTH}px`,
            height: `${innerHeight}px`,
            "--app-header-height": "0px",
          } as React.CSSProperties
        }
      >
        <BasicResumeDocument
          resume={resume}
          locale={(activeLocale as ResumeLocale) || locale}
          status="public"
          mode="public"
          showChrome={true}
          languages={languages}
          onLanguageSelect={onLanguageSelect}
          scrollContainerRef={scrollRef as React.RefObject<HTMLElement>}
        />
      </div>
    </div>
  );
};
