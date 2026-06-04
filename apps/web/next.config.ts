import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  transpilePackages: ["@labtrack/shared"]
};

export default nextConfig;
