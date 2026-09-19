import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { getRequestAppI18n } from "../i18n/server";
import { normalizeResumeDocument } from "../lib/resume-schema";
import type { ResumeRendererLabels } from "../components/resume-renderer/build-resume-render-model";
import ResumeRenderer, { type ResumeVisualTemplate } from "../components/resume-renderer/ResumeRenderer";
import styles from "./templates.module.css";

type DictionaryRecord = Record<string, unknown>;

function asRecord(value: unknown): DictionaryRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DictionaryRecord) : {};
}

function asText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

async function loadResume(locale: string) {
  const fileLocale = locale === "pl" ? "pl" : "en";
  const dataRoot = path.join(process.cwd(), "public", "data", "public");
  const [resumeYaml, configYaml] = await Promise.all([
    readFile(path.join(dataRoot, `resume-${fileLocale}.yaml`), "utf8"),
    readFile(path.join(dataRoot, "config", `${fileLocale}.yaml`), "utf8"),
  ]);
  const rawConfig = asRecord(yaml.load(configYaml));
  const rawLabels = asRecord(rawConfig.labels);
  const labels: Partial<ResumeRendererLabels> = {
    summary: asText(rawLabels.summary_heading, "Summary"),
    experience: asText(rawLabels.experience_heading, "Experience"),
    education: asText(rawLabels.education_heading, "Education"),
    courses: asText(rawLabels.courses_heading, "Courses"),
    personalInfo: asText(rawLabels.personal_info_heading, "Personal info"),
    skills: asText(rawLabels.skills_heading, "Skills"),
    techStack: asText(rawLabels.tech_stack_heading, "Tech stack"),
    languages: asText(rawLabels.languages_heading, "Languages"),
    interests: asText(rawLabels.interests_heading, "Interests"),
  };

  return {
    locale: fileLocale,
    resume: normalizeResumeDocument(yaml.load(resumeYaml), "Ariana Holt"),
    labels,
  };
}

const templateCards: Array<{
  id: ResumeVisualTemplate;
  title: string;
  description: string;
  bestFor: string;
}> = [
  {
    id: "signal-grid",
    title: "Signal Grid",
    description: "Precyzyjna siatka redakcyjna, kobaltowa oś informacji i jeden limonkowy sygnał.",
    bestFor: "Product, data, research, engineering",
  },
  {
    id: "atelier-noir",
    title: "Atelier Noir",
    description: "Pełno-szerokościowy ciemny hero, ciepły papier i wyważona typografia redakcyjna.",
    bestFor: "Leadership, strategy, creative technology",
  },
  {
    id: "terminal-stack",
    title: "Terminal Stack",
    description: "Techniczna hierarchia, dyskretna siatka danych i precyzyjnie dozowany akcent cyan.",
    bestFor: "Software engineering, platform, data",
  },
];

export const metadata: Metadata = {
  title: "Propozycje szablonów CV | OpenCiVera",
  description: "Trzy warianty CSS dla aktualnego modelu YAML CV.",
};

export default async function CvTemplatesPage() {
  const { locale } = await getRequestAppI18n();
  const { resume, labels } = await loadResume(locale);
  const sourceLocale = locale === "pl" ? "pl" : "en";

  return (
    <div className={`${styles.showcase} wide-shell-page`}>
      <header className={styles.intro}>
        <p className={styles.kicker}>OpenCiVera / CV studio</p>
        <h1>Trzy dopracowane kierunki dla tego samego CV</h1>
        <p className={styles.lede}>
          To są trzy CSS-owe szablony nałożone na bieżący renderer i bieżący YAML. Zawartość, kolejność sekcji i dane kontaktowe
          pozostają identyczne — zmienia się tylko język wizualny.
        </p>
        <p className={styles.source}>Źródło: public/data/public/resume-{sourceLocale}.yaml</p>
      </header>

      <div className={styles.templateList}>
        {templateCards.map((template) => (
          <section className={styles.templateCard} key={template.id}>
            <div className={styles.templateMeta}>
              <div>
                <p className={styles.templateIndex}>{String(templateCards.indexOf(template) + 1).padStart(2, "0")}</p>
                <h2>{template.title}</h2>
              </div>
              <div className={styles.templateCopy}>
                <p>{template.description}</p>
                <p><span>Najlepsze dla</span> {template.bestFor}</p>
              </div>
            </div>
            <div className={styles.canvas}>
              <ResumeRenderer
                locale={sourceLocale}
                resume={resume}
                labels={labels}
                mode="preview"
                showChrome={false}
                status="public"
                template={template.id}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
