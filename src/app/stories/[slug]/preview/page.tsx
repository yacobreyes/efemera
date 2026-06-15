import { notFound, redirect } from "next/navigation";
import { isAuthed } from "@/lib/adminAuth";
import { client, urlFor } from "@/lib/sanity";
import type { SanityPost } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import Link from "next/link";
import CommentSection from "@/components/CommentSection";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import ReadCounter from "@/components/ReadCounter";
import SiteFooter from "@/components/SiteFooter";

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
        .story-header { display: flex; align-items: center; justify-content: space-between; }
        .story-nav { display: flex; gap: 2rem; align-items: center; }
        @media (max-width: 600px) {
          body { overflow-x: hidden; }
          .story-header { flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 0.75rem; padding: 0.75rem 1rem !important; }
          .story-nav { gap: 1rem; flex-wrap: wrap; justify-content: center; }
          .story-nav a { font-size: 0.78rem !important; }
          .story-article { margin: 0.75rem auto 0 !important; width: calc(100% - 1.5rem) !important; padding: 1.25rem 1.25rem 2rem !important; }
          .story-comments { margin: 1rem auto 0 !important; width: calc(100% - 1.5rem) !important; padding: 1.25rem !important; }
        }
      `}</style>

      <header className="story-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Masthead.webp" alt="efemera" fetchPriority="high" width={2688} height={512} style={{ height: "clamp(38px, 4vw, 44px)", width: "auto", display: "block" }} />
        </Link>
        <nav className="story-nav">
          {(["Home", "About", "Micro-Memoirs", "Narratives"] as const).map(s => (
            <Link key={s} href={s === "Home" ? "/" : `/?tab=${s}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em" }}>{s}</Link>
          ))}
          <Link href="/archive" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em" }}>Archive</Link>
        </nav>
      </header>

      <article className="story-article" style={{ maxWidth: 600, margin: "2rem auto 0", width: "100%", boxSizing: "border-box", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem 2rem 2.5rem" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000", marginBottom: "0.5rem" }}>
          {post.section}
        </div>

        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "#1c2938", lineHeight: 1.1, margin: "0 0 0.5rem", letterSpacing: "-0.01em" }}>
          {post.headline}
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
              list: {
                bullet: ({ children }) => <ul style={{ paddingLeft: "1.4em", margin: "1.2rem 0 0" }}>{children}</ul>,
                number: ({ children }) => <ol style={{ paddingLeft: "1.4em", margin: "1.2rem 0 0" }}>{children}</ol>,
              },
              listItem: {
                bullet: ({ children }) => <li style={{ marginBottom: "0.25em" }}>{children}</li>,
                number: ({ children }) => <li style={{ marginBottom: "0.25em" }}>{children}</li>,
              },
              marks: {
                strong: ({ children }) => <strong>{children}</strong>,
                em: ({ children }) => <em>{children}</em>,
              },
            }}
          />
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1.2rem", borderTop: "1px solid #f0f3f4", display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <LikeButton slug={slug} />
          <ShareButton slug={slug} headline={post.headline} />
          <div style={{ marginLeft: "auto" }}>
            <ReadCounter slug={slug} />
          </div>
        </div>

        <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Flying Mayfly Kicker.webp" alt="" width={2000} height={2000} style={{ width: "clamp(120px, 30vw, 160px)", height: "auto" }} />
        </div>
      </article>

      <div className="story-comments" style={{ width: "100%", maxWidth: 600, margin: "1.5rem auto 0", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "1.5rem 2rem 2rem", boxSizing: "border-box" }}>
        <CommentSection slug={slug} />
      </div>

      <SiteFooter />
    </div>
  );
}
