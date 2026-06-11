"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { SanityPost } from "@/lib/sanity";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });
const Feed = dynamic(() => import("@/components/Newspaper"), { ssr: false });

export default function HomeClient({ posts }: { posts: SanityPost[] }) {
  const [entered, setEntered] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("efemera_entered") === "1") setEntered(true);
    setChecked(true);
  }, []);

  if (!checked) return null;

  return (
    <>
      {!entered && <IntroAnimation onEnter={() => { localStorage.setItem("efemera_entered", "1"); setEntered(true); }} />}
      {entered && <Feed posts={posts} />}
    </>
  );
}
