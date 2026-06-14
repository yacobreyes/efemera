"use client";

import dynamic from "next/dynamic";
const FlappyChoopy = dynamic(() => import("@/components/FlappyChoopy"), { ssr: false });

export default function FlappyChoopyClient() {
  return <FlappyChoopy />;
}
