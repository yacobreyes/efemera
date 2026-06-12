"use client";

import { useEffect, useRef, useState } from "react";

interface Fly {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  wobblePhase: number;
  wobbleAmp: number;
  wobbleSpeed: number;
  opacity: number;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createFly(id: number, stagger = false): Fly {
  return {
    id,
    x: stagger ? randomBetween(-30, 100) : randomBetween(-30, -5),
    y: randomBetween(3, 92),
    size: randomBetween(32, 72),
    speed: randomBetween(0.35, 0.8),
    wobblePhase: randomBetween(0, Math.PI * 2),
    wobbleAmp: randomBetween(0.06, 0.2),
    wobbleSpeed: randomBetween(0.02, 0.06),
    opacity: randomBetween(0.45, 0.95),
  };
}

const FLY_COUNT = 35;

interface Props { onEnter: () => void; }

export default function IntroAnimation({ onEnter }: Props) {
  const [flies, setFlies] = useState<Fly[]>(() =>
    Array.from({ length: FLY_COUNT }, (_, i) => createFly(i, true))
  );
  const [phase, setPhase] = useState<"flies" | "dissolve" | "wordmark">("flies");
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [hinting, setHinting] = useState(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dissolve"), 3200);
    const t2 = setTimeout(() => { setPhase("wordmark"); setWordmarkVisible(true); }, 4400);
    const t3 = setTimeout(() => setHinting(true), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    function tick() {
      setFlies(prev => prev.map(f => {
        const nx     = f.x + f.speed;
        const nPhase = f.wobblePhase + f.wobbleSpeed;
        const ny     = f.y + Math.sin(nPhase) * f.wobbleAmp;
        if (nx > 112) return createFly(f.id, false);
        return { ...f, x: nx, y: ny, wobblePhase: nPhase };
      }));
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className="intro-overlay">
      <div style={{
        position: "absolute", inset: 0,
        transition: "opacity 1.4s ease-out",
        opacity: phase === "flies" ? 1 : 0,
        pointerEvents: "none",
      }}>
        {flies.map(f => (
          <div key={f.id} style={{
            position: "absolute",
            left: `${f.x}%`, top: `${f.y}%`,
            opacity: f.opacity,
            transform: "rotate(90deg)",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mayfly-icon.png" alt="" width={f.size} height={f.size} style={{ display: "block" }} />
          </div>
        ))}
      </div>

      <div
        className="wordmark-container"
        style={{
          opacity: wordmarkVisible ? 1 : 0,
          transition: "opacity 1s ease-out",
        }}
        onClick={wordmarkVisible ? onEnter : undefined}
        role={wordmarkVisible ? "button" : undefined}
        aria-label={wordmarkVisible ? "Enter Efemera" : undefined}
        tabIndex={wordmarkVisible ? 0 : -1}
        onKeyDown={e => { if (wordmarkVisible && (e.key === "Enter" || e.key === " ")) onEnter(); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wordmark.png"
          alt="efemera — Life, in Brief."
          style={{ width: "clamp(280px, 55vw, 780px)", height: "auto", display: "block" }}
        />
        {hinting && <div className="enter-hint">Click to enter</div>}
      </div>
    </div>
  );
}
