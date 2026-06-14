"use client";

import { useEffect, useRef, useState } from "react";

interface Fly {
  id: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  wobbleAmp: number;
  wobbleDuration: number;
  opacity: number;
}

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

function makeFly(id: number): Fly {
  const duration = rand(9, 18);
  return {
    id,
    y: rand(3, 92),
    size: rand(32, 72),
    duration,
    delay: rand(-duration, 0),
    wobbleAmp: rand(10, 40),
    wobbleDuration: rand(1.2, 3),
    opacity: rand(0.45, 0.95),
  };
}

const FLY_COUNT = 35;
const flies: Fly[] = Array.from({ length: FLY_COUNT }, (_, i) => makeFly(i));

interface Props { onEnter: () => void; }

export default function IntroAnimation({ onEnter }: Props) {
  const [phase, setPhase] = useState<"flies" | "dissolve" | "wordmark">("flies");
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [hinting, setHinting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dissolve"), 3200);
    const t2 = setTimeout(() => { setPhase("wordmark"); setWordmarkVisible(true); }, 4400);
    const t3 = setTimeout(() => setHinting(true), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="intro-overlay">
      <style>{`
        @keyframes flyAcross {
          from { transform: translateX(-15vw); }
          to   { transform: translateX(115vw); }
        }
        @keyframes flyWobble {
          from { transform: translateY(0px); }
          to   { transform: translateY(var(--wobble-amp)); }
        }
      `}</style>

      <div style={{
        position: "absolute", inset: 0,
        transition: "opacity 1.4s ease-out",
        opacity: phase === "flies" ? 1 : 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}>
        {flies.map(f => (
          <div
            key={f.id}
            style={{
              position: "absolute",
              top: `${f.y}%`,
              left: 0,
              opacity: f.opacity,
              animationName: "flyAcross",
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
            } as React.CSSProperties}
          >
            <div style={{
              ["--wobble-amp" as string]: `${f.wobbleAmp}px`,
              animationName: "flyWobble",
              animationDuration: `${f.wobbleDuration}s`,
              animationTimingFunction: "ease-in-out",
              animationIterationCount: "infinite",
              animationDirection: "alternate",
            } as React.CSSProperties}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/mayfly-icon.webp"
                alt=""
                width={f.size}
                height={f.size}
                style={{ display: "block", transform: "rotate(90deg)" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        className="wordmark-container"
        style={{ opacity: wordmarkVisible ? 1 : 0, transition: "opacity 1s ease-out" }}
        onClick={wordmarkVisible ? onEnter : undefined}
        role={wordmarkVisible ? "button" : undefined}
        aria-label={wordmarkVisible ? "Enter Efemera" : undefined}
        tabIndex={wordmarkVisible ? 0 : -1}
        onKeyDown={e => { if (wordmarkVisible && (e.key === "Enter" || e.key === " ")) onEnter(); }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wordmark.webp"
          alt="efemera — Life, in Brief."
          width={1772} height={1181}
          style={{ width: "clamp(280px, 55vw, 780px)", height: "auto", display: "block" }}
        />
        <div className="enter-hint" style={{ opacity: hinting ? 1 : 0, transition: "opacity 0.6s ease" }}>
          Click to enter
        </div>
      </div>
    </div>
  );
}
