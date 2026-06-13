import { isAuthed } from "@/lib/adminAuth";
import { redirect } from "next/navigation";
import { client } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import EditorClient from "../../EditorClient";

export const dynamic = "force-dynamic";

const QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id, "slug": slug.current, section, headline, subheadline, byline,
  date, body, image { asset, "url": asset->url, caption, alt }, status, scheduledAt
}`;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const authed = await isAuthed();
  if (!authed) redirect("/admin");

  const { id } = await params;

  // For new drafts, render immediately with empty state — first auto-save creates the doc
  if (id.startsWith("untitled-")) {
    const existing = await client.fetch<SanityPost | null>(QUERY, { slug: id }, { cache: "no-store" });
    const post: SanityPost = existing ?? {
      _id: `post-${id}`,
      slug: id,
      headline: "",
      subheadline: "",
      byline: "Yacob Reyes",
      section: "Narratives",
      date: new Date().toISOString().slice(0, 10),
      body: [],
      status: "draft",
    };
    return <EditorClient post={post} />;
  }

  const post = await client.fetch<SanityPost | null>(QUERY, { slug: id }, { cache: "no-store" });
  if (!post) redirect("/admin");

  return <EditorClient post={post} />;
}
