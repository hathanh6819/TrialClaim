import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
