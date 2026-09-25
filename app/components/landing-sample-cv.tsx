"use client";

import { useEffect, useRef } from "react";
import ResumeViewClient from "../resume/resume-view-client";
import type { AppDictionary } from "../i18n/types";

type SampleLabels = AppDictionary["landing"]["sample"];

/**
 * Keeps the preview fitted to whatever width the hero column happens to have.
 *
 * The CV is laid out at a fixed px width (the sample CV's own shell width), so
 * fitting it to a fluid column means dividing a length by a length — which CSS
 * cannot express, in `calc()` or anywhere else. Discrete zoom steps per
 * breakpoint were the previous answer and they left visible slack between
 * steps, so the ratio is measured here instead and handed back to CSS as a
 * plain number.
 *
 * The reference width is read from `--story-sheet-width` rather than repeated
 * as a constant, so this never becomes a third copy of a derived value.
 */
function useSheetScale(anchor: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const frame = anchor.current?.closest<HTMLElement>("[data-sheet-frame]");
    if (!frame || typeof ResizeObserver === "undefined") return;

    let retry = 0;
    const update = () => {
      const sheetWidth = Number.parseFloat(
        getComputedStyle(frame).getPropertyValue("--story-sheet-width")
      );
      // The token comes from the page's CSS module. If that stylesheet has not
      // applied yet, retry rather than give up: the observer only fires again
      // when the frame resizes, so bailing here would leave the CSS fallback
      // in place for the whole session.
      if (!sheetWidth) {
        if (retry++ < 30) requestAnimationFrame(update);
        return;
      }
      retry = 0;
      // Never past 1:1 — the preview is the sample CV scaled down, not blown up.
      const scale = Math.min(1, frame.clientWidth / sheetWidth);
      frame.style.setProperty("--sheet-scale", String(scale));
    };

    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [anchor]);
}

function ResumeSkeleton({ loadingAria }: { loadingAria: string }) {
  return (
    <div className="lp-cv__skeleton" aria-label={loadingAria}>
      <div className="lp-cv__skel-header">
        <div className="lp-cv__skel-avatar" />
        <div className="lp-cv__skel-header-lines">
          <div className="lp-cv__skel-bar lp-cv__skel-bar--title" />
          <div className="lp-cv__skel-pills">
            <div className="lp-cv__skel-pill lp-cv__skel-pill--wide" />
            <div className="lp-cv__skel-pill" />
            <div className="lp-cv__skel-pill" />
            <div className="lp-cv__skel-pill" />
          </div>
        </div>
      </div>
      <div className="lp-cv__skel-main">
        <div className="lp-cv__skel-block">
          <div className="lp-cv__skel-bar lp-cv__skel-bar--heading" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
        </div>
        <div className="lp-cv__skel-block">
          <div className="lp-cv__skel-bar lp-cv__skel-bar--heading" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
        </div>
      </div>
      <div className="lp-cv__skel-side">
        <div className="lp-cv__skel-block">
          <div className="lp-cv__skel-bar lp-cv__skel-bar--heading" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
        </div>
        <div className="lp-cv__skel-block">
          <div className="lp-cv__skel-bar lp-cv__skel-bar--heading" />
          <div className="lp-cv__skel-bar" />
          <div className="lp-cv__skel-bar" />
        </div>
      </div>
    </div>
  );
}

/**
 * The published CV rendered inline, exactly as `/resume` renders it — same
 * renderer, same data, same chrome, same shell width — and scaled down by the
 * landing module. `showChrome={false}` is deliberately NOT passed: it switches
 * the renderer into its plain variant (210mm paper, 12mm margins, no card
 * shadows), which is what made the preview look unlike the sample CV.
 *
 * `embedded` keeps the CV inside this container; the sample route lets the same
 * root break out to 100vw.
 *
 * It used to be an `<iframe src="/resume">`, which pulled in the whole route —
 * including the app header — so the landing page showed its navigation twice.
 */
export default function LandingSampleCv({
  labels,
  locale
}: {
  labels: SampleLabels;
  locale: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useSheetScale(rootRef);

  return (
    // inert, not aria-hidden: the sheet contains links, and the full,
    // interactive CV is one click away at /resume.
    <div className="lp-cv" ref={rootRef} inert>
      <ResumeViewClient
        initialLocale={locale}
        loadingLabel={labels.loading_aria}
        embedded
        loadingFallback={<ResumeSkeleton loadingAria={labels.loading_aria} />}
      />
    </div>
  );
}
