"use client";

import Feed from "@/components/Newspaper";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Essays" | "Archive";

export default function HomeClient({ posts, aboutParagraphs, lately, welcome, initialTab, searchQuery }: { posts: SanityPost[]; aboutParagraphs: string[]; lately: SanityLately | null; welcome: SanityWelcome | null; initialTab: Tab; searchQuery?: string }) {
  return (
    <Feed posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} initialTab={initialTab} searchQuery={searchQuery} />
  );
}
