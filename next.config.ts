import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sanity", "@sanity/vision"],
  async rewrites() {
    return [
      { source: "/narratives", destination: "/?tab=Narratives" },
      { source: "/micro-memoirs", destination: "/?tab=Micro-Memoirs" },
      { source: "/essays", destination: "/?tab=Essays" },
      { source: "/about", destination: "/?tab=About" },
    ];
  },
};

export default nextConfig;
