"use client";

import { useEffect, useRef, useState } from "react";

const W = 320;
const H = 480;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_SPEED = 2.2;
const PIPE_GAP = 130;
const PIPE_INTERVAL = 90;
const PIPE_WIDTH = 52;
const GROUND_H = 64;

// Choopy: original is 1086x1448, keep aspect ratio
const CHOOPY_W = 44;
const CHOOPY_H = Math.round(44 * (1448 / 1086)); // ~59

// Mayfly collectible size
const FLY_SIZE = 24;

type GameState = "idle" | "playing" | "dead";

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

interface Fly {
  x: number;
  y: number;
  eaten: boolean;
  bobOffset: number;
}

interface Popup {
  x: number;
  y: number;
  life: number; // frames remaining
}

export default function FlappyChoopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("idle");
  const [displayState, setDisplayState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const bestRef = useRef(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("flappy_choopy_best") ?? "0");
    setBest(stored);
    bestRef.current = stored;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const choopyImg = new Image(); choopyImg.src = "/choopy-fly.webp";
    const mayflyImg = new Image(); mayflyImg.src = "/mayfly-icon.webp";

    let frame = 0;
    let y = H / 2 - 20;
    let vy = 0;
    let pipes: Pipe[] = [];
    let flies: Fly[] = [];
    let popups: Popup[] = [];
    let currentScore = 0;
    let groundOffset = 0;
    let animId = 0;
    let dead = false;

    function reset() {
      frame = 0;
      y = H / 2 - 20;
      vy = 0;
      pipes = [];
      flies = [];
      popups = [];
      currentScore = 0;
      groundOffset = 0;
      dead = false;
    }

    function flap() {
      if (stateRef.current === "idle") {
        stateRef.current = "playing";
        setDisplayState("playing");
        reset();
        vy = FLAP;
        return;
      }
      if (stateRef.current === "dead") {
        stateRef.current = "idle";
        setDisplayState("idle");
        return;
      }
      vy = FLAP;
    }

    canvas.addEventListener("click", flap);
    window.addEventListener("keydown", onKey);
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    }

    // ── Drawing helpers ──────────────────────────────────────────

    function roundRect(x: number, ry: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, ry);
      ctx.lineTo(x + w - r, ry);
      ctx.arcTo(x + w, ry, x + w, ry + r, r);
      ctx.lineTo(x + w, ry + h - r);
      ctx.arcTo(x + w, ry + h, x + w - r, ry + h, r);
      ctx.lineTo(x + r, ry + h);
      ctx.arcTo(x, ry + h, x, ry + h - r, r);
      ctx.lineTo(x, ry + r);
      ctx.arcTo(x, ry, x + r, ry, r);
      ctx.closePath();
    }

    function drawBackground() {
      const sky = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      sky.addColorStop(0, "#87CEEB");
      sky.addColorStop(1, "#c9e8f5");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H - GROUND_H);

      ctx.fillStyle = "rgba(255,255,255,0.8)";
      [[40, 60, 20], [160, 40, 18], [250, 80, 16]].forEach(([cx, cy, r]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.arc(cx + r, cy - 4, r * 0.75, 0, Math.PI * 2);
        ctx.arc(cx - r * 0.7, cy + 2, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawGround() {
      ctx.fillStyle = "#c8a96e";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = "#5a8a3c";
      ctx.fillRect(0, H - GROUND_H, W, 12);
      ctx.fillStyle = "#4a7a2c";
      for (let gx = (-groundOffset % 48); gx < W + 48; gx += 48) {
        ctx.beginPath();
        ctx.arc(gx, H - GROUND_H + 6, 10, Math.PI, 0);
        ctx.fill();
      }
    }

    function drawPipe(x: number, topH: number, botY: number) {
      const C = "#8B0000";
      const DARK = "#5a0000";
      const CAP_H = 22;
      const CAP_X = 3;

      // top body
      ctx.fillStyle = C;
      ctx.fillRect(x, 0, PIPE_WIDTH, topH - CAP_H);
      // top highlight stripe
      ctx.fillStyle = DARK;
      ctx.fillRect(x + PIPE_WIDTH - 8, 0, 8, topH - CAP_H);
      // top cap
      ctx.fillStyle = C;
      ctx.fillRect(x - CAP_X, topH - CAP_H, PIPE_WIDTH + CAP_X * 2, CAP_H);
      ctx.fillStyle = DARK;
      ctx.fillRect(x - CAP_X + PIPE_WIDTH + CAP_X * 2 - 8, topH - CAP_H, 8, CAP_H);

      // bottom cap
      ctx.fillStyle = C;
      ctx.fillRect(x - CAP_X, botY, PIPE_WIDTH + CAP_X * 2, CAP_H);
      ctx.fillStyle = DARK;
      ctx.fillRect(x - CAP_X + PIPE_WIDTH + CAP_X * 2 - 8, botY, 8, CAP_H);
      // bottom body
      const botBodyTop = botY + CAP_H;
      ctx.fillStyle = C;
      ctx.fillRect(x, botBodyTop, PIPE_WIDTH, H - GROUND_H - botBodyTop);
      ctx.fillStyle = DARK;
      ctx.fillRect(x + PIPE_WIDTH - 8, botBodyTop, 8, H - GROUND_H - botBodyTop);
    }

    function drawChoopy(cy: number, vel: number) {
      const angle = Math.min(Math.max(vel * 0.055, -0.35), 0.85);
      ctx.save();
      ctx.translate(72, cy);
      ctx.rotate(angle);
      if (choopyImg.complete && choopyImg.naturalWidth > 0) {
        ctx.drawImage(choopyImg, -CHOOPY_W / 2, -CHOOPY_H / 2, CHOOPY_W, CHOOPY_H);
      } else {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(-CHOOPY_W / 2, -CHOOPY_H / 2, CHOOPY_W, CHOOPY_H);
      }
      ctx.restore();
    }

    function drawFlies(fs: Fly[]) {
      if (!mayflyImg.complete || !mayflyImg.naturalWidth) return;
      fs.forEach(f => {
        if (f.eaten) return;
        const bob = Math.sin(frame * 0.08 + f.bobOffset) * 4;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.drawImage(mayflyImg, f.x - FLY_SIZE / 2, f.y + bob - FLY_SIZE / 2, FLY_SIZE, FLY_SIZE);
        ctx.restore();
      });
    }

    function drawPopups(ps: Popup[]) {
      ctx.save();
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ps.forEach(p => {
        const alpha = p.life / 40;
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.5})`;
        ctx.lineWidth = 2;
        const rise = (40 - p.life) * 0.8;
        ctx.strokeText("+1", p.x, p.y - rise);
        ctx.fillText("+1", p.x, p.y - rise);
      });
      ctx.restore();
    }

    function drawScore(s: number) {
      ctx.save();
      ctx.font = "bold 36px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 3;
      ctx.strokeText(String(s), W / 2, 52);
      ctx.fillStyle = "white";
      ctx.fillText(String(s), W / 2, 52);
      ctx.restore();
    }

    function drawIdle() {
      drawBackground();
      drawGround();
      drawChoopy(H / 2 - 20 + Math.sin(frame * 0.05) * 7, 0);

      ctx.fillStyle = "rgba(0,0,0,0.45)";
      roundRect(W / 2 - 110, H / 2 - 62, 220, 115, 10);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("FLAPPY CHOOPY", W / 2, H / 2 - 28);
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("tap or space to fly", W / 2, H / 2 + 2);
      ctx.fillStyle = "rgba(255,215,0,0.9)";
      ctx.fillText("eat mayflies for bonus pts!", W / 2, H / 2 + 22);
      if (bestRef.current > 0) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 12px monospace";
        ctx.fillText(`BEST: ${bestRef.current}`, W / 2, H / 2 + 44);
      }
    }

    function drawDead(s: number) {
      drawBackground();
      pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
      drawFlies(flies);
      drawGround();
      drawChoopy(y, vy);

      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "white";
      roundRect(W / 2 - 110, H / 2 - 85, 220, 155, 10);
      ctx.fill();

      ctx.fillStyle = "#8B0000";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 48);

      ctx.fillStyle = "#1c2938";
      ctx.font = "14px monospace";
      ctx.fillText(`SCORE: ${s}`, W / 2, H / 2 - 14);
      ctx.fillStyle = "#8B0000";
      ctx.font = "bold 14px monospace";
      const nb = Math.max(s, bestRef.current);
      ctx.fillText(`BEST: ${nb}`, W / 2, H / 2 + 12);

      ctx.fillStyle = "#526270";
      ctx.font = "11px monospace";
      ctx.fillText("pipes = 1pt  ·  mayflies = +1", W / 2, H / 2 + 42);
      ctx.fillText("tap to play again", W / 2, H / 2 + 60);
    }

    // ── Collision ────────────────────────────────────────────────

    function checkCollision(cy: number, ps: Pipe[]): boolean {
      const cx = 72;
      const r = 12;
      if (cy + r >= H - GROUND_H) return true;
      if (cy - r <= 0) return true;
      for (const p of ps) {
        if (cx + r > p.x + 4 && cx - r < p.x + PIPE_WIDTH - 4) {
          if (cy - r < p.gapY || cy + r > p.gapY + PIPE_GAP) return true;
        }
      }
      return false;
    }

    function checkFlyEat(cy: number, fs: Fly[]) {
      const cx = 72;
      const r = 16;
      fs.forEach(f => {
        if (f.eaten) return;
        const bob = Math.sin(frame * 0.08 + f.bobOffset) * 4;
        const fy = f.y + bob;
        const dist = Math.sqrt((cx - f.x) ** 2 + (cy - fy) ** 2);
        if (dist < r + FLY_SIZE / 2) {
          f.eaten = true;
          currentScore++;
          setScore(currentScore);
          popups.push({ x: f.x, y: cy - 10, life: 40 });
        }
      });
    }

    // ── Main loop ────────────────────────────────────────────────

    function tick() {
      frame++;
      const state = stateRef.current;

      if (state === "idle") {
        drawIdle();
        animId = requestAnimationFrame(tick);
        return;
      }

      if (state === "playing") {
        groundOffset += PIPE_SPEED;

        // Spawn pipes + one mayfly per pipe in the gap
        if (frame % PIPE_INTERVAL === 0) {
          const minGapY = 60;
          const maxGapY = H - GROUND_H - PIPE_GAP - 60;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);
          pipes.push({ x: W + 10, gapY, scored: false });
          // mayfly in the center of the gap
          flies.push({
            x: W + 10 + PIPE_WIDTH / 2,
            y: gapY + PIPE_GAP / 2,
            eaten: false,
            bobOffset: Math.random() * Math.PI * 2,
          });
        }

        pipes = pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED })).filter(p => p.x > -PIPE_WIDTH - 10);
        flies = flies.map(f => ({ ...f, x: f.x - PIPE_SPEED })).filter(f => f.x > -FLY_SIZE);
        popups = popups.map(p => ({ ...p, life: p.life - 1 })).filter(p => p.life > 0);

        // Score for passing pipes
        pipes.forEach(p => {
          if (!p.scored && p.x + PIPE_WIDTH < 72) {
            p.scored = true;
            currentScore++;
            setScore(currentScore);
          }
        });

        // Physics
        vy += GRAVITY;
        y += vy;

        // Eat mayflies
        checkFlyEat(y, flies);

        // Collision
        if (!dead && checkCollision(y, pipes)) {
          dead = true;
          stateRef.current = "dead";
          setDisplayState("dead");
          const nb = Math.max(currentScore, bestRef.current);
          bestRef.current = nb;
          setBest(nb);
          localStorage.setItem("flappy_choopy_best", String(nb));
        }

        drawBackground();
        pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
        drawFlies(flies);
        drawGround();
        drawChoopy(y, vy);
        drawPopups(popups);
        drawScore(currentScore);
      }

      if (state === "dead") {
        drawDead(currentScore);
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", flap);
      window.removeEventListener("keydown", onKey);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #e1e8ed", textAlign: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>
          Flappy Choopy
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: "block", width: "100%", cursor: "pointer" }}
      />
    </div>
  );
}
