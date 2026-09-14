import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb"
    }
  },
  devIndicators: { position: "bottom-right" },
  typedRoutes: false,
  transpilePackages: ["@labtrack/shared"]
};

export default nextConfig;
