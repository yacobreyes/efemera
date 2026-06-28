import { getCurrentUser } from "@/lib/adminAuth";
import { fullName } from "@/lib/users";
import { redirect } from "next/navigation";
import { client } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import EditorClient from "../../../EditorClient";

export const dynamic = "force-dynamic";

const QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id, "slug": slug.current, section, headline, subheadline, byline,
  date, body, image { asset, "url": asset->url, caption, alt }, status, scheduledAt, readingTime
}`;

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await getCurrentUser();
  if (!me) redirect("/admin/flatplan");

  // Byline the editor pre-fills onto a brand-new draft: the signed-in user's
  // preferred byline, falling back to their full name.
  const defaultByline = (me.byline?.trim() || fullName(me)) ?? "";

  const { id } = await params;

  // For new drafts, render immediately with empty state — first auto-save creates the doc
  if (id.startsWith("untitled-")) {
    const existing = await client.fetch<SanityPost | null>(QUERY, { slug: id }, { cache: "no-store" });
    const post: SanityPost = existing ?? {
      _id: `post-${id}`,
      slug: id,
      headline: "",
      subheadline: "",
      byline: "",
      section: "",
      date: new Date().toISOString().slice(0, 10),
      body: [],
      status: "draft",
    };
    return <EditorClient post={post} defaultByline={defaultByline} />;
  }

  const post = await client.fetch<SanityPost | null>(QUERY, { slug: id }, { cache: "no-store" });
  if (!post) redirect("/admin/flatplan");

  return <EditorClient post={post} defaultByline={defaultByline} />;
}
