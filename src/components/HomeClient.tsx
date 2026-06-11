"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { SanityPost } from "@/lib/sanity";

const IntroAnimation = dynamic(() => import("@/components/IntroAnimation"), { ssr: false });
const Feed = dynamic(() => import("@/components/Newspaper"), { ssr: false });

export default function HomeClient({ posts }: { posts: SanityPost[] }) {
  const [entered, setEntered] = useState(false);

  return (
    <>
      {!entered && <IntroAnimation onEnter={() => setEntered(true)} />}
      {entered && <Feed posts={posts} />}
    </>
  );
}
