"use client";

import { useEffect, useRef, useState } from "react";

const W = 400;
const H = 380;
const GRAVITY = 0.45;
const FLAP = -7.5;
const PIPE_SPEED = 2.2;
const PIPE_GAP = 115;
const PIPE_INTERVAL = 95;
const PIPE_WIDTH = 52;
const GROUND_H = 56;
const WATER_H = 28;

const CHOOPY_W = 48;
const CHOOPY_H = Math.round(48 * (1448 / 1086)); // ~64
const FLY_SIZE = 22;
const CHOOPY_X = 80;

type GameState = "idle" | "playing" | "dead";

interface Pipe { x: number; gapY: number; scored: boolean; }
interface Fly { x: number; y: number; eaten: boolean; bobOffset: number; }
interface Popup { x: number; y: number; life: number; }

export default function FlappyChoopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("idle");
  const [displayState, setDisplayState] = useState<GameState>("idle");
  const scoreRef = useRef(0);
  const flyScoreRef = useRef(0);
  const [scores, setScores] = useState({ pipes: 0, flies: 0 });
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
    const bgImg = new Image(); bgImg.src = "/tampa-skyline.webp";

    let frame = 0;
    let y = H / 2 - 20;
    let vy = 0;
    let pipes: Pipe[] = [];
    let flies: Fly[] = [];
    let popups: Popup[] = [];
    let groundOffset = 0;
    let animId = 0;
    let dead = false;

    function reset() {
      frame = 0; y = H / 2 - 20; vy = 0;
      pipes = []; flies = []; popups = [];
      scoreRef.current = 0; flyScoreRef.current = 0;
      groundOffset = 0; dead = false;
      setScores({ pipes: 0, flies: 0 });
    }

    function flap() {
      if (stateRef.current === "idle") {
        stateRef.current = "playing"; setDisplayState("playing");
        reset(); vy = FLAP; return;
      }
      if (stateRef.current === "dead") {
        stateRef.current = "idle"; setDisplayState("idle"); return;
      }
      vy = FLAP;
    }

    canvas.addEventListener("click", flap);
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    }
    window.addEventListener("keydown", onKey);

    // ── Tampa skyline (real pixel-art image) ─────────────────────
    function drawBackground() {
      if (bgImg.complete && bgImg.naturalWidth) {
        // cover the whole canvas; image includes sky, skyline + water reflection
        const scale = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
        const dw = bgImg.naturalWidth * scale;
        const dh = bgImg.naturalHeight * scale;
        ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = "#0a0f2e";
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawWater() { /* water is part of the skyline image */ }

    function drawGround() {
      // The skyline image already provides the bay water; add a moving
      // shimmer along the death waterline so the surface reads as alive.
      const waterY = H - GROUND_H - WATER_H;
      ctx.lineWidth = 1;
      for (let wx = (-groundOffset % 18); wx < W; wx += 18) {
        const woff = Math.sin(frame * 0.05 + wx * 0.1) * 2;
        ctx.strokeStyle = "rgba(255,230,180,0.18)";
        ctx.beginPath();
        ctx.moveTo(wx, waterY + 4 + woff);
        ctx.lineTo(wx + 8, waterY + 4 + woff);
        ctx.stroke();
      }
    }

    function drawPipe(x: number, topH: number, botY: number) {
      const C = "#8B0000", D = "#5a0000", CAP = 22, CX = 3;
      ctx.fillStyle = C;
      ctx.fillRect(x, 0, PIPE_WIDTH, topH - CAP);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 8, 0, 8, topH - CAP);
      ctx.fillStyle = C; ctx.fillRect(x - CX, topH - CAP, PIPE_WIDTH + CX * 2, CAP);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 5, topH - CAP, 5, CAP);
      ctx.fillStyle = C; ctx.fillRect(x - CX, botY, PIPE_WIDTH + CX * 2, CAP);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 5, botY, 5, CAP);
      const botBodyTop = botY + CAP;
      ctx.fillStyle = C; ctx.fillRect(x, botBodyTop, PIPE_WIDTH, H - GROUND_H - botBodyTop);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 8, botBodyTop, 8, H - GROUND_H - botBodyTop);
    }

    function drawChoopy(cy: number, vel: number) {
      const angle = Math.min(Math.max(vel * 0.055, -0.35), 0.85);
      ctx.save();
      ctx.translate(CHOOPY_X, cy);
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
        ctx.save(); ctx.globalAlpha = 0.92;
        ctx.drawImage(mayflyImg, f.x - FLY_SIZE / 2, f.y + bob - FLY_SIZE / 2, FLY_SIZE, FLY_SIZE);
        ctx.restore();
      });
    }

    function drawPopups(ps: Popup[]) {
      ctx.save();
      ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
      ps.forEach(p => {
        const a = p.life / 40;
        const rise = (40 - p.life) * 0.9;
        ctx.strokeStyle = `rgba(0,0,0,${a * 0.4})`; ctx.lineWidth = 2;
        ctx.fillStyle = `rgba(255,215,0,${a})`;
        ctx.strokeText("+1 🪰", p.x, p.y - rise);
        ctx.fillText("+1 🪰", p.x, p.y - rise);
      });
      ctx.restore();
    }

    function drawHUD(pipes: number, mayflies: number) {
      // Pipe score — center top
      ctx.save();
      ctx.font = "bold 38px monospace"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 3;
      ctx.strokeText(String(pipes), W / 2, 50);
      ctx.fillStyle = "white"; ctx.fillText(String(pipes), W / 2, 50);

      // Mayfly score — top right with tiny icon
      ctx.font = "bold 16px monospace"; ctx.textAlign = "right";
      ctx.strokeText(`🪰 ×${mayflies}`, W - 10, 30);
      ctx.fillStyle = "#FFD700"; ctx.fillText(`🪰 ×${mayflies}`, W - 10, 30);
      ctx.restore();
    }

    function drawIdle() {
      drawBackground();
      drawWater();
      drawGround();
      drawChoopy(H / 2 - 20 + Math.sin(frame * 0.05) * 7, 0);

      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      rrect(W / 2 - 120, H / 2 - 68, 240, 128, 10); ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = "white"; ctx.font = "bold 22px monospace";
      ctx.fillText("FLAPPY CHOOPY", W / 2, H / 2 - 34);
      ctx.font = "12px monospace"; ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText("tap or space to fly", W / 2, H / 2 - 8);
      ctx.fillStyle = "#FFD700";
      ctx.fillText("eat mayflies for bonus pts!", W / 2, H / 2 + 14);
      if (bestRef.current > 0) {
        ctx.font = "bold 12px monospace"; ctx.fillStyle = "#FFD700";
        ctx.fillText(`BEST: ${bestRef.current}`, W / 2, H / 2 + 40);
      }
    }

    function drawDead(ps: number, fs: number) {
      drawBackground();
      drawWater();
      pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
      drawFlies(flies);
      drawGround();
      drawChoopy(y, vy);

      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "white";
      ctx.beginPath(); rrect(W / 2 - 115, H / 2 - 90, 230, 168, 10); ctx.fill();

      ctx.textAlign = "center";
      ctx.fillStyle = "#8B0000"; ctx.font = "bold 22px monospace";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 54);

      ctx.fillStyle = "#1c2938"; ctx.font = "15px monospace";
      ctx.fillText(`PIPES:    ${ps}`, W / 2, H / 2 - 20);
      ctx.fillStyle = "#b8860b"; ctx.font = "bold 15px monospace";
      ctx.fillText(`MAYFLIES: ${fs}`, W / 2, H / 2 + 4);

      const total = ps + fs;
      ctx.fillStyle = "#1c2938"; ctx.font = "bold 15px monospace";
      ctx.fillText(`TOTAL:    ${total}`, W / 2, H / 2 + 28);

      const nb = Math.max(total, bestRef.current);
      ctx.fillStyle = "#8B0000"; ctx.font = "bold 13px monospace";
      ctx.fillText(`BEST: ${nb}`, W / 2, H / 2 + 52);

      ctx.fillStyle = "#526270"; ctx.font = "11px monospace";
      ctx.fillText("tap to play again", W / 2, H / 2 + 74);
    }

    function rrect(x: number, ry: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, ry); ctx.lineTo(x + w - r, ry);
      ctx.arcTo(x + w, ry, x + w, ry + r, r); ctx.lineTo(x + w, ry + h - r);
      ctx.arcTo(x + w, ry + h, x + w - r, ry + h, r); ctx.lineTo(x + r, ry + h);
      ctx.arcTo(x, ry + h, x, ry + h - r, r); ctx.lineTo(x, ry + r);
      ctx.arcTo(x, ry, x + r, ry, r); ctx.closePath();
    }

    function checkCollision(cy: number): boolean {
      const r = 13;
      if (cy + r >= H - GROUND_H - WATER_H) return true;
      if (cy - r <= 0) return true;
      for (const p of pipes) {
        if (CHOOPY_X + r > p.x + 4 && CHOOPY_X - r < p.x + PIPE_WIDTH - 4) {
          if (cy - r < p.gapY || cy + r > p.gapY + PIPE_GAP) return true;
        }
      }
      return false;
    }

    function checkEat(cy: number) {
      flies.forEach(f => {
        if (f.eaten) return;
        const bob = Math.sin(frame * 0.08 + f.bobOffset) * 4;
        const dist = Math.sqrt((CHOOPY_X - f.x) ** 2 + (cy - (f.y + bob)) ** 2);
        if (dist < 18 + FLY_SIZE / 2) {
          f.eaten = true;
          flyScoreRef.current++;
          setScores({ pipes: scoreRef.current, flies: flyScoreRef.current });
          popups.push({ x: f.x, y: cy - 10, life: 40 });
        }
      });
    }

    function tick() {
      frame++;
      const state = stateRef.current;

      if (state === "idle") { drawIdle(); animId = requestAnimationFrame(tick); return; }

      if (state === "playing") {
        groundOffset += PIPE_SPEED;

        if (frame % PIPE_INTERVAL === 0) {
          const gapY = 60 + Math.random() * (H - GROUND_H - WATER_H - PIPE_GAP - 120);
          pipes.push({ x: W + 10, gapY, scored: false });
          flies.push({ x: W + 10 + PIPE_WIDTH / 2, y: gapY + PIPE_GAP / 2, eaten: false, bobOffset: Math.random() * Math.PI * 2 });
        }

        pipes = pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED })).filter(p => p.x > -PIPE_WIDTH - 10);
        flies = flies.map(f => ({ ...f, x: f.x - PIPE_SPEED })).filter(f => f.x > -FLY_SIZE);
        popups = popups.map(p => ({ ...p, life: p.life - 1 })).filter(p => p.life > 0);

        pipes.forEach(p => {
          if (!p.scored && p.x + PIPE_WIDTH < CHOOPY_X) {
            p.scored = true; scoreRef.current++;
            setScores({ pipes: scoreRef.current, flies: flyScoreRef.current });
          }
        });

        vy += GRAVITY; y += vy;
        checkEat(y);

        if (!dead && checkCollision(y)) {
          dead = true; stateRef.current = "dead"; setDisplayState("dead");
          const total = scoreRef.current + flyScoreRef.current;
          const nb = Math.max(total, bestRef.current);
          bestRef.current = nb; setBest(nb);
          localStorage.setItem("flappy_choopy_best", String(nb));
        }

        drawBackground(); drawWater();
        pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
        drawFlies(flies); drawGround();
        drawChoopy(y, vy); drawPopups(popups);
        drawHUD(scoreRef.current, flyScoreRef.current);
      }

      if (state === "dead") drawDead(scoreRef.current, flyScoreRef.current);

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
      {displayState === "playing" && (
        <div style={{ padding: "0.35rem 0.85rem", display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#657786", borderTop: "1px solid #f0f3f4" }}>
          <span>pipes: {scores.pipes}</span>
          <span>🪰 mayflies: {scores.flies}</span>
        </div>
      )}
    </div>
  );
}
