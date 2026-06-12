"use client";

import { useEffect, useRef, useState } from "react";

const FONT = "'Inter', sans-serif";
const BORDER = "#e1e8ed";
const TEXT_MUTED = "#526270";

export default function Choopy() {
  const [dancing, setDancing] = useState(false);
  const [fedCount, setFedCount] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/choopy")
      .then(r => r.json())
      .then(data => setFedCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  function feed() {
    setDancing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDancing(false), 4000);
    setFedCount(c => (c ?? 0) + 1);
    fetch("/api/choopy", { method: "POST" })
      .then(r => r.json())
      .then(data => { if (typeof data.count === "number") setFedCount(data.count); })
      .catch(() => {});
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
          Click to feed Choopy
        </span>
        <span style={{ fontFamily: FONT, fontSize: "0.85rem", color: "#1c2938", lineHeight: 1.4, opacity: fedCount === null ? 0 : 1, transition: "opacity 0.4s ease" }}>
          Choopy has been fed {(fedCount ?? 0).toLocaleString()} time{fedCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
