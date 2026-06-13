import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sanity", "@sanity/vision"],
  async rewrites() {
    return [
      { source: "/narratives", destination: "/?tab=Narratives" },
      { source: "/micro-memoirs", destination: "/?tab=Micro-Memoirs" },
      { source: "/about", destination: "/?tab=About" },
      { source: "/archive-tab", destination: "/?tab=Archive" },
    ];
  },
};

export default nextConfig;
