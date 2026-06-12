import AdminClient from "./AdminClient";
import { isAuthed } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAuthed();
  return <AdminClient posts={[]} initialAuth={authed} />;
}
