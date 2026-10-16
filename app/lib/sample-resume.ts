import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { normalizeResumeDocument, type ResumeDocument } from "./resume-schema";

const SAMPLE_FALLBACK_NAME = "Ariana Holt";

const localesConfigSchema = z.object({
  default_locale: z.string(),
  locales: z
    .array(
      z.object({
        code: z.string(),
        label: z.string(),
        resume_path: z.string(),
        config_path: z.string().optional(),
      })
    )
    .min(1),
});

const viewConfigSchema = z.object({
  labels: z
    .object({
      language_switcher: z.string().optional(),
      summary_heading: z.string().optional(),
      experience_heading: z.string().optional(),
      education_heading: z.string().optional(),
      courses_heading: z.string().optional(),
      personal_info_heading: z.string().optional(),
      skills_heading: z.string().optional(),
      tech_stack_heading: z.string().optional(),
      languages_heading: z.string().optional(),
      interests_heading: z.string().optional(),
      public_view_badge: z.string().optional(),
      draft_view_badge: z.string().optional(),
      ai_generated_badge: z.string().optional(),
    })
    .passthrough(),
});

export type SampleResumeLabels = z.infer<typeof viewConfigSchema>["labels"];

export type SampleResumeLocale = {
  code: string;
  label: string;
  resume: ResumeDocument;
  role: string;
  labels: SampleResumeLabels;
};

export type SampleResumeData = {
  defaultLocale: string;
  locales: SampleResumeLocale[];
};

async function readPublicYaml(publicPath: string): Promise<unknown> {
  const text = await readFile(path.join(process.cwd(), "public", publicPath), "utf8");
  return yaml.load(text);
}

function extractRole(raw: unknown): string {
  if (typeof raw !== "object" || raw === null) return "";
  const role = (raw as { role?: unknown }).role;
  return typeof role === "string" ? role.trim() : "";
}

/**
 * Sample CV data for `/resume` and the landing preview, read on the server so
 * the HTML a crawler receives already contains the CV. Every locale is loaded
 * up front (the sample ships two small files) so switching language is client
 * state only: no fetch and no browser YAML parser on the public path.
 */
export async function loadSampleResumeData(): Promise<SampleResumeData> {
  const config = localesConfigSchema.parse(await readPublicYaml("data/public/locales.yaml"));

  const locales = await Promise.all(
    config.locales.map(async (locale): Promise<SampleResumeLocale> => {
      const [raw, viewConfig] = await Promise.all([
        readPublicYaml(locale.resume_path),
        locale.config_path ? readPublicYaml(locale.config_path) : Promise.resolve(null),
      ]);
      return {
        code: locale.code,
        label: locale.label,
        resume: normalizeResumeDocument(raw, SAMPLE_FALLBACK_NAME),
        role: extractRole(raw),
        labels: viewConfig ? viewConfigSchema.parse(viewConfig).labels : {},
      };
    })
  );

  return { defaultLocale: config.default_locale, locales };
}
