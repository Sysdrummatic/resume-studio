import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "./lib/env";
import { listDocs } from "./lib/docs/content";
import { fetchIndexablePublicLinksForSitemap } from "./lib/resume-server";

function buildPublicUrl(base: string, personSlug: string, publicId: string, locale?: string): string {
  const encoded = `/${encodeURIComponent(personSlug)}/${encodeURIComponent(publicId)}`;
  if (!locale) {
    return `${base}${encoded}`;
  }
  return `${base}${encoded}?lang=${encodeURIComponent(locale)}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppBaseUrl().replace(/\/+$/, "");
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/privacy`,
    },
    {
      url: `${base}/terms`,
    },
    { url: `${base}/docs` },
    ...listDocs("tutorials")
      .filter((doc) => doc.isPublic)
      .map((doc) => ({ url: `${base}/docs/tutorials/${doc.slug}` })),
  ];

  let links = [];
  try {
    links = await fetchIndexablePublicLinksForSitemap();
  } catch {
    // Build environments without Supabase env vars should not fail sitemap generation.
    return entries;
  }

  for (const link of links) {
    const canonical = buildPublicUrl(base, link.personSlug, link.publicId);
    entries.push({
      url: canonical,
      lastModified: link.updatedAt,
      alternates: {
        languages: Object.fromEntries(
          link.availableLocales.map((locale) => [
            locale,
            locale === link.defaultLocale
              ? canonical
              : buildPublicUrl(base, link.personSlug, link.publicId, locale),
          ]),
        ),
      },
    });
  }

  return entries;
}
