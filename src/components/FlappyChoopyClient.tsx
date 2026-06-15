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
      <div style={{ width: "100%", aspectRatio: `${W}/${H}`, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
        <style>{`
          @keyframes fc-blink { 0%,49%,100% { opacity: 1; } 50%,99% { opacity: 0; } }
          .fc-blink { animation: fc-blink 1s step-start infinite; }
        `}</style>
        <span style={{ fontFamily: "monospace", fontSize: "clamp(0.9rem, 3vw, 1.1rem)", fontWeight: 700, letterSpacing: "0.2em", color: "#FFD700", textTransform: "uppercase", textShadow: "0 0 12px rgba(255,215,0,0.6)" }}>
          LOADING…
        </span>
        <span className="fc-blink" style={{ fontFamily: "monospace", fontSize: "clamp(0.55rem, 2vw, 0.65rem)", letterSpacing: "0.15em", color: "rgba(255,215,0,0.5)", textTransform: "uppercase" }}>
          INSERT COIN TO CONTINUE
        </span>
      </div>
    </div>
  ),
});

export default function FlappyChoopyClient() {
  return <FlappyChoopy />;
}
