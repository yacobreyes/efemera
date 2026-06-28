import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { createDraft } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const authed = await isAuthed();
  if (!authed) redirect("/admin/imago");
  const { slug } = await createDraft();
  redirect(`/admin/imago/posts/${slug}`);
}
