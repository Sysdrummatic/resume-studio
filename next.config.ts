import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/login.html", destination: "/login", permanent: true },
      { source: "/dashboard.html", destination: "/dashboard", permanent: true },
      { source: "/master-resume.html", destination: "/master-resume", permanent: true },
      { source: "/resume.html", destination: "/resume", permanent: true },
      { source: "/user.html", destination: "/user", permanent: true },
      { source: "/r/index.html", destination: "/resume", permanent: true }
    ];
  }
};

export default nextConfig;
