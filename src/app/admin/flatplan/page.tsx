import AdminClient from "./AdminClient";
import { getCurrentUser } from "@/lib/adminAuth";
import { getAllNewslettersAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export default async function AdminFlatplanPage() {
  const me = await getCurrentUser();
  const authed = !!me;
  // Posts are fetched client-side on mount (via /api/posts-admin) so navigation
  // is instant. Newsletters are lightweight (no body) so we server-render them
  // to avoid a flash of empty state on the dashboard.
  let newsletters: Awaited<ReturnType<typeof getAllNewslettersAdmin>> = [];
  if (authed) {
    try { newsletters = await getAllNewslettersAdmin(); } catch {}
  }
  return (
    <AdminClient
      posts={[]}
      initialNewsletters={newsletters}
      initialAuth={authed}
      initialPanel="dashboard"
      currentUser={me ? { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email, email: me.email, role: me.role } : null}
    />
  );
}
