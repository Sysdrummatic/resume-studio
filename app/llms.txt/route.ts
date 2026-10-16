import { getAppBaseUrl } from "../lib/env";
import { buildLlmsTxt } from "../lib/llms-txt";

export function GET(): Response {
  return new Response(buildLlmsTxt(getAppBaseUrl()), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
