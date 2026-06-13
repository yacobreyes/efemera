"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });
const Feed = dynamic(() => import("@/components/Newspaper"), { ssr: false });

export default function HomeClient({ posts, aboutParagraphs, lately, welcome }: { posts: SanityPost[]; aboutParagraphs: string[]; lately: SanityLately | null; welcome: SanityWelcome | null }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem("efemera_entered") === "1";
    setShowAnimation(!visited);
    setReady(true);
  }, []);

  function handleEnter() {
    localStorage.setItem("efemera_entered", "1");
    setFadingOut(true);
    setTimeout(() => {
      setShowAnimation(false);
      setFadingOut(false);
    }, 650);
  }

  if (!ready) return null;

  return (
    <>
      {showAnimation && (
        <div style={{ opacity: fadingOut ? 0 : 1, transition: "opacity 0.65s ease", position: "fixed", inset: 0, zIndex: 100 }}>
          <IntroAnimation onEnter={handleEnter} />
        </div>
      )}
      {!showAnimation && (
        <div style={{ animation: "fadeIn 0.5s ease" }}>
          <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
          <Feed posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} onMastheadClick={() => setShowAnimation(true)} />
        </div>
      )}
    </>
  );
}
