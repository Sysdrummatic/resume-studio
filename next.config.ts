import type { NextConfig } from "next";

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
      { source: "/api/resume/export/:path*", headers: noindex },
      { source: "/api/public/opencv/v1/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
