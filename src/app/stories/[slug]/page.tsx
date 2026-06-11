import { posts } from "@/lib/posts";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export function generateStaticParams() {
  return posts.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find(p => p.slug === slug);
  if (!post) return {};
  return { title: `${post.headline} — Efemera`, description: post.subheadline };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = posts.find(p => p.slug === slug);
  if (!post) notFound();

  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#8B0000",
        padding: "0.5rem 1.2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/wordmark.png" alt="efemera" style={{ height: 40, width: "auto", display: "block" }} />
        </Link>
        <Link href="/" style={{
          fontFamily: "Arial, sans-serif", fontSize: "0.75rem",
          fontWeight: 700, color: "rgba(255,255,255,0.85)", textDecoration: "none",
        }}>
          ← Back
        </Link>
      </header>

      {/* Story */}
      <article style={{
        maxWidth: 600, margin: "2rem auto",
        background: "white", border: "1px solid #e1e8ed",
        borderRadius: 4, padding: "2rem 2rem 2.5rem",
      }}>
        {/* Kicker */}
        <div style={{
          fontFamily: "Arial, sans-serif", fontWeight: 700,
          fontSize: "0.68rem", letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#8B0000",
          marginBottom: "0.5rem",
        }}>
          {post.kicker}
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontWeight: 900, fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
          color: "#1c2938", lineHeight: 1.2,
          margin: "0 0 0.5rem",
        }}>
          {post.headline}
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic", fontSize: "1.05rem",
          color: "#526270", lineHeight: 1.45,
          margin: "0 0 1.2rem",
          paddingBottom: "1.2rem",
          borderBottom: "1px solid #e1e8ed",
        }}>
          {post.subheadline}
        </p>

        {/* Byline */}
        <div style={{
          fontFamily: "Arial, sans-serif", fontSize: "0.75rem",
          color: "#657786", marginBottom: "1.5rem", fontStyle: "italic",
        }}>
          By {post.byline} · {post.date}
        </div>

        {/* Body */}
        <div style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", lineHeight: 1.8, color: "#2d2d2d" }}>
          {post.body.map((p, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "1.2rem 0 0" }}>{p}</p>
          ))}
        </div>
      </article>
    </div>
  );
}
