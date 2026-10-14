import type { MetadataRoute } from "next";
import { buildLanguageAlternates } from "./i18n/locale";
import { getAppI18nConfig } from "./i18n/server";
import { getAppBaseUrl } from "./lib/env";
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
  const appLocales = getAppI18nConfig().locales.map((locale) => locale.code);
  const entries: MetadataRoute.Sitemap = ["/", "/resume", "/privacy", "/terms"].flatMap((pathname) =>
    appLocales.map((locale) => {
      const { canonical, languages } = buildLanguageAlternates({
        baseUrl: base,
        pathname,
        locale,
        locales: appLocales,
      });
      return { url: canonical, alternates: { languages } };
    }),
  );

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
