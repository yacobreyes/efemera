import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { client } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import EditorClient from "../../EditorClient";
import { createDraft } from "../../actions";

export const dynamic = "force-dynamic";

const QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id, "slug": slug.current, section, headline, subheadline, byline,
  date, body, image { asset, caption, alt }, status, pinned, scheduledAt
}`;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthed();
  if (!authed) redirect("/admin");

  const { id } = await params;

  let post = await client.fetch<SanityPost | null>(QUERY, { slug: id }, { cache: "no-store" });

  if (!post && id.startsWith("untitled-")) {
    await createDraft(id).catch(() => {});
    post = await client.fetch<SanityPost | null>(QUERY, { slug: id }, { cache: "no-store" });
  }

  if (!post) redirect("/admin");

  return <EditorClient post={post} />;
}
