import type { Metadata } from "next";

export const META_DESCRIPTION_MAX_LENGTH = 155;

export function truncateAtWord(text: string, maxLength: number = META_DESCRIPTION_MAX_LENGTH): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }
  const room = clean.slice(0, maxLength - 1);
  const boundary = clean[maxLength - 1] === " " ? maxLength - 1 : room.lastIndexOf(" ");
  const cut = room.slice(0, boundary > 0 ? boundary : room.length);
  return `${cut.replace(/[\s,;:.\-–—]+$/, "")}…`;
}

export function buildPublicCvTitle(name: string, role: string): string {
  return [name.trim(), role.trim()].filter(Boolean).join(" - ");
}

export function stripMarkup(text: string): string {
  return text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/^\s*(?:[-*+•]|\d+\.|#{1,6})\s+/gm, "")
    .replace(/[*_`~]+/g, "");
}

export function buildPublicCvDescription(summaryText: string, fallback: string): string {
  return truncateAtWord(stripMarkup(summaryText).trim() || fallback);
}

export function publicPageMetadata(input: {
  title?: Metadata["title"];
  description: string;
  path: string;
  index: boolean;
  alternates?: Metadata["alternates"];
}): Metadata {
  return {
    ...(input.title ? { title: input.title } : {}),
    description: input.description,
    robots: { index: input.index, follow: input.index },
    alternates: input.alternates ?? { canonical: input.path },
  };
}
