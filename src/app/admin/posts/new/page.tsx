import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import EditorClient from "../../EditorClient";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const authed = await isAuthed();
  if (!authed) redirect("/admin");
  return <EditorClient />;
}
