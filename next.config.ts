import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
