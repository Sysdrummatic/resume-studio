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

type ContactItem = {
  label: string;
  value: string | number;
  link?: string;
};

type MeterItem = {
  name: string;
  level?: number;
  level_text?: string;
};

type LanguageItem = MeterItem;

type ExperienceItem = {
  period: string;
  company: string;
  role: string;
  highlights?: string[];
};

type EducationItem = {
  period: string;
  school: string;
  detail?: string;
};

type CourseItem = {
  year: string | number;
  name: string;
};

type ResumeData = {
  brand_initials?: string;
  name?: string;
  role?: string;
  summary?: string;
  contact?: ContactItem[];
  skills?: MeterItem[];
  tech_stack?: string[];
  languages?: LanguageItem[];
  interests?: string[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  courses?: CourseItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasOptionalString(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === "string";
}

function hasOptionalStringOrNumber(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === "string" || typeof value[key] === "number";
}

function hasOptionalNumber(value: Record<string, unknown>, key: string) {
  return value[key] === undefined || typeof value[key] === "number";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasOptionalArray<T>(
  value: Record<string, unknown>,
  key: string,
  validateItem: (item: unknown) => item is T,
) {
  const items = value[key];
  return items === undefined || (Array.isArray(items) && items.every(validateItem));
}

function isContactItem(value: unknown): value is ContactItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.label === "string" &&
    (typeof value.value === "string" || typeof value.value === "number") &&
    hasOptionalString(value, "link")
  );
}

function isMeterItem(value: unknown): value is MeterItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    hasOptionalNumber(value, "level") &&
    hasOptionalString(value, "level_text")
  );
}

function isLanguageItem(value: unknown): value is LanguageItem {
  return isMeterItem(value) && hasOptionalString(value, "level_text");
}

function isExperienceItem(value: unknown): value is ExperienceItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.period === "string" &&
    typeof value.company === "string" &&
    typeof value.role === "string" &&
    (value.highlights === undefined || isStringArray(value.highlights))
  );
}

function isEducationItem(value: unknown): value is EducationItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.period === "string" &&
    typeof value.school === "string" &&
    hasOptionalString(value, "detail")
  );
}

function isCourseItem(value: unknown): value is CourseItem {
  if (!isRecord(value)) return false;

  return hasOptionalStringOrNumber(value, "year") && typeof value.name === "string";
}

function isResumeLocale(value: unknown): value is ResumeLocale {
  if (!isRecord(value)) return false;

  return (
    typeof value.code === "string" &&
    typeof value.label === "string" &&
    typeof value.resume_path === "string" &&
    (value.config_path === undefined || typeof value.config_path === "string")
  );
}

function isLocalesConfig(value: unknown): value is LocalesConfig {
  if (!isRecord(value)) return false;

  return (
    typeof value.default_locale === "string" &&
    Array.isArray(value.locales) &&
    value.locales.every(isResumeLocale)
  );
}

function isResumeData(value: unknown): value is ResumeData {
  if (!isRecord(value)) return false;

  return (
    hasOptionalString(value, "brand_initials") &&
    hasOptionalString(value, "name") &&
    hasOptionalString(value, "role") &&
    hasOptionalString(value, "summary") &&
    hasOptionalArray(value, "contact", isContactItem) &&
    hasOptionalArray(value, "skills", isMeterItem) &&
    (value.tech_stack === undefined || isStringArray(value.tech_stack)) &&
    hasOptionalArray(value, "languages", isLanguageItem) &&
    (value.interests === undefined || isStringArray(value.interests)) &&
    hasOptionalArray(value, "experience", isExperienceItem) &&
    hasOptionalArray(value, "education", isEducationItem) &&
    hasOptionalArray(value, "courses", isCourseItem)
  );
}

export default function ResumeViewClient() {
  const [localesConfig, setLocalesConfig] = useState<LocalesConfig | null>(null);
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJsYamlLoaded, setIsJsYamlLoaded] = useState(false);
  const [isHeroDocked, setIsHeroDocked] = useState(false);

  const fetchYaml = useCallback(async <T,>(path: string, validate: (value: unknown) => value is T) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const text = await response.text();
    if (!window.jsyaml) throw new Error("YAML parser is not loaded");

    const data = window.jsyaml.load(text);
    if (!validate(data)) throw new Error(`Invalid YAML structure in ${path}`);

    return data;
  }, []);

  const loadData = useCallback(async (localeCode: string, config: LocalesConfig) => {
    setIsLoading(true);
    try {
      const locale = config.locales.find((l) => l.code === localeCode) || config.locales[0];
      const data = await fetchYaml(`/${locale.resume_path}`, isResumeData);
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
    if (typeof window !== "undefined" && window.jsyaml) {
      setIsJsYamlLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isJsYamlLoaded) return;

    async function init() {
      console.log("[ResumeView] Initializing with js-yaml...");
      try {
        const config = await fetchYaml("/data/public/locales.yaml", isLocalesConfig);
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
                    {experience.map((item, idx) => (
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
                    {education.map((item, idx) => (
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
                    {courses.map((item, idx) => (
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
                  {contact?.map((item, idx) => (
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
                    {skills.map((item, idx) => (
                      <div key={idx} className="meter-item meter-item--plain">
                        <div className="meter-item__label">
                          <span>{item.name}</span>
                          {item.level_text && <span className="meter-item__note">{item.level_text}</span>}
                        </div>
                        <div className="meter">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`meter__dot ${s <= (item.level || 0) ? "meter__dot--active" : ""}`}
                            ></span>
                          ))}
                        </div>
                      </div>
                    ))}
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
                    {tech_stack.map((item, idx) => (
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
                    {languages.map((item, idx) => (
                      <div key={idx} className="meter-item meter-item--plain">
                        <div className="meter-item__label">
                          <span>{item.name}</span>
                          {item.level_text && <span className="meter-item__note">{item.level_text}</span>}
                        </div>
                        <div className="meter">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`meter__dot ${s <= (item.level || 0) ? "meter__dot--active" : ""}`}
                            ></span>
                          ))}
                        </div>
                      </div>
                    ))}
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
                    {interests.map((item, idx) => (
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
