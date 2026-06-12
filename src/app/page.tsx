import HomeClient from "@/components/HomeClient";
import { getAllPosts, getAboutPage } from "@/lib/sanity";

export default async function Home() {
  let posts: import("@/lib/sanity").SanityPost[] = [];
  let aboutParagraphs: string[] = [];
  try {
    posts = await getAllPosts();
  } catch { /* no Sanity project yet */ }
  try {
    const about = await getAboutPage();
    if (about?.body) {
      const texts = about.body
        .filter((b: any) => b._type === "block")
        .map((b: any) => (b.children as { text: string }[]).map(c => c.text).join(""))
        .filter(Boolean) as string[];
      if (texts.length > 0) aboutParagraphs = texts;
    }
  } catch { /* ignore */ }
  return <HomeClient posts={posts} aboutParagraphs={aboutParagraphs} />;
}
