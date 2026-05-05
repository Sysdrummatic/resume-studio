"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
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

type ResumeLabels = {
  language_switcher: string;
  summary_heading: string;
  github_activity_heading: string;
  experience_heading: string;
  education_heading: string;
  courses_heading: string;
  personal_info_heading: string;
  skills_heading: string;
  tech_stack_heading: string;
  languages_heading: string;
  interests_heading: string;
  public_view_badge: string;
  private_view_badge: string;
  edit_button_label: string;
  save_button_label: string;
};

type ResumeViewConfig = {
  locale: string;
  language_name: string;
  labels: ResumeLabels;
};

type ContactItem = {
  label: string;
  value: string | number;
  link?: string;
};

type SummaryItem = {
  position: string;
  description: string;
  default: boolean | string;
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
  summary?: string | SummaryItem[];
  contact?: ContactItem[];
  skills?: MeterItem[];
  tech_stack?: string[];
  languages?: LanguageItem[];
  interests?: string[];
  experience?: ExperienceItem[];
  education?: EducationItem[];
  courses?: CourseItem[];
};

type ResumeStyle = {
  code: string;
  label: string;
};

type ResumeThemeStyle = CSSProperties & Record<`--${string}`, string>;

const DEFAULT_ACCENT_COLOR = "#009c8a";
const ACCENT_COLOR_STORAGE_KEY = "resume-studio:sample-cv-accent-color";
const RESUME_STYLE_STORAGE_KEY = "resume-studio:sample-cv-style";
const HEADER_MENU_OPEN_EVENT = "app-header-menu-open";
const STYLE_SELECTOR_MENU_NAME = "resume-style-selector";

const AVAILABLE_RESUME_STYLES: ResumeStyle[] = [
  {
    code: "basic",
    label: "basic",
  },
];

const DEFAULT_LABELS: ResumeLabels = {
  language_switcher: "Language",
  summary_heading: "Summary",
  github_activity_heading: "GitHub Activity",
  experience_heading: "Experience",
  education_heading: "Education",
  courses_heading: "Courses",
  personal_info_heading: "Personal Info",
  skills_heading: "Skills",
  tech_stack_heading: "Tech stack",
  languages_heading: "Languages",
  interests_heading: "Interests",
  public_view_badge: "Public view",
  private_view_badge: "Private view",
  edit_button_label: "Edit",
  save_button_label: "Save",
};

const REQUIRED_LABEL_KEYS = Object.keys(DEFAULT_LABELS) as Array<keyof ResumeLabels>;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function announceHeaderMenuOpen(menuName: string) {
  document.dispatchEvent(new CustomEvent(HEADER_MENU_OPEN_EVENT, { detail: menuName }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKnownResumeStyle(value: string) {
  return AVAILABLE_RESUME_STYLES.some((style) => style.code === value);
}

function createAccentThemeStyle(color: string): ResumeThemeStyle {
  return {
    "--accent": color,
    "--accent-dark": `color-mix(in srgb, ${color} 78%, #000000)`,
    "--accent-light": `color-mix(in srgb, ${color} 12%, #ffffff)`,
  };
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

function isSummaryItem(value: unknown): value is SummaryItem {
  if (!isRecord(value)) return false;

  return (
    typeof value.position === "string" &&
    typeof value.description === "string" &&
    (typeof value.default === "boolean" || typeof value.default === "string")
  );
}

function isDefaultSummary(value: SummaryItem) {
  return value.default === true || (typeof value.default === "string" && value.default.trim().toLowerCase() === "true");
}

function getVisibleSummary(summary: ResumeData["summary"]) {
  if (typeof summary === "string") {
    return summary.trim();
  }
  if (!Array.isArray(summary)) {
    return "";
  }
  const defaults = summary.filter(isDefaultSummary);
  return defaults.length === 1 ? defaults[0].description.trim() : "";
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

function isResumeLabels(value: unknown): value is ResumeLabels {
  if (!isRecord(value)) return false;

  return REQUIRED_LABEL_KEYS.every((key) => typeof value[key] === "string");
}

function isResumeViewConfig(value: unknown): value is ResumeViewConfig {
  if (!isRecord(value)) return false;

  return (
    typeof value.locale === "string" &&
    typeof value.language_name === "string" &&
    isResumeLabels(value.labels)
  );
}

function isResumeData(value: unknown): value is ResumeData {
  if (!isRecord(value)) return false;

  return (
    hasOptionalString(value, "brand_initials") &&
    hasOptionalString(value, "name") &&
    hasOptionalString(value, "role") &&
    (value.summary === undefined || typeof value.summary === "string" || (Array.isArray(value.summary) && value.summary.every(isSummaryItem))) &&
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
  const [viewConfig, setViewConfig] = useState<ResumeViewConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJsYamlLoaded, setIsJsYamlLoaded] = useState(false);
  const [isHeroDocked, setIsHeroDocked] = useState(false);
  const [isStyleSelectorOpen, setIsStyleSelectorOpen] = useState(false);
  const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
  const [selectedStyle, setSelectedStyle] = useState(AVAILABLE_RESUME_STYLES[0].code);
  const styleSelectorRef = useRef<HTMLDivElement>(null);

  const fetchYaml = useCallback(async <T,>(path: string, validate: (value: unknown) => value is T) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    const text = await response.text();
    if (!window.jsyaml) throw new Error("YAML parser is not loaded");

    const data = window.jsyaml.load(text);
    if (!validate(data)) throw new Error(`Invalid YAML structure in ${path}`);

    return data;
  }, []);

  const handleLocaleChange = useCallback(async (localeCode: string, config: LocalesConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const locale = config.locales.find((l) => l.code === localeCode) || config.locales[0];
      const [data, loadedViewConfig] = await Promise.all([
        fetchYaml(`/${locale.resume_path}`, isResumeData),
        locale.config_path
          ? fetchYaml(`/${locale.config_path}`, isResumeViewConfig)
          : Promise.resolve<ResumeViewConfig | null>(null),
      ]);

      setResumeData(data);
      setViewConfig(loadedViewConfig);
      setActiveLocale(locale.code);
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
    const storedAccentColor = window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY);
    const storedStyle = window.localStorage.getItem(RESUME_STYLE_STORAGE_KEY);

    if (storedAccentColor && HEX_COLOR_PATTERN.test(storedAccentColor)) {
      setAccentColor(storedAccentColor);
    }

    if (storedStyle && isKnownResumeStyle(storedStyle)) {
      setSelectedStyle(storedStyle);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, accentColor);
  }, [accentColor]);

  useEffect(() => {
    window.localStorage.setItem(RESUME_STYLE_STORAGE_KEY, selectedStyle);
  }, [selectedStyle]);

  useEffect(() => {
    if (!isStyleSelectorOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && styleSelectorRef.current?.contains(target)) {
        return;
      }
      setIsStyleSelectorOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
    };
  }, [isStyleSelectorOpen]);

  useEffect(() => {
    function handleHeaderMenuOpen(event: Event) {
      if (event instanceof CustomEvent && event.detail !== STYLE_SELECTOR_MENU_NAME) {
        setIsStyleSelectorOpen(false);
      }
    }

    document.addEventListener(HEADER_MENU_OPEN_EVENT, handleHeaderMenuOpen);

    return () => {
      document.removeEventListener(HEADER_MENU_OPEN_EVENT, handleHeaderMenuOpen);
    };
  }, []);

  useEffect(() => {
    if (!isJsYamlLoaded) return;

    async function init() {
      console.log("[ResumeView] Initializing with js-yaml...");
      try {
        const config = await fetchYaml("/data/public/locales.yaml", isLocalesConfig);
        console.log("[ResumeView] Locales config loaded:", config);
        setLocalesConfig(config);
        await handleLocaleChange(config.default_locale, config);
      } catch (err) {
        console.error("[ResumeView] Initialization failed:", err);
        setError(err instanceof Error ? err.message : "Initialization failed");
        setIsLoading(false);
      }
    }

    void init();
  }, [isJsYamlLoaded, fetchYaml, handleLocaleChange]);

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
  const labels = viewConfig?.labels ?? DEFAULT_LABELS;
  const selectedStyleLabel = AVAILABLE_RESUME_STYLES.find((style) => style.code === selectedStyle)?.label ?? selectedStyle;
  const resumeThemeStyle = createAccentThemeStyle(accentColor);
  const visibleSummary = getVisibleSummary(summary);

  return (
    <div className={`resume-view-page resume-style--${selectedStyle}`} style={resumeThemeStyle}>
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
          <div
            className={`resume-style-selector ${isStyleSelectorOpen ? "resume-style-selector--open" : ""}`}
            ref={styleSelectorRef}
          >
            <button
              className="resume-style-selector__trigger"
              type="button"
              aria-expanded={isStyleSelectorOpen}
              aria-controls="resume-style-selector-panel"
              aria-label="Open CV style selector"
              onClick={() => {
                setIsStyleSelectorOpen((current) => {
                  const nextIsOpen = !current;
                  if (nextIsOpen) {
                    announceHeaderMenuOpen(STYLE_SELECTOR_MENU_NAME);
                  }
                  return nextIsOpen;
                });
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                <path d="M14.7 4.3c1.1-1.1 2.9-1.1 4 0s1.1 2.9 0 4l-7.9 7.9-4.1.9.9-4.1 7.1-8.7Z" />
                <path d="M5.1 17.8c-1.5.5-2.5 1.5-2.5 2.6 0 .9.8 1.6 1.8 1.6 1.8 0 3.3-1.1 3.8-2.7" />
              </svg>
            </button>

            <div className="resume-style-selector__panel" id="resume-style-selector-panel">
              <label
                className="resume-style-selector__color"
                style={{ backgroundColor: accentColor }}
                aria-label="Change CV accent color"
              >
                <input
                  type="color"
                  value={accentColor}
                  onChange={(event) => setAccentColor(event.target.value)}
                />
              </label>

              <details className="resume-style-selector__style-menu">
                <summary>{selectedStyleLabel}</summary>
                <div className="resume-style-selector__style-options">
                  {AVAILABLE_RESUME_STYLES.map((style) => (
                    <button
                      key={style.code}
                      type="button"
                      className={selectedStyle === style.code ? "resume-style-selector__style-option--active" : ""}
                      onClick={(event) => {
                        setSelectedStyle(style.code);
                        event.currentTarget.closest("details")?.removeAttribute("open");
                      }}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </div>

          <header className={`hero ${isHeroDocked ? "hero--scrolled" : ""}`}>
            <div className="hero__title">
              <div className="logo-circle">{brand_initials || "LM"}</div>
              <div className="hero__identity">
                <h1>{name}</h1>
                <p>{role}</p>
              </div>
            </div>
            <div className="hero__actions">
              <div className="language-switcher" aria-label={labels.language_switcher}>
                {localesConfig?.locales.map((l) => (
                  <button
                    key={l.code}
                    className={`language-switcher__option ${activeLocale === l.code ? "language-switcher__option--active" : ""}`}
                    onClick={() => void handleLocaleChange(l.code, localesConfig)}
                    disabled={isLoading}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <span className="public-view-badge">{labels.public_view_badge}</span>
            </div>
          </header>

          <main className="layout">
            <section className="main-column">
              {visibleSummary && (
                <article className="section resume-section resume-section--summary">
                  <div className="section-title">
                    <span className="section-dot"></span>
                    <h2>{labels.summary_heading}</h2>
                  </div>
                  <p className="summary-text">{visibleSummary}</p>
                </article>
              )}

              {experience && experience.length > 0 && (
                <article className="section resume-section resume-section--experience">
                  <div className="section-title">
                    <span className="section-dot"></span>
                    <h2>{labels.experience_heading}</h2>
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
                    <h2>{labels.education_heading}</h2>
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
                    <h2>{labels.courses_heading}</h2>
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
                  <h2>{labels.personal_info_heading}</h2>
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
                    <h2>{labels.skills_heading}</h2>
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
                    <h2>{labels.tech_stack_heading}</h2>
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
                    <h2>{labels.languages_heading}</h2>
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
                    <h2>{labels.interests_heading}</h2>
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
