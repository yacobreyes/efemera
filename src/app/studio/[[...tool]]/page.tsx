"use client";

import dynamic from "next/dynamic";

const NextStudio = dynamic(
  async () => {
    const [{ NextStudio }, config] = await Promise.all([
      import("next-sanity/studio"),
      import("../../../../sanity.config"),
    ]);
    return function Studio() {
      return <NextStudio config={config.default} />;
    };
  },
  { ssr: false }
);

export default function StudioPage() {
  return <NextStudio />;
}
