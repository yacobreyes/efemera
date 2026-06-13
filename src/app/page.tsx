import HomeClient from "@/components/HomeClient";
import { getAllPosts, getAboutPage, getLately, getWelcome, type SanityLately, type SanityWelcome } from "@/lib/sanity";

export const revalidate = 60;

export default async function Home() {
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
  return <HomeClient posts={posts} aboutParagraphs={aboutParagraphs} lately={lately} welcome={welcome} />;
}
