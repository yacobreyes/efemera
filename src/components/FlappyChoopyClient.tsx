"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const W = 400;
const H = 380;
const MIN_SPLASH_MS = 2800;
const FADE_MS = 400;

const FlappyChoopy = dynamic(() => import("@/components/FlappyChoopy"), { ssr: false });

function Splash({ fading }: { fading: boolean }) {
  return (
    <div style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden", opacity: fading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #e1e8ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>Flappy Choopy</span>
      </div>
      <div style={{ width: "100%", aspectRatio: `${W}/${H}`, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
        <style>{`
          @keyframes fc-fill { from { width: 0%; } to { width: 100%; } }
          .fc-bar { animation: fc-fill ${MIN_SPLASH_MS}ms cubic-bezier(0.4,0,0.6,1) forwards; }
        `}</style>
        <span style={{ fontFamily: "monospace", fontSize: "clamp(0.75rem, 2.5vw, 0.9rem)", fontWeight: 700, letterSpacing: "0.2em", color: "#FFD700", textTransform: "uppercase", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>
          LOADING
        </span>
        <div style={{ width: "60%", maxWidth: 200, height: 6, background: "rgba(255,215,0,0.15)", borderRadius: 3, overflow: "hidden" }}>
          <div className="fc-bar" style={{ height: "100%", background: "#FFD700", borderRadius: 3, boxShadow: "0 0 8px rgba(255,215,0,0.7)" }} />
        </div>
      </div>
    </div>
  );
}

export default function FlappyChoopyClient() {
  const [phase, setPhase] = useState<"splash" | "fading" | "done">("splash");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("fading"), MIN_SPLASH_MS);
    const t2 = setTimeout(() => setPhase("done"), MIN_SPLASH_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "done") return <FlappyChoopy />;
  return <Splash fading={phase === "fading"} />;
}
