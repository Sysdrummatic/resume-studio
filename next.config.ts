import type { NextConfig } from "next";

const IMMUTABLE_CACHE = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdf-parse wraps pdfjs-dist, which resolves its worker script via a
  // dynamic import the bundler can't map correctly inside a server chunk
  // ("Cannot find module '.../pdf.worker.mjs'"). Marking it external skips
  // bundling entirely — Node loads it straight from node_modules instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      { source: "/fonts/:path*", headers: IMMUTABLE_CACHE },
      { source: "/animations/:path*", headers: IMMUTABLE_CACHE },
    ];
  },
};

export default nextConfig;
