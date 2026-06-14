"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const W = 400;
const H = 380;
const IS_MOBILE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const GRAVITY = 0.35;
const FLAP = -6.5;
const BASE_PIPE_SPEED = 1.5;
const PIPE_GAP = 160;
const PIPE_INTERVAL = IS_MOBILE ? 110 : 95;
const PIPE_WIDTH = 52;
const GROUND_H = 28;
const WATER_H = 14;
const CHOOPY_W = 48;
const CHOOPY_H = Math.round(48 * (1448 / 1086));
const FLY_SIZE = 30;
const CHOOPY_X = 80;
const BONUS_PER_FLY = 3;
const MILESTONES = [5, 10, 20, 30, 50];

type GameState = "idle" | "playing" | "dead";
interface Pipe { x: number; gapY: number; scored: boolean; }
interface Fly { x: number; y: number; eaten: boolean; bobOffset: number; }
interface Popup { x: number; y: number; life: number; text: string; color: string; }
interface LeaderEntry { _id: string; name: string; score: number; }

export default function FlappyChoopy() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>("idle");
  const [displayState, setDisplayState] = useState<GameState>("idle");
  const scoreRef = useRef(0);
  const flyScoreRef = useRef(0);
  const [best, setBest] = useState(0);
  const bestRef = useRef(0);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const musicBufferRef = useRef<AudioBuffer | null>(null);
  const wantsMusicRef = useRef(false);

  // Leaderboard UI state
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [showLeader, setShowLeader] = useState(false);
  const [submitName, setSubmitName] = useState("");
  const [pendingScore, setPendingScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loadingLB, setLoadingLB] = useState(false);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("flappy_choopy_best") ?? "0");
    setBest(stored);
    bestRef.current = stored;
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLB(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json() as { scores: LeaderEntry[] };
      setLeaderboard(data.scores ?? []);
    } catch { /* ignore */ }
    setLoadingLB(false);
  }, []);

  const submitScore = useCallback(async (name: string, score: number) => {
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score }),
      });
      const data = await res.json() as { scores: LeaderEntry[] };
      setLeaderboard(data.scores ?? []);
      setSubmitted(true);
    } catch { /* ignore */ }
  }, []);

  const startMusic = useCallback(() => {
    wantsMusicRef.current = true;
    if (!audioCtxRef.current || !musicBufferRef.current) return;
    audioCtxRef.current.resume();
    try { musicSourceRef.current?.stop(); } catch (_) {}
    const src = audioCtxRef.current.createBufferSource();
    src.buffer = musicBufferRef.current;
    src.loop = true;
    src.connect(masterGainRef.current!);
    src.start(0);
    musicSourceRef.current = src;
  }, []);

  const stopMusic = useCallback(() => {
    wantsMusicRef.current = false;
    try { musicSourceRef.current?.stop(); } catch (_) {}
    musicSourceRef.current = null;
  }, []);

  const playHitSound = useCallback(() => {
    if (!audioCtxRef.current || mutedRef.current) return;
    const ctx = audioCtxRef.current;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    g.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.25);
    osc.connect(g);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  }, []);

  const playMilestoneSound = useCallback(() => {
    if (!audioCtxRef.current || mutedRef.current) return;
    const ctx = audioCtxRef.current;
    [523, 659, 784].forEach((freq, i) => {
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      g.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.18);
      g.connect(masterGainRef.current!);
      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(g);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.18);
    });
  }, []);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setValueAtTime(next ? 0 : 0.6, audioCtxRef.current.currentTime);
    }
  }, []);

  useEffect(() => {
    const actx = new AudioContext();
    audioCtxRef.current = actx;
    const master = actx.createGain();
    master.gain.value = mutedRef.current ? 0 : 0.6;
    master.connect(actx.destination);
    masterGainRef.current = master;

    fetch("/teenage-dirtbag-chiptune.wav")
      .then(r => r.arrayBuffer())
      .then(ab => actx.decodeAudioData(ab))
      .then(buf => {
        musicBufferRef.current = buf;
        if (wantsMusicRef.current && !musicSourceRef.current) startMusic();
      })
      .catch(() => {});

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
    let animId = 0;
    let dead = false;
    let spawnCount = 0;
    let flapFrame = -99; // frame of last flap for wing animation
    let milestoneHit = new Set<number>();
    let flashLife = 0; // frames of screen flash remaining

    function pipeSpeed() {
      // Ramp up speed every 5 pipes, capped at 2.8
      return Math.min(BASE_PIPE_SPEED + Math.floor(scoreRef.current / 5) * 0.12, 2.8);
    }

    function reset() {
      frame = 0; y = H / 2 - 20; vy = 0;
      pipes = []; flies = []; popups = [];
      scoreRef.current = 0; flyScoreRef.current = 0;
      dead = false; spawnCount = 0; flapFrame = -99;
      milestoneHit = new Set(); flashLife = 0;
    }

    function flap() {
      if (stateRef.current === "idle") {
        actx.resume();
        stateRef.current = "playing"; setDisplayState("playing");
        reset(); vy = FLAP; flapFrame = frame;
        startMusic();
        return;
      }
      if (stateRef.current === "dead") {
        stateRef.current = "idle"; setDisplayState("idle"); return;
      }
      vy = FLAP; flapFrame = frame;
    }

    canvas.addEventListener("click", flap);
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); flap(); }
    }
    window.addEventListener("keydown", onKey);

    function drawBackground() {
      if (bgImg.complete && bgImg.naturalWidth) {
        const scale = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
        const dw = bgImg.naturalWidth * scale;
        const dh = bgImg.naturalHeight * scale;
        ctx.drawImage(bgImg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = "#0a0f2e";
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawPipe(x: number, topH: number, botY: number) {
      const C = "#8B0000", D = "#5a0000", CAP = 22, CX = 3;
      ctx.fillStyle = C; ctx.fillRect(x, 0, PIPE_WIDTH, topH - CAP);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 8, 0, 8, topH - CAP);
      ctx.fillStyle = C; ctx.fillRect(x - CX, topH - CAP, PIPE_WIDTH + CX * 2, CAP);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 5, topH - CAP, 5, CAP);
      ctx.fillStyle = C; ctx.fillRect(x - CX, botY, PIPE_WIDTH + CX * 2, CAP);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 5, botY, 5, CAP);
      const botBodyTop = botY + CAP;
      ctx.fillStyle = C; ctx.fillRect(x, botBodyTop, PIPE_WIDTH, H - botBodyTop);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 8, botBodyTop, 8, H - botBodyTop);
    }

    function drawChoopy(cy: number, vel: number) {
      const angle = Math.min(Math.max(vel * 0.055, -0.35), 0.85);
      // Wing flap: squish vertically for 8 frames after flap
      const flapAge = frame - flapFrame;
      const squishY = flapAge < 8 ? 1 - Math.sin((flapAge / 8) * Math.PI) * 0.25 : 1;
      const squishX = flapAge < 8 ? 1 + Math.sin((flapAge / 8) * Math.PI) * 0.15 : 1;

      ctx.save();
      ctx.translate(CHOOPY_X, cy);
      ctx.rotate(angle);
      ctx.scale(squishX, squishY);
      if (choopyImg.complete && choopyImg.naturalWidth > 0) {
        ctx.shadowColor = "#FFD700";
        ctx.shadowBlur = 7;
        for (let i = 0; i < 3; i++) {
          ctx.drawImage(choopyImg, -CHOOPY_W / 2, -CHOOPY_H / 2, CHOOPY_W, CHOOPY_H);
        }
        ctx.shadowBlur = 0;
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
        ctx.shadowColor = "rgba(0,0,0,0.9)";
        ctx.shadowBlur = 4;
        for (let i = 0; i < 3; i++) {
          ctx.drawImage(mayflyImg, f.x - FLY_SIZE / 2, f.y + bob - FLY_SIZE / 2, FLY_SIZE, FLY_SIZE);
        }
        ctx.restore();
      });
    }

    function drawPopups(ps: Popup[]) {
      ctx.save();
      ctx.font = "bold 14px monospace"; ctx.textAlign = "center";
      ps.forEach(p => {
        const a = p.life / 50;
        const rise = (50 - p.life) * 1.1;
        ctx.strokeStyle = `rgba(0,0,0,${a * 0.4})`; ctx.lineWidth = 2;
        ctx.fillStyle = p.color.replace(")", `,${a})`).replace("rgb", "rgba");
        ctx.strokeText(p.text, p.x, p.y - rise);
        ctx.fillText(p.text, p.x, p.y - rise);
      });
      ctx.restore();
    }

    function drawHUD(pipeScore: number, flyCount: number) {
      const speed = pipeSpeed();
      ctx.save();
      ctx.font = "bold 38px monospace"; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 3;
      ctx.strokeText(String(pipeScore), W / 2, 50);
      ctx.fillStyle = "white"; ctx.fillText(String(pipeScore), W / 2, 50);

      const bonus = flyCount * BONUS_PER_FLY;
      ctx.font = "bold 16px monospace"; ctx.textAlign = "right";
      ctx.strokeText(`🪰 +${bonus}`, W - 10, 30);
      ctx.fillStyle = "#FFD700"; ctx.fillText(`🪰 +${bonus}`, W - 10, 30);

      // Speed indicator — subtle top-left
      if (speed > BASE_PIPE_SPEED + 0.05) {
        const lvl = Math.floor((speed - BASE_PIPE_SPEED) / 0.12);
        ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
        ctx.fillStyle = "rgba(255,100,100,0.85)";
        ctx.fillText(`⚡ LVL ${lvl}`, 8, 20);
      }
      ctx.restore();
    }

    function drawFlash() {
      if (flashLife <= 0) return;
      const a = (flashLife / 20) * 0.35;
      ctx.fillStyle = `rgba(255,215,0,${a})`;
      ctx.fillRect(0, 0, W, H);
      flashLife--;
    }

    function drawIdle() {
      drawBackground();
      drawChoopy(H / 2 - 20 + Math.sin(frame * 0.05) * 7, 0);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); rrect(W / 2 - 120, H / 2 - 68, 240, 128, 10); ctx.fill();
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
      pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
      drawFlies(flies);
      drawChoopy(y, vy);
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "white";
      ctx.beginPath(); rrect(W / 2 - 115, H / 2 - 90, 230, 168, 10); ctx.fill();
      ctx.textAlign = "center";
      ctx.fillStyle = "#8B0000"; ctx.font = "bold 22px monospace";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 54);
      const bonus = fs * BONUS_PER_FLY;
      const total = ps + bonus;
      const xL = W / 2 - 52; const xV = W / 2 + 52;
      ctx.font = "15px monospace"; ctx.textAlign = "left"; ctx.fillStyle = "#1c2938";
      ctx.fillText("PIPES:", xL, H / 2 - 20);
      ctx.textAlign = "right"; ctx.fillText(String(ps), xV, H / 2 - 20);
      ctx.fillStyle = "#b8860b"; ctx.font = "bold 15px monospace";
      ctx.textAlign = "left"; ctx.fillText("BONUS:", xL, H / 2 + 4);
      ctx.textAlign = "right"; ctx.fillText(`+${bonus}`, xV, H / 2 + 4);
      ctx.fillStyle = "#1c2938"; ctx.font = "bold 15px monospace";
      ctx.textAlign = "left"; ctx.fillText("TOTAL:", xL, H / 2 + 28);
      ctx.textAlign = "right"; ctx.fillText(String(total), xV, H / 2 + 28);
      ctx.textAlign = "center";
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
          popups.push({ x: f.x, y: cy - 10, life: 50, text: `+${BONUS_PER_FLY} 🪰`, color: "rgb(255,215,0)" });
        }
      });
    }

    function checkMilestones(score: number) {
      for (const m of MILESTONES) {
        if (score >= m && !milestoneHit.has(m)) {
          milestoneHit.add(m);
          flashLife = 20;
          playMilestoneSound();
          popups.push({ x: W / 2, y: H / 2, life: 50, text: `🔥 ${m} PIPES!`, color: "rgb(255,100,50)" });
        }
      }
      // Speed level up notification
      const prevSpeed = Math.min(BASE_PIPE_SPEED + Math.floor((score - 1) / 5) * 0.12, 2.8);
      const newSpeed = Math.min(BASE_PIPE_SPEED + Math.floor(score / 5) * 0.12, 2.8);
      if (newSpeed > prevSpeed && newSpeed < 2.8) {
        popups.push({ x: W / 2, y: H / 3, life: 40, text: "⚡ FASTER!", color: "rgb(255,80,80)" });
      }
    }

    function tick() {
      frame++;
      const state = stateRef.current;
      if (state === "idle") { drawIdle(); animId = requestAnimationFrame(tick); return; }

      if (state === "playing") {
        const speed = pipeSpeed();
        if (frame % PIPE_INTERVAL === 0) {
          const margin = IS_MOBILE ? 50 : 60;
          const gapY = margin + Math.random() * (H - GROUND_H - WATER_H - PIPE_GAP - margin * 2);
          pipes.push({ x: W + 10, gapY, scored: false });
          spawnCount++;
          if (spawnCount % 2 === 0) {
            const nearTop = Math.random() < 0.5;
            const flyY = nearTop ? gapY + 24 : gapY + PIPE_GAP - 24;
            flies.push({ x: W + 10 + PIPE_WIDTH / 2, y: flyY, eaten: false, bobOffset: Math.random() * Math.PI * 2 });
          }
        }

        pipes = pipes.map(p => ({ ...p, x: p.x - speed })).filter(p => p.x > -PIPE_WIDTH - 10);
        flies = flies.map(f => ({ ...f, x: f.x - speed })).filter(f => f.x > -FLY_SIZE);
        popups = popups.map(p => ({ ...p, life: p.life - 1 })).filter(p => p.life > 0);

        pipes.forEach(p => {
          if (!p.scored && p.x + PIPE_WIDTH < CHOOPY_X) {
            p.scored = true;
            scoreRef.current++;
            checkMilestones(scoreRef.current);
          }
        });

        vy += GRAVITY; y += vy;
        checkEat(y);

        if (!dead && checkCollision(y)) {
          dead = true; stateRef.current = "dead"; setDisplayState("dead");
          stopMusic();
          playHitSound();
          const total = scoreRef.current + flyScoreRef.current * BONUS_PER_FLY;
          const nb = Math.max(total, bestRef.current);
          bestRef.current = nb; setBest(nb);
          localStorage.setItem("flappy_choopy_best", String(nb));
          if (total >= 3) {
            setPendingScore(total);
            setSubmitted(false);
            setSubmitName("");
          }
        }

        drawBackground();
        pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + PIPE_GAP));
        drawFlies(flies);
        drawChoopy(y, vy);
        drawPopups(popups);
        drawHUD(scoreRef.current, flyScoreRef.current);
        drawFlash();
      }

      if (state === "dead") drawDead(scoreRef.current, flyScoreRef.current);
      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("click", flap);
      window.removeEventListener("keydown", onKey);
      stopMusic();
      actx.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMusic, stopMusic, playHitSound, playMilestoneSound]);

  return (
    <div style={{ background: "white", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #e1e8ed", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <span style={{ fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>
          Flappy Choopy
        </span>
        <div style={{ position: "absolute", right: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            onClick={() => { setShowLeader(v => { if (!v) fetchLeaderboard(); return !v; }); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem", lineHeight: 1, padding: 0, color: "#8B0000", fontWeight: 700 }}
            title="Leaderboard"
          >🏆</button>
          <button
            onClick={toggleMute}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, padding: 0, color: "#657786" }}
            title={muted ? "Unmute" : "Mute"}
          >{muted ? "🔇" : "🔊"}</button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ display: "block", width: "100%", cursor: "pointer" }}
      />

      {/* Score submission after death */}
      {displayState === "dead" && pendingScore !== null && !submitted && (
        <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #e1e8ed", background: "#fafafa" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#1c2938", fontWeight: 700 }}>
            Score {pendingScore} — add to leaderboard?
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              value={submitName}
              onChange={e => setSubmitName(e.target.value.slice(0, 20))}
              placeholder="your name"
              maxLength={20}
              style={{ flex: 1, padding: "0.3rem 0.5rem", border: "1px solid #ccd6dd", borderRadius: 3, fontSize: "0.75rem" }}
              onKeyDown={e => { if (e.key === "Enter" && submitName.trim()) submitScore(submitName.trim(), pendingScore); }}
            />
            <button
              onClick={() => { if (submitName.trim()) submitScore(submitName.trim(), pendingScore!); }}
              disabled={!submitName.trim()}
              style={{ padding: "0.3rem 0.75rem", background: "#8B0000", color: "white", border: "none", borderRadius: 3, fontSize: "0.72rem", fontWeight: 700, cursor: submitName.trim() ? "pointer" : "default", opacity: submitName.trim() ? 1 : 0.5 }}
            >Submit</button>
            <button
              onClick={() => setPendingScore(null)}
              style={{ padding: "0.3rem 0.5rem", background: "none", border: "1px solid #ccd6dd", borderRadius: 3, fontSize: "0.72rem", cursor: "pointer", color: "#657786" }}
            >Skip</button>
          </div>
        </div>
      )}
      {displayState === "dead" && submitted && (
        <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid #e1e8ed", background: "#fafafa", fontSize: "0.72rem", color: "#8B0000", fontWeight: 700 }}>
          ✓ Score submitted!{" "}
          <button onClick={() => setShowLeader(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#8B0000", fontWeight: 700, fontSize: "0.72rem", textDecoration: "underline", padding: 0 }}>View leaderboard</button>
        </div>
      )}

      {/* Leaderboard panel */}
      {showLeader && (
        <div style={{ borderTop: "1px solid #e1e8ed", padding: "0.75rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.72rem", color: "#1c2938" }}>🏆 Top 10</span>
            <button onClick={() => setShowLeader(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#657786", fontSize: "0.85rem", padding: 0 }}>✕</button>
          </div>
          {loadingLB ? (
            <p style={{ fontSize: "0.7rem", color: "#657786", margin: 0 }}>Loading…</p>
          ) : leaderboard.length === 0 ? (
            <p style={{ fontSize: "0.7rem", color: "#657786", margin: 0 }}>No scores yet — be the first!</p>
          ) : (
            <ol style={{ margin: 0, padding: "0 0 0 1.2rem", fontSize: "0.72rem", color: "#1c2938", lineHeight: "1.8" }}>
              {leaderboard.map((e, i) => (
                <li key={e._id} style={{ fontWeight: i === 0 ? 700 : 400, color: i === 0 ? "#8B0000" : "#1c2938" }}>
                  {e.name} — {e.score}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
