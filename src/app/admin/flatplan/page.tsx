import AdminClient from "./AdminClient";
import { getCurrentUser } from "@/lib/adminAuth";
import { getAllPostsAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export default async function AdminFlatplanPage() {
  const me = await getCurrentUser();
  const authed = !!me;
  // Server-render the post list so it shows immediately on load/refresh
  // instead of flashing empty while the client fetches.
  let posts: Awaited<ReturnType<typeof getAllPostsAdmin>> = [];
  if (authed) {
    try { posts = await getAllPostsAdmin(); } catch {}
  }
  return (
    <AdminClient
      posts={posts}
      initialAuth={authed}
      initialPanel="dashboard"
      currentUser={me ? { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email, email: me.email, role: me.role } : null}
    />
  );
}
