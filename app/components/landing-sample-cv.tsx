"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Real measured load time for the external profile is ~8s; give it well past
// that before giving up, since the skeleton makes the wait feel fine either way.
const LOAD_TIMEOUT_MS = 12000;

type Status = "loading" | "loaded" | "timed-out";

function ResumeSkeleton() {
  return (
    <div className="lp-cv__skeleton" aria-label="Loading sample resume">
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

export default function LandingSampleCv() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === "loading" ? "timed-out" : current));
    }, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  return (
    <div className="lp-cv" data-reveal>
      <div className="lp-cv__chrome">
        <div className="lp-cv__dots">
          <span />
          <span />
          <span />
        </div>
        <div className="lp-cv__url">
          <svg className="lp-cv__lock" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          opencvhub.netlify.app/<span className="lp-cv__url-hi">resume</span>
        </div>
        <Link href="/resume" className="lp-cv__ext" aria-label="Open sample resume">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>
      </div>
      <div className="lp-cv__wrap">
        {status !== "timed-out" && (
          <iframe
            src="https://opencvhub.netlify.app/resume"
            className={`lp-cv__iframe${status === "loaded" ? " is-loaded" : ""}`}
            title="Sample public resume — OpenCiVera"
            sandbox="allow-scripts allow-same-origin allow-forms"
            onLoad={() => setStatus((current) => (current === "loading" ? "loaded" : current))}
          />
        )}
        {status === "loading" && <ResumeSkeleton />}
        {status === "timed-out" && (
          <div className="lp-cv__fallback">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="13" x2="15" y2="13" />
              <line x1="9" y1="17" x2="13" y2="17" />
            </svg>
            <p>The embedded preview is taking longer than expected. You can still explore the platform by viewing the full example.</p>
            <Link href="/resume" className="btn btn-p">Open sample resume ↗</Link>
          </div>
        )}
      </div>
    </div>
  );
}
