import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Sanity Studio embedded in Next.js
  transpilePackages: ["next-sanity"],
};

export default nextConfig;
