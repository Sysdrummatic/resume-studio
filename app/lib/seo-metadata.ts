import type { Metadata } from "next";

export const META_DESCRIPTION_MAX_LENGTH = 155;

export function truncateAtWord(text: string, maxLength: number = META_DESCRIPTION_MAX_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  const room = clean.slice(0, maxLength - 1);
  const cut = room.slice(0, room.lastIndexOf(" ") > 0 ? room.lastIndexOf(" ") : room.length);
  return `${cut.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export function buildPublicCvTitle(name: string, role: string): string {
  return [name.trim(), role.trim()].filter(Boolean).join(" - ");
}

export function buildPublicCvDescription(summaryText: string, fallback: string): string {
  return truncateAtWord(summaryText.trim() || fallback);
}

export function publicPageMetadata(input: { title?: string; description: string; path: string }): Metadata {
  return {
    ...(input.title ? { title: input.title } : {}),
    description: input.description,
    robots: { index: true, follow: true },
    alternates: { canonical: input.path },
  };
}
