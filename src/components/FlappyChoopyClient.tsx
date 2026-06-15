"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const W = 400;
const H = 380;
const MIN_SPLASH_MS = 1800;

const FlappyChoopy = dynamic(() => import("@/components/FlappyChoopy"), { ssr: false });

function Splash() {
  return (
    <div style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #e1e8ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>Flappy Choopy</span>
      </div>
      <div style={{ width: "100%", aspectRatio: `${W}/${H}`, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <style>{`
          @keyframes fc-pulse { 0%,100% { opacity: 1; text-shadow: 0 0 12px rgba(255,215,0,0.6); } 50% { opacity: 0.6; text-shadow: 0 0 28px rgba(255,215,0,1); } }
          .fc-pulse { animation: fc-pulse 1.4s ease-in-out infinite; }
        `}</style>
        <span className="fc-pulse" style={{ fontFamily: "monospace", fontSize: "clamp(0.9rem, 3vw, 1.1rem)", fontWeight: 700, letterSpacing: "0.2em", color: "#FFD700", textTransform: "uppercase" }}>
          LOADING…
        </span>
      </div>
    </div>
  );
}

export default function FlappyChoopyClient() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <Splash />;
  return <FlappyChoopy />;
}
