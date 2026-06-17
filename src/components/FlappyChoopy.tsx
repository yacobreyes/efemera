"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const W = 400;
const H = 380;
const IS_MOBILE = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
const GRAVITY = IS_MOBILE ? 0.68 : 0.68;
const FLAP = IS_MOBILE ? -9.6 : -9.6;
const BASE_PIPE_SPEED = IS_MOBILE ? 5.8 : 5.8;
const PIPE_GAP = IS_MOBILE ? 155 : 148;
const PIPE_INTERVAL = IS_MOBILE ? 42 : 42;
const PIPE_WIDTH = 52;
const GROUND_H = 28;
const WATER_H = 14;
const CHOOPY_W = 48;
const CHOOPY_H = Math.round(48 * (1448 / 1086));
const FLY_SIZE = 30;
const CHOOPY_X = 80;
const BONUS_PER_FLY = 3;
const MILESTONES = [5, 10, 20, 30, 50];

type GameState = "idle" | "playing" | "dead" | "scores";
interface Pipe { x: number; gapY: number; gap: number; scored: boolean; }
interface Fly { x: number; y: number; eaten: boolean; bobOffset: number; }
interface Popup { x: number; y: number; life: number; text: string; color: string; }
interface LeaderEntry { _id: string; name: string; score: number; }

export default function FlappyChoopy({ disabled = false }: { disabled?: boolean }) {
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

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

  const leaderboardRef = useRef<LeaderEntry[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const pendingScoreRef = useRef<number | null>(null);
  const submitNameRef = useRef("");
  const [submitName, setSubmitName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [nameInputActive, setNameInputActive] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem("flappy_choopy_best") ?? "0");
    setBest(stored);
    bestRef.current = stored;
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json() as { scores: LeaderEntry[] };
      leaderboardRef.current = data.scores ?? [];
      setLeaderboard(data.scores ?? []);
    } catch { /* ignore */ }
  }, []);

  const submitScore = useCallback(async (name: string, score: number) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, score }),
      });
      const data = await res.json() as { scores?: LeaderEntry[]; error?: string };
      if (!res.ok || !Array.isArray(data.scores)) {
        setSubmitError(
          res.status === 429 ? "TOO MANY TRIES — WAIT A BIT" : "COULDN'T SAVE — TRY AGAIN"
        );
        setSubmitting(false);
        return;
      }
      leaderboardRef.current = data.scores;
      setLeaderboard(data.scores);
      setSubmitted(true);
      setNameInputActive(false);
    } catch {
      setSubmitError("NETWORK ERROR — TRY AGAIN");
    } finally {
      setSubmitting(false);
    }
  }, []);

  const startMusic = useCallback(() => {
    wantsMusicRef.current = true;
    const ctx = audioCtxRef.current;
    if (!ctx || !musicBufferRef.current) return;

    const begin = () => {
      if (!wantsMusicRef.current || !audioCtxRef.current || !musicBufferRef.current) return;
      try { musicSourceRef.current?.stop(); } catch (_) {}
      const src = audioCtxRef.current.createBufferSource();
      src.buffer = musicBufferRef.current;
      src.loop = true;
      src.connect(masterGainRef.current!);
      src.start(0);
      musicSourceRef.current = src;
    };

    // iOS Safari hands back a suspended context (it was created on mount, not in
    // a gesture). Starting a source before resume() lands is silent there, so
    // wait for the resume to settle. Desktop contexts are already running and
    // take the synchronous path, matching the behavior that worked before.
    if (ctx.state === "suspended") {
      ctx.resume().then(begin).catch(begin);
    } else {
      begin();
    }
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
    fetchLeaderboard();

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
    let flapFrame = -99;
    let milestoneHit = new Set<number>();
    let flashLife = 0;

    // Fixed-timestep accumulator: the simulation advances at a constant 60
    // steps/sec no matter the display refresh rate. Without this, a 120Hz phone
    // runs the rAF loop twice as often as a 60Hz monitor and the game plays at
    // double speed with double effective gravity.
    const STEP_MS = 1000 / 60;
    let lastTime = 0;
    let acc = 0;
    // animFrame drives idle/scores animations at real time (seconds × 60) so
    // they also look the same at any refresh rate.
    let animSec = 0;

    function pipeSpeed() {
      return Math.min(BASE_PIPE_SPEED + Math.floor(scoreRef.current / 3) * 0.2, BASE_PIPE_SPEED * 1.6);
    }

    function reset() {
      frame = 0; y = H / 2 - 20; vy = 0;
      pipes = []; flies = []; popups = [];
      scoreRef.current = 0; flyScoreRef.current = 0;
      dead = false; spawnCount = 0; flapFrame = -99;
      milestoneHit = new Set(); flashLife = 0;
      acc = 0;
      // frame is reset to 0 in reset(); animSec keeps counting for idle
    }

    function flap() {
      const state = stateRef.current;
      if (state === "scores") {
        pendingScoreRef.current = null;
        setNameInputActive(false);
        stateRef.current = "idle"; setDisplayState("idle"); return;
      }
      if (state === "idle") {
        stateRef.current = "playing"; setDisplayState("playing");
        reset(); vy = FLAP; flapFrame = frame;
        startMusic();
        return;
      }
      if (state === "dead") {
        stateRef.current = "idle"; setDisplayState("idle"); return;
      }
      vy = FLAP; flapFrame = frame;
    }

    // touch-action:none is set via CSS; touchstart fires without the browser's
    // pan-detection wait. Skip registering click on touch devices to avoid
    // the synthetic 300ms-delayed click firing a second flap.
    function onTouch(e: TouchEvent) { e.preventDefault(); if (!disabledRef.current) flap(); }
    function onClick() { if (!disabledRef.current) flap(); }
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) {
      canvas.addEventListener("touchstart", onTouch, { passive: false });
    } else {
      canvas.addEventListener("click", onClick);
    }
    function onKey(e: KeyboardEvent) {
      if (disabledRef.current) return;
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
        ctx.fillStyle = "#0a0f2e"; ctx.fillRect(0, 0, W, H);
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
      const bb = botY + CAP;
      ctx.fillStyle = C; ctx.fillRect(x, bb, PIPE_WIDTH, H - bb);
      ctx.fillStyle = D; ctx.fillRect(x + PIPE_WIDTH - 8, bb, 8, H - bb);
    }

    function drawChoopy(cy: number, vel: number) {
      const angle = Math.min(Math.max(vel * 0.055, -0.35), 0.85);
      ctx.save();
      ctx.translate(CHOOPY_X, cy);
      ctx.rotate(angle);
      if (choopyImg.complete && choopyImg.naturalWidth > 0) {
        ctx.shadowColor = "#FFD700"; ctx.shadowBlur = 7;
        for (let i = 0; i < 3; i++)
          ctx.drawImage(choopyImg, -CHOOPY_W / 2, -CHOOPY_H / 2, CHOOPY_W, CHOOPY_H);
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
        ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 4;
        for (let i = 0; i < 3; i++)
          ctx.drawImage(mayflyImg, f.x - FLY_SIZE / 2, f.y + bob - FLY_SIZE / 2, FLY_SIZE, FLY_SIZE);
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
      if (speed > BASE_PIPE_SPEED + 0.05) {
        const lvl = Math.floor((speed - BASE_PIPE_SPEED) / 0.2) + 1;
        ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
        ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 6; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1;
        ctx.fillStyle = "#FFD700";
        ctx.fillText(`⚡ LVL ${lvl}`, 8, 20);
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      }
      ctx.restore();
    }

    function drawFlash() {
      if (flashLife <= 0) return;
      const a = (flashLife / 20) * 0.35;
      ctx.fillStyle = `rgba(255,215,0,${a})`; ctx.fillRect(0, 0, W, H);
      flashLife--;
    }

    function drawScores() {
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

      // Scanlines
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      for (let sy = 0; sy < H; sy += 3) ctx.fillRect(0, sy, W, 1);

      ctx.save();
      ctx.textAlign = "center";

      // Title
      ctx.font = "bold 24px monospace";
      ctx.fillStyle = "#FFD700";
      ctx.shadowColor = "#FFD700"; ctx.shadowBlur = 16;
      ctx.fillText("HIGH SCORES", W / 2, 46);
      ctx.shadowBlur = 0;

      const entries = leaderboardRef.current.slice(0, 5);
      const rowH = 44;
      const startY = 88;
      const rankColors = ["#FFD700", "#C0C0C0", "#cd7f32", "#88aaff", "#ff88aa"];

      if (entries.length === 0) {
        ctx.font = "13px monospace"; ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText("NO SCORES YET", W / 2, H / 2 - 10);
        ctx.fillText("BE THE FIRST!", W / 2, H / 2 + 16);
      } else {
        entries.forEach((e, i) => {
          const rowY = startY + i * rowH;
          const color = rankColors[i];
          const isTop = i === 0;

          // Rank number
          ctx.textAlign = "left";
          ctx.font = `bold ${isTop ? 20 : 16}px monospace`;
          ctx.fillStyle = color;
          ctx.shadowColor = color; ctx.shadowBlur = isTop ? 10 : 4;
          ctx.fillText(`${i + 1}`, 30, rowY);
          ctx.shadowBlur = 0;

          // Name
          ctx.font = `${isTop ? "bold " : ""}${isTop ? 18 : 15}px monospace`;
          ctx.fillStyle = color;
          ctx.fillText(e.name.toUpperCase(), 58, rowY);

          // Score right-aligned
          ctx.textAlign = "right";
          ctx.font = `bold ${isTop ? 20 : 16}px monospace`;
          ctx.fillStyle = color;
          ctx.shadowColor = color; ctx.shadowBlur = isTop ? 10 : 0;
          ctx.fillText(String(e.score).padStart(4, "0"), W - 30, rowY);
          ctx.shadowBlur = 0;

          // Divider
          if (i < entries.length - 1) {
            ctx.strokeStyle = "rgba(255,255,255,0.07)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(24, rowY + 14); ctx.lineTo(W - 24, rowY + 14); ctx.stroke();
          }
        });
      }

      // Player's last score (if just died)
      const lastTotal = pendingScoreRef.current;
      if (lastTotal !== null) {
        ctx.textAlign = "center";
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(`YOUR SCORE: ${lastTotal}`, W / 2, H - 48);
      }

      // Blinking tap prompt
      if (Math.floor(frame / 28) % 2 === 0) {
        ctx.font = "11px monospace"; ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "center";
        ctx.fillText("TAP TO PLAY AGAIN", W / 2, H - 24);
      }

      ctx.restore();
    }

    function drawIdle() {
      drawBackground();

      // Dark gradient veil over skyline
      const veil = ctx.createLinearGradient(0, 0, 0, H);
      veil.addColorStop(0, "rgba(0,0,0,0.55)");
      veil.addColorStop(0.6, "rgba(0,0,0,0.35)");
      veil.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = veil; ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.textAlign = "center";

      // Title at top
      ctx.font = "bold 36px monospace";
      ctx.shadowColor = "#8B0000"; ctx.shadowBlur = 18;
      ctx.fillStyle = "white";
      ctx.fillText("FLAPPY", W / 2, 60);
      ctx.shadowBlur = 0;

      ctx.font = "bold 36px monospace";
      ctx.shadowColor = "#FFD700"; ctx.shadowBlur = 14;
      ctx.fillStyle = "#FFD700";
      ctx.fillText("CHOOPY", W / 2, 98);
      ctx.shadowBlur = 0;

      ctx.restore();

      // Choopy bobbing in the middle
      const bobY = H / 2 + 10 + Math.sin(frame * 0.05) * 8;
      drawChoopy(bobY, Math.sin(frame * 0.05) * 1.5);

      ctx.save();
      ctx.textAlign = "center";

      // Blinking start prompt below Choopy
      if (Math.floor(frame / 28) % 2 === 0) {
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = "white";
        ctx.shadowColor = "white"; ctx.shadowBlur = 6;
        ctx.fillText(IS_MOBILE ? "TAP TO FLY" : "PRESS SPACE TO FLY", W / 2, H - 72);
        ctx.shadowBlur = 0;
      }

      // Tip
      ctx.font = "11px monospace";
      ctx.fillStyle = "rgba(255,215,0,0.75)";
      ctx.fillText("EAT 🪰 MAYFLIES FOR BONUS PTS", W / 2, H - 50);

      // Best score badge
      if (bestRef.current > 0) {
        const bx = W / 2, by = H - 22;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath(); rrect(bx - 60, by - 16, 120, 22, 5); ctx.fill();
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#FFD700";
        ctx.shadowColor = "#FFD700"; ctx.shadowBlur = 6;
        ctx.fillText(`BEST  ${bestRef.current}`, bx, by);
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    function drawDead(ps: number, fs: number) {
      drawBackground();
      pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + p.gap));
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
          if (cy - r < p.gapY || cy + r > p.gapY + p.gap) return true;
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
          f.eaten = true; flyScoreRef.current++;
          popups.push({ x: f.x, y: cy - 10, life: 50, text: `+${BONUS_PER_FLY} 🪰`, color: "rgb(255,215,0)" });
        }
      });
    }

    function checkMilestones(score: number) {
      for (const m of MILESTONES) {
        if (score >= m && !milestoneHit.has(m)) {
          milestoneHit.add(m); flashLife = 20;
          playMilestoneSound();
          popups.push({ x: W / 2, y: H / 2, life: 50, text: `🔥 ${m} PIPES!`, color: "rgb(255,100,50)" });
        }
      }
      const prev = Math.min(BASE_PIPE_SPEED + Math.floor((score - 1) / 3) * 0.2, BASE_PIPE_SPEED * 1.6);
      const next = Math.min(BASE_PIPE_SPEED + Math.floor(score / 3) * 0.2, BASE_PIPE_SPEED * 1.6);
      if (next > prev && next < 2.8)
        popups.push({ x: W / 2, y: H / 3, life: 40, text: "⚡ FASTER!", color: "rgb(255,80,80)" });
    }

    // One fixed simulation step (1/60s of game time).
    function step() {
      frame++;
      const speed = pipeSpeed();
      if (frame % PIPE_INTERVAL === 0) {
        const gap = PIPE_GAP + (Math.random() - 0.5) * 110;
        const margin = IS_MOBILE ? 28 : 32;
        const gapY = margin + Math.random() * (H - GROUND_H - WATER_H - gap - margin * 2);
        pipes.push({ x: W + 10, gapY, gap, scored: false });
        spawnCount++;
        if (spawnCount % 2 === 0) {
          const nearTop = Math.random() < 0.5;
          const flyY = nearTop ? gapY + 24 : gapY + gap - 24;
          flies.push({ x: W + 10 + PIPE_WIDTH / 2, y: flyY, eaten: false, bobOffset: Math.random() * Math.PI * 2 });
        }
      }
      pipes = pipes.map(p => ({ ...p, x: p.x - speed })).filter(p => p.x > -PIPE_WIDTH - 10);
      flies = flies.map(f => ({ ...f, x: f.x - speed })).filter(f => f.x > -FLY_SIZE);
      popups = popups.map(p => ({ ...p, life: p.life - 1 })).filter(p => p.life > 0);
      pipes.forEach(p => {
        if (!p.scored && p.x + PIPE_WIDTH < CHOOPY_X) {
          p.scored = true; scoreRef.current++;
          checkMilestones(scoreRef.current);
        }
      });
      vy += GRAVITY; y += vy;
      checkEat(y);
      if (!dead && checkCollision(y)) {
        dead = true; stateRef.current = "scores"; setDisplayState("scores");
        stopMusic(); playHitSound();
        const total = scoreRef.current + flyScoreRef.current * BONUS_PER_FLY;
        const nb = Math.max(total, bestRef.current);
        bestRef.current = nb; setBest(nb);
        localStorage.setItem("flappy_choopy_best", String(nb));
        if (total >= 3) {
          pendingScoreRef.current = total;
          setSubmitted(false);
          setSubmitName("");
          submitNameRef.current = "";
          setNameInputActive(true);
        }
        fetchLeaderboard();
      }
    }

    function tick(now: number) {
      if (lastTime === 0) lastTime = now;
      let delta = now - lastTime;
      lastTime = now;
      // Clamp after a tab switch / long stall so we don't burst dozens of steps.
      if (delta > 250) delta = 250;

      // animSec advances at real 60-units/second regardless of refresh rate,
      // so idle/score screen animations look the same at 60Hz and 120Hz.
      animSec += (delta / 1000) * 60;

      const state = stateRef.current;

      if (state === "idle") { frame = Math.floor(animSec); drawIdle(); animId = requestAnimationFrame(tick); return; }
      if (state === "scores") { frame = Math.floor(animSec); drawScores(); animId = requestAnimationFrame(tick); return; }

      if (state === "playing") {
        acc += delta;
        while (acc >= STEP_MS) {
          step();
          acc -= STEP_MS;
          if (dead) { acc = 0; break; }
        }
        drawBackground();
        pipes.forEach(p => drawPipe(p.x, p.gapY, p.gapY + p.gap));
        drawFlies(flies); drawChoopy(y, vy);
        drawPopups(popups); drawHUD(scoreRef.current, flyScoreRef.current);
        drawFlash();
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      if (isTouch) canvas.removeEventListener("touchstart", onTouch);
      else canvas.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      stopMusic(); audioCtxRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMusic, stopMusic, playHitSound, playMilestoneSound, fetchLeaderboard]);

  const goToScores = useCallback(() => {
    fetchLeaderboard();
    stateRef.current = "scores";
    setDisplayState("scores");
  }, [fetchLeaderboard]);

  return (
    <div style={{ background: "#0a0a0a", border: "2px solid #FFD700", borderRadius: 6, overflow: "hidden", boxShadow: "0 0 24px rgba(255,215,0,0.15)" }}>
      <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid rgba(255,215,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "#FFD700", textShadow: "0 0 8px rgba(255,215,0,0.5)" }}>
          Flappy Choopy
        </span>
        <div style={{ position: "absolute", right: "0.85rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
<button onClick={toggleMute} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.95rem", lineHeight: 1, padding: 0, color: "#FFD700" }} title={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
        </div>
      </div>

      <canvas ref={canvasRef} width={W} height={H} style={{ display: "block", width: "100%", cursor: "pointer", background: "#000", touchAction: "none" }} />

      {/* Score submission — shown below canvas after death */}
      {displayState === "scores" && nameInputActive && pendingScoreRef.current !== null && !submitted && (
        <div style={{ borderTop: "1px solid #e1e8ed", background: "#000" }}>
          <div style={{ padding: "0.75rem 1rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.72rem", color: "#FFD700", fontWeight: 700, fontFamily: "monospace", whiteSpace: "nowrap" }}>
              SCORE {pendingScoreRef.current} —
            </span>
            <input
              autoFocus
              value={submitName}
              onChange={e => { setSubmitName(e.target.value.slice(0, 20)); submitNameRef.current = e.target.value.slice(0, 20); }}
              placeholder="ENTER NAME"
              maxLength={20}
              style={{ flex: 1, padding: "0.3rem 0.5rem", background: "#111", border: "1px solid #FFD700", borderRadius: 2, fontSize: "0.75rem", color: "#FFD700", fontFamily: "monospace", outline: "none" }}
              onKeyDown={e => {
                if (e.key === "Enter" && submitNameRef.current.trim() && !submitting) {
                  submitScore(submitNameRef.current.trim(), pendingScoreRef.current!);
                }
              }}
            />
            <button
              onClick={() => { if (submitNameRef.current.trim() && !submitting) submitScore(submitNameRef.current.trim(), pendingScoreRef.current!); }}
              disabled={!submitName.trim() || submitting}
              style={{ padding: "0.3rem 0.6rem", background: "#FFD700", color: "#000", border: "none", borderRadius: 2, fontSize: "0.72rem", fontWeight: 700, fontFamily: "monospace", cursor: submitName.trim() && !submitting ? "pointer" : "default", opacity: submitName.trim() && !submitting ? 1 : 0.4 }}
            >{submitting ? "…" : "OK"}</button>
            <button
              onClick={() => { setNameInputActive(false); setSubmitError(null); }}
              style={{ padding: "0.3rem 0.5rem", background: "none", border: "1px solid #444", borderRadius: 2, fontSize: "0.72rem", cursor: "pointer", color: "#888", fontFamily: "monospace" }}
            >SKIP</button>
          </div>
          {submitError && (
            <div style={{ padding: "0 1rem 0.6rem", fontSize: "0.66rem", color: "#ff6b6b", fontFamily: "monospace", fontWeight: 700 }}>
              ⚠ {submitError}
            </div>
          )}
        </div>
      )}
      {displayState === "scores" && submitted && (
        <div style={{ padding: "0.4rem 1rem", borderTop: "1px solid #111", background: "#000", fontSize: "0.72rem", color: "#FFD700", fontWeight: 700, fontFamily: "monospace", display: "flex", gap: "1rem", alignItems: "center" }}>
          ✓ SCORE SAVED
          <button onClick={goToScores} style={{ background: "none", border: "none", cursor: "pointer", color: "#FFD700", fontWeight: 700, fontSize: "0.72rem", fontFamily: "monospace", textDecoration: "underline", padding: 0 }}>VIEW HIGH SCORES</button>
        </div>
      )}
    </div>
  );
}
