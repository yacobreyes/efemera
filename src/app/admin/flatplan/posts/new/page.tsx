import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { createDraft } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const authed = await isAuthed();
  if (!authed) redirect("/admin/flatplan");
  const { slug } = await createDraft();
  redirect(`/admin/flatplan/posts/${slug}`);
}
