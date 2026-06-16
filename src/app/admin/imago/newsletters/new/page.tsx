import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { createNewsletterDraft } from "@/app/admin/newsletterActions";

export const dynamic = "force-dynamic";

export default async function NewNewsletterPage() {
  const authed = await isAuthed();
  if (!authed) redirect("/admin/imago");
  const { id } = await createNewsletterDraft();
  redirect(`/admin/imago/newsletters/${id}`);
}
