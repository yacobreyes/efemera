"use client";

import { useEffect, useRef, useState } from "react";
import MayflyIcon from "./MayflyIcon";

interface Fly {
  id: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  speedX: number;
  speedY: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

interface Props {
  onEnter: () => void;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createFly(id: number): Fly {
  return {
    id,
    x: randomBetween(10, 90),
    y: randomBetween(110, 140),
    size: randomBetween(18, 42),
    rotation: randomBetween(-40, 40),
    speedX: randomBetween(-0.12, 0.12),
    speedY: randomBetween(-0.18, -0.08),
    wobble: randomBetween(0, Math.PI * 2),
    wobbleSpeed: randomBetween(0.025, 0.06),
    opacity: randomBetween(0.55, 0.95),
  };
}

const FLY_COUNT = 22;

export default function IntroAnimation({ onEnter }: Props) {
  const [flies, setFlies] = useState<Fly[]>(() =>
    Array.from({ length: FLY_COUNT }, (_, i) => createFly(i))
  );
  const [phase, setPhase] = useState<"flies" | "dissolve" | "wordmark">("flies");
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [hinting, setHinting] = useState(false);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    // Flies rise for 2.2s, then dissolve into wordmark
    const dissolveTimer = setTimeout(() => setPhase("dissolve"), 2200);
    const wordmarkTimer = setTimeout(() => {
      setPhase("wordmark");
      setWordmarkVisible(true);
    }, 3400);
    const hintTimer = setTimeout(() => setHinting(true), 4000);

    return () => {
      clearTimeout(dissolveTimer);
      clearTimeout(wordmarkTimer);
      clearTimeout(hintTimer);
    };
  }, []);

  useEffect(() => {
    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts;
      setFlies(prev =>
        prev.map(f => {
          let nx = f.x + f.speedX + Math.sin(f.wobble) * 0.06;
          let ny = f.y + f.speedY;
          const nw = f.wobble + f.wobbleSpeed;
          // wrap horizontally
          if (nx < -5) nx = 105;
          if (nx > 105) nx = -5;
          // recycle flies that fly off top
          if (ny < -10) {
            return createFly(f.id);
          }
          return { ...f, x: nx, y: ny, wobble: nw, rotation: f.rotation + Math.sin(nw) * 0.8 };
        })
      );
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const fliesOpacity =
    phase === "flies" ? 1 :
    phase === "dissolve" ? 0 :
    0;

  return (
    <div className="intro-overlay" style={{ cursor: "default" }}>
      {/* Flying mayflies */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transition: "opacity 1.1s ease-out",
          opacity: fliesOpacity,
          pointerEvents: "none",
        }}
      >
        {flies.map(f => (
          <div
            key={f.id}
            className="mayfly"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              opacity: f.opacity,
              transform: `rotate(${f.rotation}deg)`,
            }}
          >
            <MayflyIcon size={f.size} color="rgba(255,255,255,0.85)" />
          </div>
        ))}
      </div>

      {/* Wordmark */}
      <div
        className="wordmark-container"
        style={{
          opacity: wordmarkVisible ? 1 : 0,
          transform: wordmarkVisible ? "scale(1)" : "scale(0.92)",
          transition: "opacity 0.9s ease-out, transform 0.9s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={wordmarkVisible ? onEnter : undefined}
        role={wordmarkVisible ? "button" : undefined}
        aria-label={wordmarkVisible ? "Enter Efemera" : undefined}
        tabIndex={wordmarkVisible ? 0 : -1}
        onKeyDown={e => { if (wordmarkVisible && (e.key === "Enter" || e.key === " ")) onEnter(); }}
      >
        <div style={{ position: "relative" }}>
          <div className="wordmark-bug" style={{ position: "absolute", top: "-2rem", left: "50%", transform: "translateX(-50%)" }}>
            <MayflyIcon size={30} color="white" />
          </div>
          <div className="wordmark-title">efemera</div>
        </div>
        <div className="wordmark-subtitle">Life, in Brief.</div>
        {hinting && (
          <div className="enter-hint">Click to enter</div>
        )}
      </div>
    </div>
  );
}
