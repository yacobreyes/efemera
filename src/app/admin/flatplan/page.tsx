import AdminClient from "./AdminClient";
import { getCurrentUser } from "@/lib/adminAuth";
import { getAllPostsAdmin, getAllNewslettersAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export default async function AdminFlatplanPage() {
  const me = await getCurrentUser();
  const authed = !!me;
  // Server-render both lists so the dashboard paints fully populated instead of
  // flashing empty while the client fetches. Fetched in parallel to stay fast.
  let posts: Awaited<ReturnType<typeof getAllPostsAdmin>> = [];
  let newsletters: Awaited<ReturnType<typeof getAllNewslettersAdmin>> = [];
  if (authed) {
    try {
      [posts, newsletters] = await Promise.all([getAllPostsAdmin(), getAllNewslettersAdmin()]);
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
