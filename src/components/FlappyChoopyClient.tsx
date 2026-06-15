"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const W = 400;
const H = 380;
const DURATION_MS = 6000;
const FADE_MS = 500;

const FlappyChoopy = dynamic(() => import("@/components/FlappyChoopy"), {
  ssr: false,
  // Same-sized placeholder so the wrapper never collapses to a line while
  // the game's JS downloads (it sits hidden under the loading overlay anyway).
  loading: () => (
    <div style={{ background: "#0a0a0a", border: "2px solid #FFD700", borderRadius: 6, overflow: "hidden", boxShadow: "0 0 24px rgba(255,215,0,0.15)" }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid rgba(255,215,0,0.25)", height: 34, boxSizing: "border-box" }} />
      <div style={{ width: "100%", aspectRatio: `${W}/${H}`, background: "#000" }} />
    </div>
  ),
});

export default function FlappyChoopyClient() {
  const [hideOverlay, setHideOverlay] = useState(false);
  const [removeOverlay, setRemoveOverlay] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHideOverlay(true), DURATION_MS);
    const t2 = setTimeout(() => setRemoveOverlay(true), DURATION_MS + FADE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <FlappyChoopy />
      {!removeOverlay && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 5,
            background: "#0a0a0a", border: "2px solid #FFD700", borderRadius: 6, overflow: "hidden",
            boxShadow: "0 0 24px rgba(255,215,0,0.15)",
            display: "flex", flexDirection: "column",
            opacity: hideOverlay ? 0 : 1,
            transition: `opacity ${FADE_MS}ms ease`,
            pointerEvents: hideOverlay ? "none" : "auto",
          }}
        >
          <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid rgba(255,215,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#FFD700", textShadow: "0 0 8px rgba(255,215,0,0.5)" }}>Flappy Choopy</span>
          </div>
          <div style={{ flex: 1, width: "100%", aspectRatio: `${W}/${H}`, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.25rem" }}>
            <style>{`
              @keyframes fc-fill { from { width: 0% } to { width: 100% } }
              .fc-bar { animation: fc-fill ${DURATION_MS}ms linear forwards; }
            `}</style>
            <span style={{ fontFamily: "monospace", fontSize: "clamp(0.75rem, 2.5vw, 0.9rem)", fontWeight: 700, letterSpacing: "0.2em", color: "#FFD700", textTransform: "uppercase", textShadow: "0 0 10px rgba(255,215,0,0.5)" }}>
              LOADING
            </span>
            <div style={{ width: "60%", maxWidth: 200, height: 6, background: "rgba(255,215,0,0.15)", borderRadius: 3, overflow: "hidden" }}>
              <div className="fc-bar" style={{ height: "100%", background: "#FFD700", borderRadius: 3, boxShadow: "0 0 8px rgba(255,215,0,0.7)" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
