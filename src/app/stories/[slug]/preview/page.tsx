import { notFound, redirect } from "next/navigation";
import { isAuthed } from "@/lib/adminAuth";
import { client, urlFor } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const QUERY = `*[_type == "post" && slug.current == $slug][0]{
  _id, "slug": slug.current, section, headline, subheadline, byline,
  date, body, image { asset, caption, alt }, status
}`;

function readingTime(blocks: import("@portabletext/types").PortableTextBlock[]) {
  const words = blocks
    .filter(b => b._type === "block")
    .map(b => (b.children as { text: string }[]).map(c => c.text).join(""))
    .join(" ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const authed = await isAuthed();
  if (!authed) redirect("/admin");

  const { slug } = await params;
  const post = await client.fetch<SanityPost | null>(QUERY, { slug }, { cache: "no-store" });
  if (!post) notFound();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f8fa" }}>
      <style>{`
        @media (max-width: 600px) {
          .story-article { margin: 0.75rem auto 0 !important; width: calc(100% - 1.5rem) !important; padding: 1.25rem 1.25rem 2rem !important; }
        }
      `}</style>

      {/* Draft banner */}
      <div style={{ background: "#1c2938", color: "white", fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", fontWeight: 600, textAlign: "center", padding: "0.5rem 1rem", letterSpacing: "0.06em" }}>
        DRAFT PREVIEW — <Link href={`/admin/posts/${slug}`} style={{ color: "#f0c040", textDecoration: "none" }}>Back to editor</Link>
      </div>

      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", boxShadow: "0 2px 6px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Masthead.png" alt="efemera" style={{ height: "clamp(38px, 4vw, 44px)", width: "auto", display: "block" }} />
        </Link>
      </header>

      <article className="story-article" style={{ maxWidth: 600, margin: "2rem auto 0", width: "100%", boxSizing: "border-box", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem 2rem 2.5rem" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000", marginBottom: "0.5rem" }}>
          {post.section}
        </div>

        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "#1c2938", lineHeight: 1.1, margin: "0 0 0.5rem", letterSpacing: "-0.01em" }}>
          {post.headline || <em style={{ opacity: 0.4 }}>No headline</em>}
        </h1>

        {post.subheadline && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "1.15rem", color: "#526270", lineHeight: 1.35, margin: "0 0 1.2rem", paddingBottom: "1.2rem", borderBottom: "1px solid #e1e8ed" }}>
            {post.subheadline}
          </p>
        )}

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#657786", marginBottom: "1.5rem", fontStyle: "italic" }}>
          By {post.byline} · {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {readingTime(post.body)} min read
        </div>

        {post.image?.asset && (
          <div style={{ marginBottom: "1.8rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlFor(post.image.asset).width(800).height(450).fit("crop").auto("format").url()}
              alt={post.image.alt ?? post.image.caption ?? ""}
              style={{ width: "100%", aspectRatio: "16/9", display: "block", objectFit: "cover" }}
            />
            {post.image.caption && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#657786", fontStyle: "italic", margin: "0.5rem 0 0", lineHeight: 1.5 }}>
                {post.image.caption}
              </p>
            )}
          </div>
        )}

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.05rem", lineHeight: 1.85, color: "#2d2d2d" }}>
          <PortableText
            value={post.body}
            components={{
              block: {
                normal: ({ children }) => <p style={{ margin: "1.2rem 0 0" }}>{children}</p>,
                h2: ({ children }) => <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.35rem", color: "#1c2938", margin: "2rem 0 0", lineHeight: 1.3 }}>{children}</h2>,
                h3: ({ children }) => <h3 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.1rem", color: "#1c2938", margin: "1.6rem 0 0", lineHeight: 1.3 }}>{children}</h3>,
                blockquote: ({ children }) => <blockquote style={{ margin: "1.4rem 0 0", padding: "0.2rem 0 0.2rem 1.1rem", borderLeft: "3px solid #8B0000", fontStyle: "italic", color: "#526270" }}>{children}</blockquote>,
              },
              marks: {
                strong: ({ children }) => <strong>{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
              },
            }}
          />
        </div>
      </article>
    </div>
  );
}
