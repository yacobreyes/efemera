"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { SanityPost, SanityLately } from "@/lib/sanity";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });
const Feed = dynamic(() => import("@/components/Newspaper"), { ssr: false });

export default function HomeClient({ posts, aboutParagraphs, lately }: { posts: SanityPost[]; aboutParagraphs: string[]; lately: SanityLately | null }) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem("efemera_entered") === "1";
    setShowAnimation(!visited);
    setReady(true);
  }, []);

  function handleEnter() {
    localStorage.setItem("efemera_entered", "1");
    setShowAnimation(false);
  }

  if (!ready) return null;

  return (
    <>
      {showAnimation && <IntroAnimation onEnter={handleEnter} />}
      {!showAnimation && <Feed posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} onMastheadClick={() => setShowAnimation(true)} />}
    </>
  );
}
