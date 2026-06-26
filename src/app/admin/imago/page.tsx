import AdminClient from "./AdminClient";
import { isAuthed } from "@/lib/adminAuth";
import { getAllPostsAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export default async function AdminImagoPage() {
  const authed = await isAuthed();
  // Server-render the post list so it shows immediately on load/refresh
  // instead of flashing empty while the client fetches.
  let posts: Awaited<ReturnType<typeof getAllPostsAdmin>> = [];
  if (authed) {
    try { posts = await getAllPostsAdmin(); } catch {}
  }
  return <AdminClient posts={posts} initialAuth={authed} initialPanel="dashboard" />;
}
