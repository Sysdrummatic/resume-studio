export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OG_IMAGE_CONTENT_TYPE = "image/png";
export const OG_IMAGE_ALT = "OpenCiVera - your CV as a LiveCV link";

const MAX_NAME_LENGTH = 80;
const MAX_ROLE_LENGTH = 120;

export type CvOgContent = {
  name: string;
  role: string | null;
};

export function absoluteOgImageUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function cvOgImagePath(canonicalPath: string): string {
  return `${canonicalPath.replace(/\/+$/, "")}/opengraph-image`;
}

function clip(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed;
}

/**
 * Only name and role of the published, selection-applied document may reach the
 * image. Links hidden from search (allowIndexing=false) get the generic card.
 */
export function buildCvOgContent(input: { allowIndexing: boolean; name: string; role: string }): CvOgContent | null {
  if (!input.allowIndexing) {
    return null;
  }
  const name = clip(input.name, MAX_NAME_LENGTH);
  if (!name) {
    return null;
  }
  const role = clip(input.role, MAX_ROLE_LENGTH);
  return { name, role: role || null };
}
