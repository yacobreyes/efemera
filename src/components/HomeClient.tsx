"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Feed from "@/components/Newspaper";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Archive";

export default function HomeClient({ posts, aboutParagraphs, lately, welcome, firstVisit, initialTab }: { posts: SanityPost[]; aboutParagraphs: string[]; lately: SanityLately | null; welcome: SanityWelcome | null; firstVisit: boolean; initialTab: Tab }) {
  const [showAnimation, setShowAnimation] = useState(firstVisit);
  const [fadingOut, setFadingOut] = useState(false);

  function handleEnter() {
    document.cookie = "efemera_entered=1; max-age=31536000; path=/; SameSite=Lax";
    setFadingOut(true);
    setTimeout(() => {
      setShowAnimation(false);
      setFadingOut(false);
    }, 650);
  }

  return (
    <>
      <Feed posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} initialTab={initialTab} onMastheadClick={() => setShowAnimation(true)} />
      {showAnimation && (
        <div style={{ opacity: fadingOut ? 0 : 1, transition: "opacity 0.65s ease", position: "fixed", inset: 0, zIndex: 100 }}>
          <IntroAnimation onEnter={handleEnter} />
        </div>
      )}
    </>
  );
}
