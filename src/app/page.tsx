import HomeClient from "@/components/HomeClient";
import { getAllPosts, getAboutPage, getLately, getWelcome, type SanityLately, type SanityWelcome } from "@/lib/sanity";
import { ptToParagraphs } from "@/lib/parseBody";

export const revalidate = 60;

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Archive";

export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab: Tab = (["Home", "About", "Micro-Memoirs", "Narratives", "Archive"].includes(tab ?? "") ? tab : "Home") as Tab;

  const [postsResult, aboutResult, latelyResult, welcomeResult] = await Promise.allSettled([
    getAllPosts(),
    getAboutPage(),
    getLately(),
    getWelcome(),
  ]);

  const posts = postsResult.status === "fulfilled" ? postsResult.value : [];
  let aboutParagraphs: string[] = [];
  if (aboutResult.status === "fulfilled" && aboutResult.value?.body) {
    const texts = ptToParagraphs(aboutResult.value.body);
    if (texts.length > 0) aboutParagraphs = texts;
  }
  const lately = latelyResult.status === "fulfilled" ? latelyResult.value : null;
  const welcome = welcomeResult.status === "fulfilled" ? welcomeResult.value : null;
  return <HomeClient posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} initialTab={initialTab} />;
}
