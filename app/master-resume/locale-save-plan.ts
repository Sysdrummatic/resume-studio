import type { ResumeLocale } from "../lib/resume-schema";

/**
 * Saves translations first and the default language last. The default's save
 * rewrites every translation on the server (ADR 0023 §4), so it has to run once
 * their newest text is stored. Outcomes stay aligned with `targets`.
 */
export async function saveLocalesInOrder<T>(
  targets: ResumeLocale[],
  defaultLocale: ResumeLocale,
  save: (locale: ResumeLocale) => Promise<T>,
): Promise<Array<PromiseSettledResult<T>>> {
  const translations = targets.filter((locale) => locale !== defaultLocale);
  const translationOutcomes = await Promise.allSettled(translations.map(save));
  const defaultOutcome = targets.includes(defaultLocale) ? (await Promise.allSettled([save(defaultLocale)]))[0] : null;
  return targets.map((locale) => (locale === defaultLocale ? defaultOutcome! : translationOutcomes[translations.indexOf(locale)]));
}

type PlannedBuffer = {
  documentRow: { updated_at: string } | null;
  yamlPanel: string;
  savedYamlContent: string;
  cvStyle: unknown;
  savedCvStyle: unknown;
};

/**
 * What to do with a buffer whose document the server rewrote from
 * `previousUpdatedAt`. Only a rewrite of the exact version the editor holds is
 * adopted; anything else stays stale so the next save is a reported conflict.
 */
export function planSynchronizedBuffer(buffer: PlannedBuffer, previousUpdatedAt: string): "replace" | "rebase" | "stale" {
  if (buffer.documentRow?.updated_at !== previousUpdatedAt) return "stale";
  const dirty = buffer.yamlPanel !== buffer.savedYamlContent || JSON.stringify(buffer.cvStyle) !== JSON.stringify(buffer.savedCvStyle);
  return dirty ? "rebase" : "replace";
}
