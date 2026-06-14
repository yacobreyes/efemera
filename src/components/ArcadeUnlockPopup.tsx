"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// Incremented in story pages when user visits one
export function recordStoryVisit() {
  try {
    const n = parseInt(sessionStorage.getItem("efemera_stories_visited") ?? "0", 10);
    sessionStorage.setItem("efemera_stories_visited", String(n + 1));
  } catch {}
}

export default function ArcadeUnlockPopup() {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      // already been shown this session
      if (sessionStorage.getItem("arcade_popup_shown") === "1") return;
      const visited = parseInt(sessionStorage.getItem("efemera_stories_visited") ?? "0", 10);
      if (visited >= 2) {
        timerRef.current = setTimeout(() => setShow(true), 600);
      }
    } catch {}
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    if (!show) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  function dismiss() {
    try {
      sessionStorage.setItem("arcade_popup_shown", "1");
      window.dispatchEvent(new Event("arcade-unlocked"));
    } catch {}
    setShow(false);
  }

  function goToArcade() {
    dismiss();
    router.push("/arcade");
  }

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.3s ease",
      }}
      onClick={dismiss}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }`}</style>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0a0a0a",
          border: "2px solid #FFD700",
          borderRadius: 8,
          padding: "2rem 1.75rem",
          maxWidth: 340,
          width: "100%",
          textAlign: "center",
          boxShadow: "0 0 40px rgba(255,215,0,0.2), 0 20px 60px rgba(0,0,0,0.8)",
          animation: "slideUp 0.4s ease",
        }}
      >
        <Image
          src="/choopy-arcade-cabinet.png"
          alt="Choopy's Arcade"
          width={160}
          height={200}
          style={{ margin: "0 auto 1rem", display: "block", filter: "drop-shadow(0 0 12px rgba(255,215,0,0.4))" }}
        />

        <p style={{ fontFamily: "monospace", fontSize: "0.65rem", letterSpacing: "0.18em", color: "#FFD700", textTransform: "uppercase", margin: "0 0 0.5rem" }}>
          Achievement Unlocked
        </p>

        <h2 style={{ fontFamily: "monospace", fontSize: "1.15rem", fontWeight: 700, color: "white", margin: "0 0 0.75rem", lineHeight: 1.3 }}>
          You&apos;ve read 2 articles!<br />
          <span style={{ color: "#FFD700" }}>Choopy&apos;s Arcade</span> is now open.
        </h2>

        <p style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", margin: "0 0 1.5rem", lineHeight: 1.6 }}>
          Help Choopy fly through Tampa and dodge the pipes.
        </p>

        <button
          onClick={goToArcade}
          style={{
            width: "100%",
            padding: "0.7rem",
            background: "#FFD700",
            color: "#000",
            border: "none",
            borderRadius: 4,
            fontFamily: "monospace",
            fontWeight: 700,
            fontSize: "0.85rem",
            letterSpacing: "0.1em",
            cursor: "pointer",
            marginBottom: "0.6rem",
          }}
        >
          INSERT COIN →
        </button>

        <button
          onClick={dismiss}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.35)", fontFamily: "monospace",
            fontSize: "0.68rem", letterSpacing: "0.1em",
          }}
        >
          MAYBE LATER
        </button>
      </div>
    </div>
  );
}
