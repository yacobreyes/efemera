"use client";

import dynamic from "next/dynamic";

const W = 400;
const H = 380;

const FlappyChoopy = dynamic(() => import("@/components/FlappyChoopy"), {
  ssr: false,
  loading: () => (
    <div style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #e1e8ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>Flappy Choopy</span>
      </div>
      <div style={{ width: "100%", aspectRatio: `${W}/${H}`, background: "#000" }} />
    </div>
  ),
});

export default function FlappyChoopyClient() {
  return <FlappyChoopy />;
}
