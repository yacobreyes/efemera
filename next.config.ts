import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["next-sanity"],
  serverExternalPackages: ["sanity", "@sanity/vision"],
};

export default nextConfig;
