import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{source: "/api/yahoo/:path*", headers: [
      {key: "Cache-Control", value: "private, no-store, max-age=0"},
      {key: "Referrer-Policy", value: "no-referrer"}
    ]}];
  }
};

export default nextConfig;
