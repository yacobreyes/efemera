import AdminClient from "../AdminClient";
import { getCurrentUser } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type Panel = "dashboard" | "media" | "comments" | "about" | "users";
const VALID_PANELS: Panel[] = ["dashboard", "media", "comments", "about", "users"];

export default async function AdminFlatplanPanelPage({ params }: { params: Promise<{ panel: string }> }) {
  const { panel } = await params;
  const me = await getCurrentUser();
  const resolvedPanel: Panel = VALID_PANELS.includes(panel as Panel) ? (panel as Panel) : "dashboard";
  return (
    <AdminClient
      posts={[]}
      initialAuth={!!me}
      initialPanel={resolvedPanel}
      currentUser={me ? { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || me.email, email: me.email, role: me.role } : null}
    />
  );
}
