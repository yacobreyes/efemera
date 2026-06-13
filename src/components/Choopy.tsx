"use client";

import { useEffect, useRef, useState } from "react";

const FONT = "'Inter', sans-serif";
const BORDER = "#e1e8ed";
const TEXT_MUTED = "#526270";

export default function Choopy() {
  const [dancing, setDancing] = useState(false);
  const [fedCount, setFedCount] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jingleUntil = useRef(0);

  useEffect(() => {
    fetch("/api/choopy")
      .then(r => r.json())
      .then(data => setFedCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  function meow() {
    // don't stack jingles on rapid clicks
    if (Date.now() < jingleUntil.current) return;
    jingleUntil.current = Date.now() + 4200;
    try {
      const ctx = new AudioContext();
      // 8-bit chiptune jingle, transcribed from the sheet music:
      // C-B-A-G twice, chromatic rise C-C#, D-B-A-G answer,
      // then the E-C-A-G tail resolving up through A-B to a held C.
      // Fits Choopy's 4s dance.
      const C5 = 523, Cs5 = 554, D5 = 587, E5 = 659, B4 = 494, A4 = 440, G4 = 392;
      const melody = [C5, B4, A4, G4, C5, B4, A4, G4, C5, B4, C5, Cs5, D5, B4, A4, G4, E5, C5, A4, G4, A4, B4];
      const beat = 0.16;
      const notes = melody.map((freq, i) => ({ freq, start: i * beat, dur: beat * 0.92 }));
      notes.push({ freq: C5, start: melody.length * beat, dur: 0.55 }); // final C, held
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
        gain.gain.linearRampToValueAtTime(0.05, t + 0.01);
        gain.gain.setValueAtTime(0.05, t + dur * 0.7);
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
