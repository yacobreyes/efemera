"use client";

import { useEffect, useRef, useState } from "react";

interface Fly {
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

function createFly(stagger = false): Fly {
  return {
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"flies" | "dissolve" | "wordmark">("flies");
  const [wordmarkVisible, setWordmarkVisible] = useState(false);
  const [hinting, setHinting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("dissolve"), 3200);
    const t2 = setTimeout(() => { setPhase("wordmark"); setWordmarkVisible(true); }, 4400);
    const t3 = setTimeout(() => setHinting(true), 5400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const flies: Fly[] = Array.from({ length: FLY_COUNT }, (_, i) => createFly(i < FLY_COUNT));

    const img = new Image();
    img.src = "/mayfly-icon.webp";

    let animId = 0;
    function tick() {
      const W = canvas!.width;
      const H = canvas!.height;
      ctx.clearRect(0, 0, W, H);
      for (const f of flies) {
        f.x += f.speed;
        f.wobblePhase += f.wobbleSpeed;
        f.y += Math.sin(f.wobblePhase) * f.wobbleAmp;
        if (f.x > 112) Object.assign(f, createFly(false));
        if (!img.complete || !img.naturalWidth) continue;
        ctx.save();
        ctx.globalAlpha = f.opacity;
        ctx.translate((f.x / 100) * W, (f.y / 100) * H);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -f.size / 2, -f.size / 2, f.size, f.size);
        ctx.restore();
      }
      animId = requestAnimationFrame(tick);
    }
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="intro-overlay">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        style={{
          position: "absolute", inset: 0, width: "100%", height: "100%",
          transition: "opacity 1.4s ease-out",
          opacity: phase === "flies" ? 1 : 0,
          pointerEvents: "none",
        }}
      />

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
