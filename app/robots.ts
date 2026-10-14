import type { MetadataRoute } from "next";
import { AI_BOT_ALLOWED_PATHS, AI_BOT_USER_AGENTS } from "./lib/ai-bots";
import { getAppBaseUrl } from "./lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getAppBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: [...AI_BOT_USER_AGENTS],
        allow: [...AI_BOT_ALLOWED_PATHS],
        disallow: "/",
      },
    ],
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
