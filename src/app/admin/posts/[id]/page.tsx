import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { client } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import EditorClient from "../../EditorClient";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthed();
  if (!authed) redirect("/admin");

  const { id } = await params;

  const post = await client.fetch<SanityPost | null>(
    `*[_type == "post" && slug.current == $slug][0]{
      _id, "slug": slug.current, section, headline, subheadline, byline,
      date, body, image { asset, caption, alt }, status, pinned, scheduledAt
    }`,
    { slug: id }
  );

  if (!post) redirect("/admin");

  return <EditorClient post={post} />;
}
