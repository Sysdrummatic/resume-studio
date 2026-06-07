"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Download, FileText } from "lucide-react";
import { StatusToast, useStatusToast } from "../status-toast";
import ResumeBadges from "../resume-badges";
import ResumeLanguageSwitcher from "../resume-language-switcher";
import type { ResumeLanguageOption } from "../resume-language-switcher";
import type { ResumeDocument, ResumeLocale } from "../../lib/resume-schema";
import { getDefaultSummary } from "../../lib/resume-schema";
import {
  buildResumeRenderConfig,
  buildResumeRendererLabels,
  getResumeHeroRole,
  type ResumeRenderAction,
  type ResumeRenderMode,
  type ResumeRendererLabels,
} from "./build-resume-render-model";
import "../../resume/resume.css";

type Props = {
  locale: ResumeLocale;
  resume: ResumeDocument;
  mode?: ResumeRenderMode;
  languages?: ResumeLanguageOption[];
  activeLocale?: string;
  onLanguageSelect?: (locale: string) => void;
  status?: "public" | "draft";
  aiGenerated?: boolean;
  roleOverride?: string | null;
  showChrome?: boolean;
  isBusy?: boolean;
  labels?: Partial<ResumeRendererLabels>;
  actions?: {
    pdf?: ResumeRenderAction;
    ats?: ResumeRenderAction;
    atsMenu?: ResumeRenderAction[];
  };
  scrollContainerRef?: React.RefObject<HTMLElement>;
  embedded?: boolean;
};

function renderMeter(level: number) {
  return [1, 2, 3, 4, 5].map((step) => (
    <span key={step} className={`meter__dot ${step <= (level || 0) ? "meter__dot--active" : ""}`}></span>
  ));
}

function isExternalLink(href: string) {
  return /^https?:\/\//i.test(href);
}

function ResumeActionButton({
  action,
  kind,
  isBusy,
  onRun,
}: {
  action: ResumeRenderAction;
  kind: "pdf" | "ats";
  isBusy: boolean;
  onRun: () => Promise<void>;
}) {
  const tooltipId = useId();
  const icon = kind === "pdf" ? <Download size={14} /> : <FileText size={14} />;
  const title = action.disabled && action.disabledReason ? `${action.label}: ${action.disabledReason}` : action.label;
  const className = `hero__export-button${action.disabled ? " hero__export-button--disabled" : ""}`;

  if (action.disabled) {
    return (
      <span className="hero__export-tooltip-anchor" tabIndex={0} aria-describedby={tooltipId}>
        <span className={className} aria-disabled="true" role="button">
          <span className="hero__export-button-icon" aria-hidden="true">{icon}</span>
          <span>{action.label}</span>
        </span>
        {action.disabledReason ? (
          <span id={tooltipId} role="tooltip" className="hero__export-tooltip">
            {action.disabledReason}
          </span>
        ) : null}
      </span>
    );
  }

  if (action.href) {
    return (
      <a
        className={className}
        href={action.href}
        download={action.download}
        rel={isExternalLink(action.href) ? "noreferrer noopener" : undefined}
        target={isExternalLink(action.href) ? "_blank" : undefined}
        title={title}
      >
        <span className="hero__export-button-icon" aria-hidden="true">{icon}</span>
        <span>{action.label}</span>
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      disabled={action.disabled || isBusy}
      title={title}
      aria-label={title}
      onClick={() => void onRun()}
    >
      <span className="hero__export-button-icon" aria-hidden="true">{icon}</span>
      <span>{action.label}</span>
    </button>
  );
}

function AtsExportDropdown({ label, items }: { label: string; items: ResumeRenderAction[] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const firstItem = containerRef.current?.querySelector<HTMLElement>(".hero__export-menu-item");
      firstItem?.focus();
    }
  }, [open]);

  return (
    <div className="hero__export-dropdown" ref={containerRef}>
      <button
        type="button"
        ref={buttonRef}
        className="hero__export-button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="hero__export-button-icon" aria-hidden="true">
          <FileText size={14} />
        </span>
        <span>{label}</span>
        <span className={`hero__export-button-chevron${open ? " hero__export-button-chevron--open" : ""}`} aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </button>
      {open ? (
        <div className="hero__export-menu" id={menuId} role="menu" aria-label={label}>
          {items.map((item, index) => (
            <a
              key={`${item.label}-${index}`}
              role="menuitem"
              className="hero__export-menu-item"
              href={item.href}
              download={item.download}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function ResumeRenderer({
  locale,
  resume,
  mode = "public",
  languages = [],
  activeLocale,
  onLanguageSelect,
  status = "draft",
  aiGenerated = false,
  roleOverride,
  showChrome = true,
  isBusy = false,
  labels,
  actions,
  scrollContainerRef,
  embedded = false,
}: Props) {
  const rendererLabels = buildResumeRendererLabels(locale, labels);
  const config = buildResumeRenderConfig({
    mode,
    activeLocale: activeLocale || locale,
    chrome: {
      visible: showChrome,
      status,
      aiGenerated,
      languages,
      isBusy,
      actions,
    },
  });
  const { toast, showToast, closeToast } = useStatusToast();
  const [heroDocked, setHeroDocked] = useState(false);
  const [busyAction, setBusyAction] = useState<"pdf" | "ats" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const defaultSummary = getDefaultSummary(resume.summary);
  const role = getResumeHeroRole(resume, roleOverride);
  const visibleLanguages = config.chrome.languages || [];
  const isEmbedded = Boolean(scrollContainerRef) || embedded;
  const allowStickyHero = (config.mode === "public" || Boolean(scrollContainerRef)) && config.chrome.visible;
  const rootClassName = [
    "resume-view-page",
    "resume-renderer",
    "resume-template--sample-two-column",
    "resume-theme--cv-basic-dot",
    `resume-render-mode--${config.mode}`,
    config.mode === "editor" || config.mode === "preview" ? "resume-editor-basic" : "",
    !config.chrome.visible ? "resume-editor-basic--plain resume-renderer--plain" : "",
    isEmbedded ? "resume-renderer--embedded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!allowStickyHero) {
      setHeroDocked(false);
      return;
    }

    const container = scrollContainerRef?.current ?? null;

    const updateHeroShadow = () => {
      const hero = rootRef.current?.querySelector<HTMLElement>(".hero");
      if (!hero) return;

      let isDocked: boolean;
      if (container) {
        const containerTop = container.getBoundingClientRect().top;
        const heroTop = hero.getBoundingClientRect().top;
        isDocked = container.scrollTop > 0 && heroTop <= containerTop + 1;
      } else {
        const appHeaderHeight =
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--app-header-height")) || 0;
        isDocked = window.scrollY > 0 && hero.getBoundingClientRect().top <= appHeaderHeight + 1;
      }
      setHeroDocked(isDocked);
    };

    updateHeroShadow();

    if (container) {
      container.addEventListener("scroll", updateHeroShadow, { passive: true });
    } else {
      window.addEventListener("scroll", updateHeroShadow, { passive: true });
      window.addEventListener("resize", updateHeroShadow);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", updateHeroShadow);
      } else {
        window.removeEventListener("scroll", updateHeroShadow);
        window.removeEventListener("resize", updateHeroShadow);
      }
    };
  }, [allowStickyHero, scrollContainerRef]);

  async function runAction(kind: "pdf" | "ats") {
    const action = config.chrome.actions?.[kind];
    if (!action || action.disabled || !action.onClick) {
      return;
    }

    try {
      setBusyAction(kind);
      await action.onClick();
    } catch (error) {
      const fallbackMessage = kind === "pdf" ? rendererLabels.pdfExportError : `${rendererLabels.atsAction} export failed.`;
      showToast(error instanceof Error && error.message ? error.message : fallbackMessage, "error");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className={rootClassName} ref={rootRef}>
      <StatusToast toast={toast} onClose={closeToast} />

      <div className="resume">
        <header className={`hero ${heroDocked ? "hero--scrolled" : ""}`}>
          <div className="hero__title">
            <div className="logo-circle">{resume.brand_initials || "CV"}</div>
            <div className="hero__identity">
              <h1>{resume.name || "Your Name"}</h1>
              {role ? <p>{role}</p> : null}
            </div>
          </div>

          {config.chrome.visible ? (
            <div className="hero__actions">
              <div className="hero__language">
                <ResumeLanguageSwitcher
                  languages={visibleLanguages}
                  activeLocale={config.chrome.activeLocale}
                  ariaLabel={rendererLabels.languageSwitcher}
                  isBusy={Boolean(config.chrome.isBusy)}
                  onSelect={onLanguageSelect}
                />
              </div>

              <ResumeBadges
                status={config.chrome.status || "draft"}
                aiGenerated={Boolean(config.chrome.aiGenerated)}
                labels={{
                  public: rendererLabels.publicBadge,
                  draft: rendererLabels.draftBadge,
                  aiGenerated: rendererLabels.aiGeneratedBadge,
                }}
              />

              {config.chrome.actions?.pdf || config.chrome.actions?.ats ? (
                <div className="hero__export-group">
                  <div className="hero__export-actions" aria-label="Resume export actions">
                    {config.chrome.actions?.pdf ? (
                      <ResumeActionButton
                        action={config.chrome.actions.pdf}
                        kind="pdf"
                        isBusy={busyAction === "pdf"}
                        onRun={() => runAction("pdf")}
                      />
                    ) : null}
                    {config.chrome.actions?.atsMenu?.length ? (
                      <AtsExportDropdown
                        label={config.chrome.actions.ats?.label || rendererLabels.atsAction}
                        items={config.chrome.actions.atsMenu}
                      />
                    ) : config.chrome.actions?.ats ? (
                      <ResumeActionButton
                        action={config.chrome.actions.ats}
                        kind="ats"
                        isBusy={busyAction === "ats"}
                        onRun={() => runAction("ats")}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </header>

        <main className="layout">
          <section className="main-column">
            {defaultSummary ? (
              <article className="section resume-section resume-section--summary">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.summary}</h2>
                </div>
                <p className="summary-text">{defaultSummary.description}</p>
              </article>
            ) : null}

            {resume.experience.length > 0 ? (
              <article className="section resume-section resume-section--experience">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.experience}</h2>
                </div>
                <div className="timeline">
                  {resume.experience.map((item, index) => (
                    <div key={`${item.company}-${index}`} className="timeline-item">
                      <div className="timeline-item__period">{item.period}</div>
                      <div className="timeline-item__content">
                        <h3>{item.company || "Company"}</h3>
                        <p className="timeline-item__subheading">{item.role || "Role"}</p>
                        {item.highlights.length > 0 ? (
                          <ul className="item-list">
                            {item.highlights.map((highlight, highlightIndex) => (
                              <li key={`${highlight}-${highlightIndex}`}>{highlight}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ) : null}

            {resume.education.length > 0 ? (
              <article className="section resume-section resume-section--education">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.education}</h2>
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
            ) : null}

            {resume.courses.length > 0 ? (
              <article className="section resume-section resume-section--courses">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.courses}</h2>
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
            ) : null}
          </section>

          <aside className="sidebar">
            <section className="card resume-section resume-section--personal">
              <div className="section-title">
                <span className="section-dot"></span>
                <h2>{rendererLabels.personalInfo}</h2>
              </div>
              <dl className="contact-list">
                {resume.contact.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="contact-item">
                    <dt>{item.label}</dt>
                    <dd>
                      {item.link ? (
                        <a
                          href={item.link}
                          target={isExternalLink(item.link) ? "_blank" : undefined}
                          rel={isExternalLink(item.link) ? "noreferrer noopener" : undefined}
                        >
                          {item.value}
                        </a>
                      ) : (
                        item.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {resume.skills.length > 0 ? (
              <section className="card resume-section resume-section--skills">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.skills}</h2>
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
            ) : null}

            {resume.tech_stack.length > 0 ? (
              <section className="card resume-section resume-section--tech-stack">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.techStack}</h2>
                </div>
                <ul className="pill-list">
                  {resume.tech_stack.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {resume.languages.length > 0 ? (
              <section className="card resume-section resume-section--languages">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.languages}</h2>
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
            ) : null}

            {resume.interests.length > 0 ? (
              <section className="card resume-section resume-section--interests">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>{rendererLabels.interests}</h2>
                </div>
                <ul className="pill-list">
                  {resume.interests.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        </main>
      </div>
    </div>
  );
}
