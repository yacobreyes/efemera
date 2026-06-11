import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PortableText } from "@portabletext/react";
import { getAllSlugs, getPost, urlFor } from "@/lib/sanity";
import CommentSection from "@/components/CommentSection";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import SiteFooter from "@/components/SiteFooter";

function readingTime(blocks: import("@portabletext/types").PortableTextBlock[]) {
  const words = blocks
    .filter(b => b._type === "block")
    .map(b => (b.children as { text: string }[]).map(c => c.text).join(""))
    .join(" ").trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getAllSlugs();
    return slugs.map(slug => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return { title: `${post.headline} — Efemera`, description: post.subheadline };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Masthead.png" alt="efemera" style={{ height: "clamp(28px, 4vw, 44px)", width: "auto", display: "block" }} />
        </Link>
        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {(["Home", "About", "Micro-Memoirs", "Narratives"] as const).map(s => (
            <Link key={s} href={s === "Home" ? "/" : `/?tab=${s}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em" }}>{s}</Link>
          ))}
        </nav>
      </header>

      <article style={{ maxWidth: 600, margin: "2rem auto 0", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem 2rem 2.5rem" }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000", marginBottom: "0.5rem" }}>
          {post.section}
        </div>

        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "#1c2938", lineHeight: 1.1, margin: "0 0 0.5rem", letterSpacing: "-0.01em" }}>
          {post.headline}
        </h1>

        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "1.15rem", color: "#526270", lineHeight: 1.35, margin: "0 0 1.2rem", paddingBottom: "1.2rem", borderBottom: "1px solid #e1e8ed" }}>
          {post.subheadline}
        </p>

        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.75rem", color: "#657786", marginBottom: "1.5rem", fontStyle: "italic" }}>
          By {post.byline} · {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {readingTime(post.body)} min read
        </div>

        {post.image?.asset && (
          <div style={{ margin: "0 -2rem 1.8rem", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlFor(post.image.asset).width(800).auto("format").url()}
              alt={post.image.caption ?? ""}
              style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "cover" }}
            />
            {post.image.caption && (
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#657786", fontStyle: "italic", margin: "0.4rem 2rem 0", lineHeight: 1.4 }}>
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
                normal: ({ children }) => (
                  <p style={{ margin: "1.2rem 0 0" }}>{children}</p>
                ),
              },
            }}
          />
        </div>

        <div style={{ marginTop: "2rem", paddingTop: "1.2rem", borderTop: "1px solid #f0f3f4", display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <LikeButton slug={slug} />
          <ShareButton slug={slug} headline={post.headline} />
        </div>

        <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Flying Mayfly Kicker.png" alt="" style={{ width: "clamp(80px, 20vw, 160px)", height: "auto", opacity: 0.85 }} />
        </div>
      </article>

      <div style={{ width: "100%", maxWidth: 600, margin: "1.5rem auto 0", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "1.5rem 2rem 2rem", boxSizing: "border-box" }}>
        <CommentSection slug={slug} />
      </div>

      <SiteFooter />
    </div>
  );
}
