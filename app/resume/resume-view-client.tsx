"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { StatusToast, useStatusToast } from "../components/status-toast";
import { BasicResumeDocument } from "../components/resume-renderer/BasicResumeDocument";
import type { ResumeRendererLabels } from "../components/resume-renderer/build-resume-render-model";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeDocument } from "../lib/resume-schema";
import type { ResumeLanguageOption } from "../components/resume-language-switcher";

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
  language_switcher?: string;
  summary_heading?: string;
  experience_heading?: string;
  education_heading?: string;
  courses_heading?: string;
  personal_info_heading?: string;
  skills_heading?: string;
  tech_stack_heading?: string;
  languages_heading?: string;
  interests_heading?: string;
  public_view_badge?: string;
  draft_view_badge?: string;
  ai_generated_badge?: string;
};

type ResumeViewConfig = {
  locale: string;
  language_name: string;
  labels: ResumeLabels;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResumeLocale(value: unknown): value is ResumeLocale {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.code === "string" &&
    typeof value.label === "string" &&
    typeof value.resume_path === "string" &&
    (value.config_path === undefined || typeof value.config_path === "string")
  );
}

function isLocalesConfig(value: unknown): value is LocalesConfig {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.default_locale === "string" && Array.isArray(value.locales) && value.locales.every(isResumeLocale);
}

function isResumeViewConfig(value: unknown): value is ResumeViewConfig {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.locale === "string" && typeof value.language_name === "string" && isRecord(value.labels);
}

function buildRendererLabels(config: ResumeViewConfig | null): Partial<ResumeRendererLabels> {
  const labels = config?.labels || {};

  return {
    languageSwitcher: labels.language_switcher,
    summary: labels.summary_heading,
    experience: labels.experience_heading,
    education: labels.education_heading,
    courses: labels.courses_heading,
    personalInfo: labels.personal_info_heading,
    skills: labels.skills_heading,
    techStack: labels.tech_stack_heading,
    languages: labels.languages_heading,
    interests: labels.interests_heading,
    publicBadge: labels.public_view_badge,
    draftBadge: labels.draft_view_badge,
    aiGeneratedBadge: labels.ai_generated_badge,
  };
}

function extractRole(value: unknown): string {
  return isRecord(value) && typeof value.role === "string" ? value.role.trim() : "";
}

export default function ResumeViewClient() {
  const [localesConfig, setLocalesConfig] = useState<LocalesConfig | null>(null);
  const [activeLocale, setActiveLocale] = useState<string>("en");
  const [resumeData, setResumeData] = useState<ResumeDocument | null>(null);
  const [resumeRole, setResumeRole] = useState("");
  const [viewConfig, setViewConfig] = useState<ResumeViewConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJsYamlLoaded, setIsJsYamlLoaded] = useState(false);
  const { toast, showToast, closeToast } = useStatusToast();

  const fetchYaml = useCallback(async <T,>(path: string, validate?: (value: unknown) => value is T): Promise<T> => {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    const text = await response.text();
    if (!window.jsyaml) {
      throw new Error("YAML parser is not loaded.");
    }

    const data = window.jsyaml.load(text);
    if (validate && !validate(data)) {
      throw new Error(`Invalid YAML structure in ${path}`);
    }

    return data as T;
  }, []);

  const handleLocaleChange = useCallback(async (localeCode: string, config: LocalesConfig) => {
    setIsLoading(true);
    setError(null);

    try {
      const locale = config.locales.find((item) => item.code === localeCode) || config.locales[0];
      const [rawResume, loadedViewConfig] = await Promise.all([
        fetchYaml<unknown>(`/${locale.resume_path}`),
        locale.config_path
          ? fetchYaml<ResumeViewConfig>(`/${locale.config_path}`, isResumeViewConfig)
          : Promise.resolve<ResumeViewConfig | null>(null),
      ]);

      setResumeData(normalizeResumeDocument(rawResume, "Ariana Holt"));
      setResumeRole(extractRole(rawResume));
      setViewConfig(loadedViewConfig);
      setActiveLocale(locale.code);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : "Unknown error";
      setError(message);
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [fetchYaml, showToast]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.jsyaml) {
      setIsJsYamlLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isJsYamlLoaded) {
      return;
    }

    async function init() {
      try {
        const config = await fetchYaml<LocalesConfig>("/data/public/locales.yaml", isLocalesConfig);
        setLocalesConfig(config);
        await handleLocaleChange(config.default_locale, config);
      } catch (nextError) {
        const message = nextError instanceof Error ? nextError.message : "Initialization failed";
        setError(message);
        showToast(message, "error");
        setIsLoading(false);
      }
    }

    void init();
  }, [fetchYaml, handleLocaleChange, isJsYamlLoaded, showToast]);

  const languageOptions: ResumeLanguageOption[] = localesConfig?.locales.map((locale) => ({
    code: locale.code,
    label: locale.label,
    shortLabel: locale.code.slice(0, 2).toUpperCase(),
  })) || [];

  return (
    <>
      <Script
        src="/vendor/js-yaml.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          setIsJsYamlLoaded(true);
        }}
      />

      <StatusToast toast={toast} onClose={closeToast} />

      {(isLoading || !resumeData) && !error ? (
        <div className="loading-indicator">Loading sample resume...</div>
      ) : null}

      {resumeData ? (
        <BasicResumeDocument
          locale={activeLocale}
          resume={resumeData}
          mode="public"
          languages={languageOptions}
          onLanguageSelect={(localeCode) => localesConfig && void handleLocaleChange(localeCode, localesConfig)}
          status="public"
          roleOverride={resumeRole}
          isBusy={isLoading}
          labels={buildRendererLabels(viewConfig)}
        />
      ) : null}
    </>
  );
}
