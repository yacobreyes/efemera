import HomeClient from "@/components/HomeClient";
import { getAllPosts, getAboutPage, getLately, getWelcome, type SanityLately, type SanityWelcome } from "@/lib/sanity";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Archive";

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab: Tab = (["Home", "About", "Micro-Memoirs", "Narratives", "Archive"].includes(tab ?? "") ? tab : "Home") as Tab;

  const cookieStore = await cookies();
  const firstVisit = cookieStore.get("efemera_entered")?.value !== "1";

  let posts: import("@/lib/sanity").SanityPost[] = [];
  let aboutParagraphs: string[] = [];
  let welcome: SanityWelcome | null = null;
  try { posts = await getAllPosts(); } catch {}
  try {
    const about = await getAboutPage();
    if (about?.body) {
      const texts = about.body
        .filter((b: any) => b._type === "block")
        .map((b: any) => (b.children as { text: string }[]).map(c => c.text).join(""))
        .filter(Boolean) as string[];
      if (texts.length > 0) aboutParagraphs = texts;
    }
  } catch {}
  let lately: SanityLately | null = null;
  try { lately = await getLately(); } catch {}
  try { welcome = await getWelcome(); } catch {}
  return <HomeClient posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} firstVisit={firstVisit} initialTab={initialTab} />;
}
