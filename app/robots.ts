import type { MetadataRoute } from "next";
import { buildAiBotRobotsRule } from "./lib/ai-bots";
import { getAppBaseUrl } from "./lib/env";

const PRIVATE_PATHS = [
  "/api/",
  "/dashboard",
  "/admin",
  "/master-resume",
  "/user",
  "/onboarding",
  "/settings",
];

export default function robots(): MetadataRoute.Robots {
  const base = getAppBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      buildAiBotRobotsRule(),
    ],
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
