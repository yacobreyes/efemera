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
      {/* Masthead banner */}
      <div style={{ background: "#8B0000", padding: "1.5rem 1.2rem", display: "flex", justifyContent: "center",  }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Masthead.png" alt="efemera" style={{ width: "clamp(220px, 45vw, 480px)", height: "auto", display: "block" }} />
        </Link>
      </div>

      {/* Sticky nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.45rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "2rem", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        {["Home", "About", "Micro-Memoirs", "Narratives"].map(s => (
          s === "Home"
            ? <Link key={s} href="/" style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em" }}>{s}</Link>
            : <a key={s} href="#" style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em" }}>{s}</a>
        ))}
      </header>

      {/* Article */}
      <article style={{ maxWidth: 600, margin: "2rem auto", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem 2rem 2.5rem" }}>
        <div style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000", marginBottom: "0.5rem" }}>
          {post.kicker}
        </div>

        <h1 style={{ fontFamily: "'Bodoni Moda', 'Bodoni MT', 'Didot', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 5vw, 2.6rem)", color: "#1c2938", lineHeight: 1.1, margin: "0 0 0.5rem", letterSpacing: "-0.01em" }}>
          {post.headline}
        </h1>

        <p style={{ fontFamily: "'Bodoni Moda', 'Bodoni MT', 'Didot', serif", fontWeight: 400, fontSize: "1.15rem", color: "#526270", lineHeight: 1.35, margin: "0 0 1.2rem", paddingBottom: "1.2rem", borderBottom: "1px solid #e1e8ed" }}>
          {post.subheadline}
        </p>

        <div style={{ fontFamily: "Arial, sans-serif", fontSize: "0.75rem", color: "#657786", marginBottom: "1.5rem", fontStyle: "italic" }}>
          By {post.byline} · {post.date}
        </div>

        <div style={{ fontFamily: "'Barlow Condensed', 'Helvetica Neue', Arial, sans-serif", fontSize: "1.05rem", lineHeight: 1.85, color: "#2d2d2d" }}>
          {post.body.map((p, i) => (
            <p key={i} style={{ margin: i === 0 ? 0 : "1.2rem 0 0" }}>{p}</p>
          ))}
        </div>

        {/* Kicker image at end of article */}
        <div style={{ marginTop: "2.5rem", display: "flex", justifyContent: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Flying Mayfly Kicker.png"
            alt=""
            style={{ width: "clamp(80px, 20vw, 160px)", height: "auto", opacity: 0.85 }}
          />
        </div>
      </article>
    </div>
  );
}
