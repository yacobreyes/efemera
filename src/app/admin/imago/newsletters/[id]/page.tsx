import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { client } from "@/lib/sanity";
import NewsletterEditorClient, { type InitialNewsletter } from "../../../NewsletterEditorClient";
import type { NlVersion } from "../../../newsletterActions";

export const dynamic = "force-dynamic";

const NL_FIELDS = `subject, preview, author, cards, status, scheduledAt`;

export default async function EditNewsletterPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthed();
  if (!authed) redirect("/admin/imago");

  const { id } = await params;

  // Both queries only need the id, so run them concurrently instead of
  // waiting on the draft fetch before starting the versions fetch.
  const [draft, rawVersions] = await Promise.all([
    client.fetch(`*[_id == $id][0]{ ${NL_FIELDS} }`, { id }, { cache: "no-store" }),
    client.fetch(
      `*[_type == "newsletterVersion" && newsletterId == $id] | order(createdAt desc)[0...20]{ "id": _id, createdAt, subject, preview, author, wordCount, cards }`,
      { id },
      { cache: "no-store" }
    ),
  ]);

  const initial: InitialNewsletter = draft
    ? {
        subject: draft.subject ?? "",
        preview: draft.preview ?? "",
        author: draft.author ?? "Yacob Reyes",
        status: draft.status ?? "draft",
        scheduledAt: draft.scheduledAt ? String(draft.scheduledAt).slice(0, 16) : "",
        cards: Array.isArray(draft.cards) ? draft.cards : [],
      }
    : null;

  const versions: NlVersion[] = rawVersions ?? [];

  return <NewsletterEditorClient newsletterId={id} initial={initial} initialVersions={versions} />;
}
