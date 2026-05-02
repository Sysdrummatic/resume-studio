"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import "./resume.css";

type ResumeLocale = {
  code: string;
  label: string;
  resume_path: string;
  config_path?: string;
};

type LocalesConfig = {
  default_locale: string;
  locales: ResumeLocale[];
};

export default function ResumeViewClient() {
  const [localesConfig, setLocalesConfig] = useState<LocalesConfig | null>(null);
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [resumeData, setResumeData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJsYamlLoaded, setIsJsYamlLoaded] = useState(false);
  const [isHeroDocked, setIsHeroDocked] = useState(false);

  const fetchYaml = useCallback(async (path: string) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const text = await response.text();
    // @ts-ignore
    return window.jsyaml.load(text);
  }, []);

  const loadData = useCallback(async (localeCode: string, config: LocalesConfig) => {
    setIsLoading(true);
    try {
      const locale = config.locales.find((l) => l.code === localeCode) || config.locales[0];
      const data = await fetchYaml(`/${locale.resume_path}`);
      setResumeData(data);
      setActiveLocale(localeCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [fetchYaml]);

  useEffect(() => {
    // Check if script is already loaded (e.g. from previous navigation)
    // @ts-ignore
    if (typeof window !== "undefined" && window.jsyaml) {
      setIsJsYamlLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isJsYamlLoaded) return;

    async function init() {
      console.log("[ResumeView] Initializing with js-yaml...");
      try {
        const config = await fetchYaml("/data/public/locales.yaml");
        console.log("[ResumeView] Locales config loaded:", config);
        setLocalesConfig(config);
        await loadData(config.default_locale, config);
      } catch (err) {
        console.error("[ResumeView] Initialization failed:", err);
        setError(err instanceof Error ? err.message : "Initialization failed");
        setIsLoading(false);
      }
    }

    void init();
  }, [isJsYamlLoaded, fetchYaml, loadData]);

  useEffect(() => {
    if (!resumeData) return;

    const updateHeroShadow = () => {
      const hero = document.querySelector<HTMLElement>(".resume-view-page .hero");
      if (!hero) return;

      const appHeaderHeight = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--app-header-height"),
      ) || 0;
      const isDocked = window.scrollY > 0 && hero.getBoundingClientRect().top <= appHeaderHeight + 1;

      setIsHeroDocked(isDocked);
    };

    updateHeroShadow();
    window.addEventListener("scroll", updateHeroShadow, { passive: true });
    window.addEventListener("resize", updateHeroShadow);

    return () => {
      window.removeEventListener("scroll", updateHeroShadow);
      window.removeEventListener("resize", updateHeroShadow);
    };
  }, [resumeData]);

  const { name, role, summary, contact, skills, experience, education, courses, brand_initials, languages, tech_stack, interests } = resumeData || {};

  return (
    <div className="resume-view-page">
      <Script 
        src="/vendor/js-yaml.min.js" 
        strategy="afterInteractive" 
        onLoad={() => {
          console.log("[ResumeView] js-yaml loaded via Script onLoad");
          setIsJsYamlLoaded(true);
        }}
      />
      
      {error && <div className="status status--error">{error}</div>}
      
      {(isLoading || !resumeData) && !error && (
        <div className="loading-indicator">Loading sample resume...</div>
      )}

      {resumeData && (
        <div className="resume">
          <header className={`hero ${isHeroDocked ? "hero--scrolled" : ""}`}>
          <div className="hero__title">
            <div className="logo-circle">{brand_initials || "LM"}</div>
            <div className="hero__identity">
              <h1>{name}</h1>
              <p>{role}</p>
            </div>
          </div>
          <div className="hero__actions">
            <div className="language-switcher">
              {localesConfig?.locales.map((l) => (
                <button
                  key={l.code}
                  className={`language-switcher__option ${activeLocale === l.code ? "language-switcher__option--active" : ""}`}
                  onClick={() => void loadData(l.code, localesConfig)}
                  disabled={isLoading}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <span className="public-view-badge">Public view</span>
          </div>
        </header>

        <main className="layout">
          <section className="main-column">
            {summary && (
              <article className="section resume-section resume-section--summary">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Summary</h2>
                </div>
                <p className="summary-text">{summary}</p>
              </article>
            )}

            {experience && experience.length > 0 && (
              <article className="section resume-section resume-section--experience">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Experience</h2>
                </div>
                <div className="timeline">
                  {experience.map((item: any, idx: number) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-item__period">{item.period}</div>
                      <div className="timeline-item__content">
                        <h3>{item.company}</h3>
                        <p className="timeline-item__subheading">{item.role}</p>
                        {item.highlights && (
                          <ul className="item-list">
                            {item.highlights.map((h: string, i: number) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {education && education.length > 0 && (
              <article className="section resume-section resume-section--education">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Education</h2>
                </div>
                <div className="timeline timeline--compact">
                  {education.map((item: any, idx: number) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-item__period">{item.period}</div>
                      <div className="timeline-item__content">
                        <h3>{item.school}</h3>
                        <p className="timeline-item__detail">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {courses && courses.length > 0 && (
              <article className="section resume-section resume-section--courses">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Courses</h2>
                </div>
                <div className="timeline timeline--compact timeline--courses">
                  {courses.map((item: any, idx: number) => (
                    <div key={idx} className="timeline-item">
                      <div className="timeline-item__period">{item.year}</div>
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
                <h2>Personal Info</h2>
              </div>
              <dl className="contact-list">
                {contact?.map((item: any, idx: number) => (
                  <div key={idx} className="contact-item">
                    <dt>{item.label}</dt>
                    <dd>
                      {item.link ? (
                        <a href={item.link} target={item.link.startsWith('http') ? "_blank" : undefined} rel="noreferrer noopener">
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

            {skills && skills.length > 0 && (
              <section className="card resume-section resume-section--skills">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Skills</h2>
                </div>
                <div className="meter-list">
                  {skills.map((item: any, idx: number) => {
                    const hasLevel = item.level !== undefined || item.level_text;

                    return (
                      <div key={idx} className={`meter-item ${hasLevel ? "meter-item--plain" : ""}`}>
                        <div className="meter-item__label">
                          <span>{item.name}</span>
                          {item.level_text && <span className="meter-item__note">{item.level_text}</span>}
                        </div>
                        {item.level !== undefined && (
                          <div className="meter">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`meter__dot ${s <= (item.level || 0) ? "meter__dot--active" : ""}`}></span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {tech_stack && tech_stack.length > 0 && (
              <section className="card resume-section resume-section--tech-stack">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Tech stack</h2>
                </div>
                <ul className="pill-list">
                  {tech_stack.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            )}

            {languages && languages.length > 0 && (
              <section className="card resume-section resume-section--languages">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Languages</h2>
                </div>
                <div className="meter-list meter-list--compact">
                  {languages.map((item: any, idx: number) => {
                    const hasLevel = item.level !== undefined || item.level_text;

                    return (
                      <div key={idx} className={`meter-item ${hasLevel ? "meter-item--plain" : ""}`}>
                        <div className="meter-item__label">
                          <span>{item.name}</span>
                          {item.level_text && <span className="meter-item__note">{item.level_text}</span>}
                        </div>
                        {item.level !== undefined && (
                          <div className="meter">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={`meter__dot ${s <= (item.level || 0) ? "meter__dot--active" : ""}`}></span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {interests && interests.length > 0 && (
              <section className="card resume-section resume-section--interests">
                <div className="section-title">
                  <span className="section-dot"></span>
                  <h2>Interests</h2>
                </div>
                <ul className="pill-list">
                  {interests.map((item: string, idx: number) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </main>
      </div>
      )}
    </div>
  );
}
