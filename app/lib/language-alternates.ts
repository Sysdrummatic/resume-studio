import type { Metadata } from "next";
import { buildLanguageAlternates } from "../i18n/locale";
import { getRequestAppI18n } from "../i18n/server";
import { getAppBaseUrl } from "./env";

export async function getLanguageAlternatesMetadata(pathname: string): Promise<Metadata["alternates"]> {
  const { locale, locales } = await getRequestAppI18n();
  return buildLanguageAlternates({
    baseUrl: getAppBaseUrl(),
    pathname,
    locale,
    locales: locales.map((option) => option.code),
  });
}
