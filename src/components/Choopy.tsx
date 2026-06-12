"use client";

import { useRef, useState } from "react";

const FONT = "'Inter', sans-serif";
const BORDER = "#e1e8ed";
const TEXT_MUTED = "#526270";

export default function Choopy() {
  const [dancing, setDancing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function feed() {
    setDancing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDancing(false), 4000);
  }

  return (
    <div style={{ background: "white", border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" }}>
      <style>{`
        @keyframes choopy-teeter {
          0%, 100% { transform: rotate(-6deg); }
          50% { transform: rotate(6deg); }
        }
        .choopy-dancing { animation: choopy-teeter 0.5s ease-in-out infinite; transform-origin: 50% 90%; }
        .choopy-img { cursor: pointer; }
      `}</style>

      {/* Sign */}
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: `1px solid ${BORDER}`, textAlign: "center" }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>
          Don&apos;t Feed Choopy
        </span>
      </div>

      <div style={{ padding: "0.85rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dancing ? "/Choopy Dance.png" : "/Choopy sit.png"}
          alt="Choopy the cat"
          onClick={feed}
          className={`choopy-img${dancing ? " choopy-dancing" : ""}`}
          style={{ width: "70%", maxWidth: 140, height: "auto", display: "block", imageRendering: "pixelated" }}
        />
        <span style={{ fontFamily: FONT, fontSize: "0.68rem", fontStyle: "italic", color: TEXT_MUTED }}>
          click to feed choopy
        </span>
      </div>
    </div>
  );
}
