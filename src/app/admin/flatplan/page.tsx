import AdminClient from "./AdminClient";
import { getCurrentUser } from "@/lib/adminAuth";
import { getAllNewslettersAdmin, getAllPostsAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export default async function AdminFlatplanPage() {
  const me = await getCurrentUser();
  const authed = !!me;
  // Server-render both lists so the dashboard paints fully populated. We pass
  // withSearch=false to keep the payload light (no body text), which keeps the
  // server render fast — the client refetches the searchable version after mount.
  let posts: Awaited<ReturnType<typeof getAllPostsAdmin>> = [];
  let newsletters: Awaited<ReturnType<typeof getAllNewslettersAdmin>> = [];
  if (authed) {
    try {
      [posts, newsletters] = await Promise.all([getAllPostsAdmin(false), getAllNewslettersAdmin()]);
    } catch {}
  }
  return (
    <AdminClient
      posts={posts}
      initialNewsletters={newsletters}
      initialAuth={authed}
      initialPanel="dashboard"
      currentUser={me ? { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email, email: me.email, role: me.role } : null}
    />
  );
}
