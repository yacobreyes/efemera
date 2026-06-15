"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Feed from "@/components/Newspaper";
import ArcadeUnlockPopup from "@/components/ArcadeUnlockPopup";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";
import { useRouter } from "next/navigation";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Archive";

export default function HomeClient({ posts, aboutParagraphs, lately, welcome, initialTab }: { posts: SanityPost[]; aboutParagraphs: string[]; lately: SanityLately | null; welcome: SanityWelcome | null; initialTab: Tab }) {
  const [mounted, setMounted] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [arcadeUnlocked, setArcadeUnlocked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setShowAnimation(true);
    setMounted(true);
  }, []);

  useEffect(() => {
    function check() {
      try { setArcadeUnlocked(sessionStorage.getItem("arcade_popup_shown") === "1"); } catch {}
    }
    check();
    window.addEventListener("arcade-unlocked", check);
    return () => window.removeEventListener("arcade-unlocked", check);
  }, []);

  function handleEnter() {
    if (enterTimer.current) return; // prevent double-firing
    document.cookie = "efemera_entered=1; max-age=31536000; path=/; SameSite=Lax";
    setFadingOut(true);
    enterTimer.current = setTimeout(() => {
      setShowAnimation(false);
      setFadingOut(false);
      enterTimer.current = null;
    }, 650);
  }

  return (
    <>
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        <Feed posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} initialTab={initialTab} onMastheadClick={() => setShowAnimation(true)} />
      </div>
      <ArcadeUnlockPopup />

      {/* Persistent arcade button — only after popup has been seen and dismissed */}
      {arcadeUnlocked && <button
        onClick={() => router.push("/arcade")}
        title="Choopy's Arcade"
        style={{
          position: "fixed", bottom: "1.25rem", right: "1.25rem",
          zIndex: 9000,
          background: "#0a0a0a",
          border: "2px solid #FFD700",
          borderRadius: "50%",
          width: 44, height: 44,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 0 12px rgba(255,215,0,0.25)",
          padding: 0,
        }}
        aria-label="Open Choopy's Arcade"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mayfly-icon.webp" alt="" width={24} height={24} style={{ display: "block", imageRendering: "pixelated" }} />
      </button>}

      {showAnimation && (
        <div style={{ opacity: fadingOut ? 0 : 1, transition: "opacity 0.65s ease", position: "fixed", inset: 0, zIndex: 100 }}>
          <IntroAnimation onEnter={handleEnter} />
        </div>
      )}
    </>
  );
}
