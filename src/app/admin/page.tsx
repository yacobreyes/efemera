import { getAllPosts } from "@/lib/sanity";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let posts: import("@/lib/sanity").SanityPost[] = [];
  try { posts = await getAllPosts(); } catch { /* not connected yet */ }
  return <AdminClient posts={posts} />;
}
