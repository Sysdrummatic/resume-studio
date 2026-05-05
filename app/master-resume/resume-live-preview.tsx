"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeDocument, ResumeLocale } from "../lib/resume-schema";
import { getDefaultSummary, PREVIEW_LABELS } from "../lib/resume-schema";

export type ResumeEditorStyle = "basic" | "empty";

type Props = {
  locale: ResumeLocale;
  resume: ResumeDocument;
  styleCode: ResumeEditorStyle;
  yamlContent: string;
  isExpanded: boolean;
  onExpand: () => void;
  onClose: () => void;
};

const BASIC_PREVIEW_WIDTH = 920;

function renderMeter(level: number) {
  return [1, 2, 3, 4, 5].map((step) => (
    <span key={step} className={`meter__dot ${step <= (level || 0) ? "meter__dot--active" : ""}`}></span>
  ));
}

function BasicResumeDocument({ locale, resume }: { locale: ResumeLocale; resume: ResumeDocument }) {
  const labels = PREVIEW_LABELS[locale];
  const defaultSummary = getDefaultSummary(resume.summary);

  return (
    <div className="resume-editor-basic resume-view-page resume-style--basic">
      <div className="resume">
        <header className="hero">
          <div className="hero__title">
            <div className="logo-circle">{resume.brand_initials || "CV"}</div>
            <div className="hero__identity">
              <h1>{resume.name || "Your Name"}</h1>
              <p>{resume.role || "Your Role"}</p>
            </div>
          </div>
        </header>

        <main className="layout">
          <section className="main-column">
            {defaultSummary && (
              <article className="section resume-section resume-section--summary">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.summary}</h2>
                </div>
                <p className="summary-text">{defaultSummary.description}</p>
              </article>
            )}

            {resume.experience.length > 0 && (
              <article className="section resume-section resume-section--experience">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.experience}</h2>
                </div>
                <div className="timeline">
                  {resume.experience.map((item, index) => (
                    <div key={`${item.company}-${index}`} className="timeline-item">
                      <div className="timeline-item__period">{item.period}</div>
                      <div className="timeline-item__content">
                        <h3>{item.company || "Company"}</h3>
                        <p className="timeline-item__subheading">{item.role || "Role"}</p>
                        {item.highlights.length > 0 && (
                          <ul className="item-list">
                            {item.highlights.map((highlight, highlightIndex) => (
                              <li key={`${highlight}-${highlightIndex}`}>{highlight}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {resume.education.length > 0 && (
              <article className="section resume-section resume-section--education">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.education}</h2>
                </div>
                <div className="timeline timeline--compact">
                  {resume.education.map((item, index) => (
                    <div key={`${item.school}-${index}`} className="timeline-item">
                      <div className="timeline-item__period">{item.period}</div>
                      <div className="timeline-item__content">
                        <h3>{item.school || "School"}</h3>
                        {item.detail ? <p className="timeline-item__detail">{item.detail}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {resume.courses.length > 0 && (
              <article className="section resume-section resume-section--courses">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.courses}</h2>
                </div>
                <div className="timeline timeline--compact timeline--courses">
                  {resume.courses.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="timeline-item">
                      <div className="timeline-item__period">{item.year || ""}</div>
                      <div className="timeline-item__content">
                        <h3>{item.name}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </section>

          <aside className="sidebar">
            <section className="card resume-section resume-section--personal">
              <div className="section-title">
                <span className="section-dot"></span>
                <h2>{labels.personalInfo}</h2>
              </div>
              <dl className="contact-list">
                {resume.contact.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="contact-item">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {resume.skills.length > 0 && (
              <section className="card resume-section resume-section--skills">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.skills}</h2>
                </div>
                <div className="meter-list">
                  {resume.skills.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="meter-item meter-item--plain">
                      <div className="meter-item__label">
                        <span>{item.name}</span>
                      </div>
                      <div className="meter">{renderMeter(item.level)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {resume.tech_stack.length > 0 && (
              <section className="card resume-section resume-section--tech-stack">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.techStack}</h2>
                </div>
                <ul className="pill-list">
                  {resume.tech_stack.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {resume.languages.length > 0 && (
              <section className="card resume-section resume-section--languages">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.languages}</h2>
                </div>
                <div className="meter-list meter-list--compact">
                  {resume.languages.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="meter-item meter-item--plain">
                      <div className="meter-item__label">
                        <span>{item.name}</span>
                        {item.level_text ? <span className="meter-item__note">{item.level_text}</span> : null}
                      </div>
                      <div className="meter">{renderMeter(item.level)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {resume.interests.length > 0 && (
              <section className="card resume-section resume-section--interests">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{labels.interests}</h2>
                </div>
                <ul className="pill-list">
                  {resume.interests.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}

export default function ResumeLivePreview({ locale, resume, styleCode, yamlContent, isExpanded, onExpand, onClose }: Props) {
  const frameRef = useRef<HTMLButtonElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const [previewMetrics, setPreviewMetrics] = useState({ scale: 1, height: 0 });

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
      <button
        type="button"
        className="resume-editor-preview-frame"
        ref={frameRef}
        onClick={onExpand}
        aria-label="Open enlarged CV preview"
      >
        <div className="resume-editor-preview-scale-box" style={{ height: previewMetrics.height || undefined }}>
          <div
            className="resume-editor-preview-scale-content"
            ref={documentRef}
            style={{ transform: `scale(${previewMetrics.scale})` }}
          >
            <BasicResumeDocument locale={locale} resume={resume} />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="resume-editor-preview-modal" role="dialog" aria-modal="true" aria-label="Enlarged CV preview">
          <button type="button" className="resume-editor-preview-modal__backdrop" onClick={onClose} aria-label="Close preview"></button>
          <div className="resume-editor-preview-modal__body">
            <button type="button" className="button button--ghost resume-editor-preview-modal__close" onClick={onClose}>
              Close
            </button>
            <BasicResumeDocument locale={locale} resume={resume} />
          </div>
        </div>
      )}
    </>
  );
}
