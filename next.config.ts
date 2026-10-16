import type { NextConfig } from "next";

// Filenames in /fonts and /animations are not hashed, so a replaced file must be picked up within a week.
const STATIC_ASSET_CACHE = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdf-parse wraps pdfjs-dist, which resolves its worker script via a
  // dynamic import the bundler can't map correctly inside a server chunk
  // ("Cannot find module '.../pdf.worker.mjs'"). Marking it external skips
  // bundling entirely — Node loads it straight from node_modules instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/fonts/:path*", headers: STATIC_ASSET_CACHE },
      { source: "/animations/:path*", headers: STATIC_ASSET_CACHE },
      { source: "/api/resume/export/:path*", headers: noindex },
      { source: "/api/public/opencv/v1/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
