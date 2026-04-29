import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Removed redirects to allow direct access to legacy static HTML pages in public/
  // during the hybrid migration phase.
};

export default nextConfig;
