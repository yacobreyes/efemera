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

  function meow() {
    try {
      const ctx = new AudioContext();
      // 8-bit chiptune jingle (C5 B4 A4 G4 phrase from the reference audio),
      // two rounds plus a resolving tail, timed to Choopy's 4s dance
      const notes = [
        { freq: 523, start: 0.0,  dur: 0.22 }, // C5
        { freq: 494, start: 0.26, dur: 0.22 }, // B4
        { freq: 440, start: 0.52, dur: 0.32 }, // A4 (held)
        { freq: 392, start: 0.9,  dur: 0.3 },  // G4
        { freq: 523, start: 1.26, dur: 0.22 }, // C5
        { freq: 494, start: 1.52, dur: 0.22 }, // B4
        { freq: 440, start: 1.78, dur: 0.32 }, // A4
        { freq: 392, start: 2.16, dur: 0.3 },  // G4
        // resolving tail: walk back up and land home on C
        { freq: 440, start: 2.56, dur: 0.22 }, // A4
        { freq: 494, start: 2.82, dur: 0.22 }, // B4
        { freq: 523, start: 3.08, dur: 0.7 },  // C5 (final, long)
      ];
      const last = notes.length - 1;
      notes.forEach(({ freq, start, dur }, i) => {
        const t = ctx.currentTime + start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "square"; // classic chiptune voice
        osc.frequency.setValueAtTime(freq, t);
        // tiny downward bend at the tail of each note = "meow" inflection
        osc.frequency.setValueAtTime(freq, t + dur * 0.6);
        osc.frequency.linearRampToValueAtTime(freq * 0.88, t + dur);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
        gain.gain.setValueAtTime(0.12, t + dur * 0.7);
        gain.gain.linearRampToValueAtTime(0, t + dur);

        osc.start(t);
        osc.stop(t + dur + 0.02);
        if (i === last) osc.onended = () => ctx.close();
      });
    } catch { /* audio not available */ }
  }

  function feed() {
    meow();
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
        <span style={{ fontFamily: FONT, fontSize: "0.75rem", color: "#1c2938", lineHeight: 1.4, whiteSpace: "nowrap", opacity: fedCount === null ? 0 : 1, transition: "opacity 0.4s ease" }}>
          Choopy has been fed {(fedCount ?? 0).toLocaleString()} time{fedCount === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
