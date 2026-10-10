import type { ResumeDocument } from "../lib/resume-schema";
import type { ResumePresetRow } from "../lib/resume-server";
import { computeResumeCompletion } from "../master-resume/resume-completion";

export function summarizeMasterResume(resume: ResumeDocument) {
  return {
    completion: computeResumeCompletion(resume),
    counts: {
      roles: resume.summary.filter((item) => item.position.trim()).length,
      experience: resume.experience.filter((item) => item.role.trim() || item.company.trim())
        .length,
      skills: resume.skills.filter((item) => item.name.trim()).length,
      courses: resume.courses.filter((item) => item.name.trim()).length
    }
  };
}

export type DashboardFilter = "all" | "public" | "private";

export function filterDashboardPresets<T extends Pick<ResumePresetRow, "title" | "is_public">>(
  presets: T[],
  query: string,
  filter: DashboardFilter
): T[] {
  const search = query.trim().toLocaleLowerCase();
  return presets.filter(
    (preset) =>
      preset.title.toLocaleLowerCase().includes(search) &&
      (filter === "all" || preset.is_public === (filter === "public"))
  );
}

export function getSelectedDashboardPreset<T extends { id: string }>(
  presets: T[],
  selectedId: string | null
): T | null {
  return presets.find((preset) => preset.id === selectedId) ?? presets[0] ?? null;
}

/** API responses differ in which link-derived fields they carry, so fields they omit are kept. */
export function mergePreset<T extends { id: string }>(current: T[], nextPreset: T): T[] {
  const exists = current.some((preset) => preset.id === nextPreset.id);
  if (!exists) return [nextPreset, ...current];
  return current.map((preset) => (preset.id === nextPreset.id ? { ...preset, ...nextPreset } : preset));
}
