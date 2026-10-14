"use client";

import { useState } from "react";
import { BasicResumeDocument } from "../components/resume-renderer/BasicResumeDocument";
import type { ResumeRendererLabels } from "../components/resume-renderer/build-resume-render-model";
import type { ResumeLanguageOption } from "../components/resume-language-switcher";
import type { SampleResumeData, SampleResumeLabels } from "../lib/sample-resume";

function buildRendererLabels(labels: SampleResumeLabels): Partial<ResumeRendererLabels> {
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

type Props = {
  initialLocale: string;
  /** Loaded on the server (`loadSampleResumeData`) so the CV is in the initial HTML. */
  data: SampleResumeData;
  showChrome?: boolean;
  /** Keeps the CV inside its container instead of breaking out to 100vw. */
  embedded?: boolean;
};

export default function ResumeViewClient({ initialLocale, data, showChrome = true, embedded = false }: Props) {
  const startLocale = data.locales.some((locale) => locale.code === initialLocale) ? initialLocale : data.defaultLocale;
  const [activeCode, setActiveCode] = useState(startLocale);
  const active = data.locales.find((locale) => locale.code === activeCode) ?? data.locales[0];

  const languageOptions: ResumeLanguageOption[] = data.locales.map((locale) => ({
    code: locale.code,
    label: locale.label,
    shortLabel: locale.code.slice(0, 2).toUpperCase(),
  }));

  return (
    <BasicResumeDocument
      locale={active.code}
      resume={active.resume}
      mode="public"
      showChrome={showChrome}
      embedded={embedded}
      languages={languageOptions}
      onLanguageSelect={setActiveCode}
      status="public"
      roleOverride={active.role}
      labels={buildRendererLabels(active.labels)}
    />
  );
}
