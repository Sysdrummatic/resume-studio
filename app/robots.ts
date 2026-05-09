import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "./lib/env";

export default function robots(): MetadataRoute.Robots {
  const base = getAppBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${base.replace(/\/+$/, "")}/sitemap.xml`,
  };
}
