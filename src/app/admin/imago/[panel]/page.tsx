import AdminClient from "../AdminClient";
import { isAuthed } from "@/lib/adminAuth";
import { getAllPostsAdmin } from "@/lib/sanity";

export const dynamic = "force-dynamic";

type Panel = "dashboard" | "media" | "comments" | "welcome" | "about" | "lately";

const VALID_PANELS: Panel[] = ["dashboard", "media", "comments", "welcome", "about", "lately"];

export default async function AdminImagoPanelPage({ params }: { params: Promise<{ panel: string }> }) {
  const { panel } = await params;
  const authed = await isAuthed();
  const posts = authed ? await getAllPostsAdmin().catch(() => []) : [];
  const resolvedPanel: Panel = VALID_PANELS.includes(panel as Panel) ? (panel as Panel) : "dashboard";
  return <AdminClient posts={posts} initialAuth={authed} initialPanel={resolvedPanel} />;
}
