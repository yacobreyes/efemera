import HomeClient from "@/components/HomeClient";
import { getAllPosts } from "@/lib/sanity";

export default async function Home() {
  let posts: import("@/lib/sanity").SanityPost[] = [];
  try {
    posts = await getAllPosts();
  } catch { /* no Sanity project yet */ }
  return <HomeClient posts={posts} />;
}
