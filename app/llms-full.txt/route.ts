import { getAppDictionary, getAppI18nConfig } from "../i18n/server";
import { buildLlmsFullTxt } from "../lib/llms-txt";

export function GET(): Response {
  const locales = getAppI18nConfig().locales.map(({ code, name }) => ({
    code,
    name,
    landing: getAppDictionary(code).landing,
  }));
  return new Response(buildLlmsFullTxt(locales), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
