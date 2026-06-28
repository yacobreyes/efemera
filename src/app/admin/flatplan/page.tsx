import AdminClient from "./AdminClient";
import { getCurrentUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminFlatplanPage() {
  const me = await getCurrentUser();
  const authed = !!me;
  // Pass empty initial data — AdminClient fetches posts/newsletters on mount
  // via /api/posts-admin and /api/newsletter, which run in parallel and don't
  // block navigation. Doing the fetch here forced every Go Back / route push
  // to wait for two Sanity round-trips before painting anything.
  return (
    <AdminClient
      posts={[]}
      initialAuth={authed}
      initialPanel="dashboard"
      currentUser={me ? { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email, email: me.email, role: me.role } : null}
    />
  );
}
