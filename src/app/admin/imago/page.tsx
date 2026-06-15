import AdminClient from "./AdminClient";
import { isAuthed } from "@/lib/adminAuth";
import { getAllPostsAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

export default async function AdminImagoPage() {
  const authed = await isAuthed();
  const posts = authed ? await getAllPostsAdmin().catch(() => []) : [];
  return <AdminClient posts={posts} initialAuth={authed} initialPanel="dashboard" />;
}
