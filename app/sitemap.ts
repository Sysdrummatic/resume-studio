import type { MetadataRoute } from "next";
import { buildLanguageAlternates } from "./i18n/locale";
import { getAppI18nConfig } from "./i18n/server";
import { getAppBaseUrl } from "./lib/env";
import { listDocs } from "./lib/docs/content";
import { fetchIndexablePublicLinksForSitemap } from "./lib/resume-server";

// Rendered per request so a missing Supabase config at build time cannot fail the build.
export const dynamic = "force-dynamic";

// Bump when the content of the static public pages changes.
const STATIC_PAGES_LAST_MODIFIED = "2026-10-15";

function buildPublicUrl(base: string, personSlug: string, publicId: string, locale?: string): string {
  const encoded = `/${encodeURIComponent(personSlug)}/${encodeURIComponent(publicId)}`;
  if (!locale) {
    return `${base}${encoded}`;
  }
  return `${base}${encoded}?lang=${encodeURIComponent(locale)}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppBaseUrl().replace(/\/+$/, "");
  const appLocales = getAppI18nConfig().locales.map((locale) => locale.code);
  const staticPaths = ["/", "/resume", "/privacy", "/terms"];
  const docPaths = [
    "/docs",
    ...listDocs("tutorials")
      .filter((doc) => doc.isPublic)
      .map((doc) => `/docs/tutorials/${doc.slug}`),
  ];
  const entries: MetadataRoute.Sitemap = [...staticPaths, ...docPaths].flatMap((pathname) =>
    appLocales.map((locale) => {
      const { canonical, languages } = buildLanguageAlternates({
        baseUrl: base,
        pathname,
        locale,
        locales: appLocales,
      });
      return {
        url: canonical,
        ...(staticPaths.includes(pathname) ? { lastModified: STATIC_PAGES_LAST_MODIFIED } : {}),
        alternates: { languages },
      };
    }),
  );

  // A database failure throws (HTTP 5xx) rather than returning a silently truncated map.
  const links = await fetchIndexablePublicLinksForSitemap();

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
