"use client";

import { useEffect, useRef, useState } from "react";

interface Fly {
  id: number;
  x: number;
  y: number;
  size: number;
  dir: 1 | -1;
  speedX: number;
  wobblePhase: number;
  wobbleSpeed: number;
  opacity: number;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createFly(id: number): Fly {
  const dir = (Math.random() > 0.5 ? 1 : -1) as 1 | -1;
  return {
    id,
    x: dir === 1 ? randomBetween(-18, -4) : randomBetween(104, 118),
    y: randomBetween(4, 93),
    size: randomBetween(28, 72),
    dir,
    speedX: randomBetween(0.07, 0.18),
    wobblePhase: randomBetween(0, Math.PI * 2),
    wobbleSpeed: randomBetween(0.03, 0.07),
    opacity: randomBetween(0.45, 0.9),
  };
}

const FLY_COUNT = 30;

interface Props { onEnter: () => void; }

export default function IntroAnimation({ onEnter }: Props) {
  const [flies, setFlies] = useState<Fly[]>(() =>
    Array.from({ length: FLY_COUNT }, (_, i) => createFly(i))
  );
  const [phase, setPhase]               = useState<"flies" | "dissolve" | "wordmark">("flies");
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [hinting, setHinting]           = useState(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dissolve"), 3000);
    const t2 = setTimeout(() => { setPhase("wordmark"); setWordmarkVisible(true); }, 4200);
    const t3 = setTimeout(() => setHinting(true), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    function tick() {
      setFlies(prev => prev.map(f => {
        const nx     = f.x + f.speedX * f.dir;
        const nPhase = f.wobblePhase + f.wobbleSpeed;
        const ny     = f.y + Math.sin(nPhase) * 0.12;
        if ((f.dir === 1 && nx > 112) || (f.dir === -1 && nx < -12)) return createFly(f.id);
        return { ...f, x: nx, y: ny, wobblePhase: nPhase };
      }));
      frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className="intro-overlay">
      {/* Flies crossing the screen using the real brand asset */}
      <div style={{
        position: "absolute", inset: 0,
        transition: "opacity 1.4s ease-out",
        opacity: phase === "flies" ? 1 : 0,
        pointerEvents: "none",
      }}>
        {flies.map(f => (
          <div key={f.id} style={{
            position: "absolute",
            left: `${f.x}%`,
            top:  `${f.y}%`,
            opacity: f.opacity,
            transform: `scaleX(${f.dir})`,
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mayfly-icon.png"
              alt=""
              width={f.size}
              height={f.size}
              style={{ display: "block" }}
            />
          </div>
        ))}
      </div>

      {/* Wordmark — real brand asset, clickable to enter */}
      <div
        className="wordmark-container"
        style={{
          opacity:   wordmarkVisible ? 1 : 0,
          transform: wordmarkVisible ? "scale(1)" : "scale(0.94)",
          transition: "opacity 1s ease-out, transform 1s cubic-bezier(0.16,1,0.3,1)",
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
