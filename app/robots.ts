import type { MetadataRoute } from "next";
import { buildAiBotRobotsRule } from "./lib/ai-bots";
import { getAppBaseUrl } from "./lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getAppBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      buildAiBotRobotsRule(),
    ],
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
