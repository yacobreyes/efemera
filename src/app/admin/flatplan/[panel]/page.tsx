import AdminClient from "../AdminClient";
import { isAuthed } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type Panel = "dashboard" | "media" | "comments" | "about";
const VALID_PANELS: Panel[] = ["dashboard", "media", "comments", "about"];

export default async function AdminImagoPanelPage({ params }: { params: Promise<{ panel: string }> }) {
  const { panel } = await params;
  const authed = await isAuthed();
  const resolvedPanel: Panel = VALID_PANELS.includes(panel as Panel) ? (panel as Panel) : "dashboard";
  return <AdminClient posts={[]} initialAuth={authed} initialPanel={resolvedPanel} />;
}
