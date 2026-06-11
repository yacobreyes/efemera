"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

interface Fly {
  id: number;
  x: number;       // % across screen
  y: number;       // % down screen
  size: number;
  dir: 1 | -1;     // 1 = left→right, -1 = right→left
  speedX: number;
  wobbleY: number; // vertical sine offset
  wobblePhase: number;
  wobbleSpeed: number;
  opacity: number;
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createFly(id: number): Fly {
  const dir = Math.random() > 0.5 ? 1 : -1 as 1 | -1;
  return {
    id,
    x: dir === 1 ? randomBetween(-20, -5) : randomBetween(105, 120),
    y: randomBetween(5, 95),
    size: randomBetween(24, 56),
    dir,
    speedX: randomBetween(0.08, 0.2),
    wobbleY: 0,
    wobblePhase: randomBetween(0, Math.PI * 2),
    wobbleSpeed: randomBetween(0.03, 0.07),
    opacity: randomBetween(0.5, 0.92),
  };
}

const FLY_COUNT = 28;

interface Props {
  onEnter: () => void;
}

export default function IntroAnimation({ onEnter }: Props) {
  const [flies, setFlies] = useState<Fly[]>(() =>
    Array.from({ length: FLY_COUNT }, (_, i) => createFly(i))
  );
  const [phase, setPhase] = useState<"flies" | "dissolve" | "wordmark">("flies");
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [hinting, setHinting] = useState(false);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const dissolveTimer = setTimeout(() => setPhase("dissolve"), 3000);
    const wordmarkTimer = setTimeout(() => { setPhase("wordmark"); setWordmarkVisible(true); }, 4200);
    const hintTimer    = setTimeout(() => setHinting(true), 5000);
    return () => { clearTimeout(dissolveTimer); clearTimeout(wordmarkTimer); clearTimeout(hintTimer); };
  }, []);

  useEffect(() => {
    function animate() {
      setFlies(prev =>
        prev.map(f => {
          const nx = f.x + f.speedX * f.dir;
          const nPhase = f.wobblePhase + f.wobbleSpeed;
          const ny = f.y + Math.sin(nPhase) * 0.15;
          // recycle when off-screen
          if ((f.dir === 1 && nx > 115) || (f.dir === -1 && nx < -15)) {
            return createFly(f.id);
          }
          return { ...f, x: nx, y: ny, wobblePhase: nPhase };
        })
      );
      frameRef.current = requestAnimationFrame(animate);
    }
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const fliesOpacity = phase === "flies" ? 1 : 0;

  return (
    <div className="intro-overlay">
      {/* Flies crossing the screen */}
      <div
        style={{
          position: "absolute", inset: 0,
          transition: "opacity 1.2s ease-out",
          opacity: fliesOpacity,
          pointerEvents: "none",
        }}
      >
        {flies.map(f => (
          <div
            key={f.id}
            style={{
              position: "absolute",
              left: `${f.x}%`,
              top: `${f.y}%`,
              opacity: f.opacity,
              transform: `scaleX(${f.dir}) rotate(${f.dir === 1 ? -15 : 15}deg)`,
            }}
          >
            <Image
              src="/mayfly-icon.png"
              alt=""
              width={f.size}
              height={f.size}
              style={{ display: "block" }}
              priority
            />
          </div>
        ))}
      </div>

      {/* Wordmark */}
      <div
        className="wordmark-container"
        style={{
          opacity: wordmarkVisible ? 1 : 0,
          transform: wordmarkVisible ? "scale(1)" : "scale(0.94)",
          transition: "opacity 1s ease-out, transform 1s cubic-bezier(0.16,1,0.3,1)",
        }}
        onClick={wordmarkVisible ? onEnter : undefined}
        role={wordmarkVisible ? "button" : undefined}
        aria-label={wordmarkVisible ? "Enter Efemera" : undefined}
        tabIndex={wordmarkVisible ? 0 : -1}
        onKeyDown={e => { if (wordmarkVisible && (e.key === "Enter" || e.key === " ")) onEnter(); }}
      >
        <Image
          src="/wordmark.png"
          alt="efemera — Life, in Brief."
          width={800}
          height={400}
          style={{ width: "clamp(280px, 60vw, 800px)", height: "auto" }}
          priority
        />
        {hinting && <div className="enter-hint">Click to enter</div>}
      </div>
    </div>
  );
}
