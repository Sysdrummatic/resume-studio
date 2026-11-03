import type { MetadataRoute } from "next";
import { buildAiBotRobotsRule } from "./lib/ai-bots";
import { getAppBaseUrl } from "./lib/env";

// Private pages carry `noindex, nofollow` in their own metadata. They are not
// blocked here, so crawlers can fetch them and see the directive (a disallowed
// URL can still be indexed from external links).
const DISALLOWED_PATHS = ["/api/"];

export default function robots(): MetadataRoute.Robots {
  const base = getAppBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
      buildAiBotRobotsRule(),
    ],
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
