"use client";

import { useEffect, useRef, useState } from "react";

const W = 320;
const H = 480;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_SPEED = 2.2;
const PIPE_GAP = 130;
const PIPE_INTERVAL = 90; // frames
const PIPE_WIDTH = 52;
const GROUND_H = 64;
const CHOOPY_W = 46;
const CHOOPY_H = 36;

type GameState = "idle" | "playing" | "dead";

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

export default function FlappyChoopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("idle");
  const [displayState, setDisplayState] = useState<GameState>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("flappy_choopy_best") ?? "0");
    setBest(stored);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    // Load images
    const choopyImg = new Image(); choopyImg.src = "/choopy-fly.webp";
    const mayflyImg = new Image(); mayflyImg.src = "/mayfly-icon.webp";

    let frame = 0;
    let y = H / 2 - 30;
    let vy = 0;
    let pipes: Pipe[] = [];
    let currentScore = 0;
    let groundOffset = 0;
    let animId = 0;
    let dead = false;

    function reset() {
      frame = 0;
      y = H / 2 - 30;
      vy = 0;
      pipes = [];
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

    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    }
    function onClick() { flap(); }

    canvas.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);

    function drawPipe(x: number, topH: number, botY: number) {
      const PIPE_COLOR = "#8B0000";
      const CAP_H = 22;
      const CAP_EXTRA = 6;

      // top pipe body
      ctx.fillStyle = PIPE_COLOR;
      ctx.fillRect(x, 0, PIPE_WIDTH, topH - CAP_H);
      // top pipe cap
      ctx.fillRect(x - CAP_EXTRA / 2, topH - CAP_H, PIPE_WIDTH + CAP_EXTRA, CAP_H);

      // bottom pipe body
      const botBodyTop = botY + CAP_H;
      ctx.fillRect(x, botBodyTop, PIPE_WIDTH, H - GROUND_H - botBodyTop);
      // bottom pipe cap
      ctx.fillRect(x - CAP_EXTRA / 2, botY, PIPE_WIDTH + CAP_EXTRA, CAP_H);

      // mayfly at gap openings
      const mSize = 28;
      if (mayflyImg.complete) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        // top opening - flip vertically
        ctx.translate(x + PIPE_WIDTH / 2, topH - 4);
        ctx.scale(1, -1);
        ctx.drawImage(mayflyImg, -mSize / 2, 0, mSize, mSize);
        ctx.restore();
        // bottom opening
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(mayflyImg, x + PIPE_WIDTH / 2 - mSize / 2, botY - mSize + 4, mSize, mSize);
        ctx.restore();
      }
    }

    function drawChoopy(cy: number, vel: number) {
      const angle = Math.min(Math.max(vel * 0.06, -0.4), 0.9);
      ctx.save();
      ctx.translate(72, cy + CHOOPY_H / 2);
      ctx.rotate(angle);
      if (choopyImg.complete) {
        ctx.drawImage(choopyImg, -CHOOPY_W / 2, -CHOOPY_H / 2, CHOOPY_W, CHOOPY_H);
      } else {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(-CHOOPY_W / 2, -CHOOPY_H / 2, CHOOPY_W, CHOOPY_H);
      }
      ctx.restore();
    }

    function drawGround() {
      // Scrolling ground strip
      ctx.fillStyle = "#c8a96e";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = "#5a8a3c";
      ctx.fillRect(0, H - GROUND_H, W, 12);

      // grass tufts
      ctx.fillStyle = "#4a7a2c";
      for (let gx = (-groundOffset % 48); gx < W + 48; gx += 48) {
        ctx.beginPath();
        ctx.arc(gx, H - GROUND_H + 6, 10, Math.PI, 0);
        ctx.fill();
      }
    }

    function drawBackground() {
      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, H - GROUND_H);
      sky.addColorStop(0, "#87CEEB");
      sky.addColorStop(1, "#c9e8f5");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H - GROUND_H);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      const clouds = [[40, 60], [160, 40], [250, 80]];
      clouds.forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.arc(cx + 20, cy - 5, 15, 0, Math.PI * 2);
        ctx.arc(cx - 15, cy + 2, 14, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function checkCollision(cy: number, ps: Pipe[]): boolean {
      const cx = 72;
      const r = 13; // Choopy hitbox radius (tight)
      if (cy + r >= H - GROUND_H) return true;
      if (cy - r <= 0) return true;
      for (const p of ps) {
        if (cx + r > p.x + 4 && cx - r < p.x + PIPE_WIDTH - 4) {
          if (cy - r < p.gapY || cy + r > p.gapY + PIPE_GAP) return true;
        }
      }
      return false;
    }

    function drawScore(s: number) {
      ctx.save();
      ctx.font = "bold 36px monospace";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 3;
      ctx.textAlign = "center";
      ctx.strokeText(String(s), W / 2, 52);
      ctx.fillText(String(s), W / 2, 52);
      ctx.restore();
    }

    function drawIdle() {
      drawBackground();
      drawGround();
      drawChoopy(H / 2 - 30 + Math.sin(frame * 0.05) * 6, 0);

      // Panel
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      roundRect(ctx, W / 2 - 110, H / 2 - 60, 220, 110, 10);
      ctx.fill();

      ctx.fillStyle = "white";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("FLAPPY CHOOPY", W / 2, H / 2 - 28);
      ctx.font = "13px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("tap or press space", W / 2, H / 2 + 2);
      if (best > 0) {
        ctx.fillStyle = "#FFD700";
        ctx.font = "bold 13px monospace";
        ctx.fillText(`BEST: ${best}`, W / 2, H / 2 + 28);
      }
    }

    function drawDead(s: number) {
      drawBackground();
      pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
      drawGround();
      drawChoopy(y, vy);

      // Dim
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, W, H);

      // Panel
      ctx.fillStyle = "white";
      ctx.beginPath();
      roundRect(ctx, W / 2 - 110, H / 2 - 80, 220, 145, 10);
      ctx.fill();

      ctx.fillStyle = "#8B0000";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 45);

      ctx.fillStyle = "#1c2938";
      ctx.font = "14px monospace";
      ctx.fillText(`SCORE: ${s}`, W / 2, H / 2 - 10);
      ctx.fillStyle = "#8B0000";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`BEST: ${Math.max(s, best)}`, W / 2, H / 2 + 15);

      ctx.fillStyle = "#526270";
      ctx.font = "12px monospace";
      ctx.fillText("tap to play again", W / 2, H / 2 + 50);
    }

    function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.lineTo(x + w - r, y);
      c.arcTo(x + w, y, x + w, y + r, r);
      c.lineTo(x + w, y + h - r);
      c.arcTo(x + w, y + h, x + w - r, y + h, r);
      c.lineTo(x + r, y + h);
      c.arcTo(x, y + h, x, y + h - r, r);
      c.lineTo(x, y + r);
      c.arcTo(x, y, x + r, y, r);
      c.closePath();
    }

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

        // Spawn pipes
        if (frame % PIPE_INTERVAL === 0) {
          const minGapY = 60;
          const maxGapY = H - GROUND_H - PIPE_GAP - 60;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);
          pipes.push({ x: W + 10, gapY, scored: false });
        }

        // Move pipes
        pipes = pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED })).filter(p => p.x > -PIPE_WIDTH - 10);

        // Score
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

        // Collision
        if (!dead && checkCollision(y + CHOOPY_H / 2, pipes)) {
          dead = true;
          stateRef.current = "dead";
          setDisplayState("dead");
          const newBest = Math.max(currentScore, best);
          setBest(newBest);
          localStorage.setItem("flappy_choopy_best", String(newBest));
        }

        // Draw
        drawBackground();
        pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
        drawGround();
        drawChoopy(y, vy);
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
      canvas.removeEventListener("click", onClick);
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
        style={{ display: "block", width: "100%", cursor: "pointer", imageRendering: "pixelated" }}
      />
      {displayState === "playing" && (
        <div style={{ padding: "0.4rem 0.85rem", textAlign: "center", fontSize: "0.68rem", color: "#657786", fontStyle: "italic" }}>
          tap or space to flap · score: {score}
        </div>
      )}
    </div>
  );
}
