"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PortableText } from "@portabletext/react";
import type { SanityPost } from "@/lib/sanity";
import SiteFooter from "@/components/SiteFooter";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives";

function timeAgo(index: number) {
  const units = ["2m", "14m", "1h", "3h", "6h", "12h"];
  return units[index] ?? "1d";
}

function portableToPlainText(blocks: SanityPost["body"]): string {
  return blocks
    .filter(b => b._type === "block")
    .map(b => (b.children as { text: string }[]).map(c => c.text).join(""))
    .join(" ");
}

function truncate(text: string, max = 280) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function TweetCard({ post, index }: { post: SanityPost; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 2);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    try {
      const storedLiked = localStorage.getItem(`efemera_liked_${post.slug}`) === "1";
      const storedCount = parseInt(localStorage.getItem(`efemera_likes_${post.slug}`) ?? "0", 10);
      setLiked(storedLiked);
      setLikeCount(storedCount);
      const stored = localStorage.getItem(`efemera_comments_${post.slug}`);
      if (stored) setCommentCount(JSON.parse(stored).length);
    } catch { /* ignore */ }
  }, [post.slug]);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  const plainText = portableToPlainText(post.body);
  const displayText = post.section === "Micro-Memoir" ? plainText : truncate(plainText);

  return (
    <div
      ref={ref}
      style={{
        padding: "1.1rem 1rem",
        background: "white",
        borderBottom: "1px solid #e1e8ed",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.45s ease, transform 0.45s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>
          {post.section}
        </span>
        <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem", color: "#657786" }}>
          {timeAgo(index)}
        </span>
      </div>

      <h2 style={{ fontFamily: "'Bodoni Moda', 'Bodoni MT', 'Didot', serif", fontWeight: 700, fontSize: "1.4rem", color: "#1c2938", lineHeight: 1.2, margin: "0 0 0.25rem", letterSpacing: "-0.01em" }}>
        {post.headline}
      </h2>

      <p style={{ fontFamily: "'Bodoni Moda', 'Bodoni MT', 'Didot', serif", fontWeight: 400, fontSize: "1rem", color: "#526270", lineHeight: 1.35, margin: "0 0 0.75rem" }}>
        {post.subheadline}
      </p>

      <p style={{ fontFamily: "'Barlow Condensed', 'Helvetica Neue', Arial, sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "#3d3d3d", margin: "0 0 0.75rem" }}>
        {displayText}
      </p>

      {post.section === "Narratives" && (
        <Link href={`/stories/${post.slug}`} style={{ display: "inline-block", fontFamily: "Arial, sans-serif", fontSize: "0.8rem", fontWeight: 700, color: "#8B0000", textDecoration: "none", marginBottom: "0.75rem" }}>
          Read more
        </Link>
      )}

      <div style={{ fontFamily: "Arial, sans-serif", fontSize: "0.72rem", color: "#657786", marginBottom: "0.6rem", fontStyle: "italic" }}>
        {post.byline} · {new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
      </div>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px solid #f0f3f4" }}>
        <Link href={`/stories/${post.slug}#comments`} style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: commentCount > 0 ? "#8B0000" : "#657786", textDecoration: "none" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem" }}>{commentCount}</span>
        </Link>
        <button onClick={() => {
          const newLiked = !liked;
          const newCount = newLiked ? likeCount + 1 : likeCount - 1;
          setLiked(newLiked);
          setLikeCount(newCount);
          try {
            localStorage.setItem(`efemera_liked_${post.slug}`, newLiked ? "1" : "0");
            localStorage.setItem(`efemera_likes_${post.slug}`, String(newCount));
          } catch { /* ignore */ }
        }}
          style={{ display: "flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", cursor: "pointer", padding: 0, color: liked ? "#e0245e" : "#657786" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem" }}>{likeCount}</span>
        </button>
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem" }}>
      <h1 style={{ fontFamily: "'Bodoni Moda', serif", fontWeight: 700, fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#1c2938", margin: "0 0 1rem" }}>About Efemera</h1>
      <p style={{ fontFamily: "'Barlow Condensed', 'Helvetica Neue', Arial, sans-serif", fontSize: "1.05rem", lineHeight: 1.85, color: "#2d2d2d", margin: "0 0 1rem" }}>
        Efemera is a literary publication devoted to the brief and the overlooked — the moments that pass without fanfare and stay with you anyway.
      </p>
      <p style={{ fontFamily: "'Barlow Condensed', 'Helvetica Neue', Arial, sans-serif", fontSize: "1.05rem", lineHeight: 1.85, color: "#2d2d2d", margin: "0 0 1rem" }}>
        We publish two kinds of work: <strong>Micro-Memoirs</strong>, short personal meditations, and <strong>Narratives</strong>, longer essays that take their time.
      </p>
      <p style={{ fontFamily: "'Barlow Condensed', 'Helvetica Neue', Arial, sans-serif", fontSize: "1.05rem", lineHeight: 1.85, color: "#2d2d2d" }}>
        The name comes from the Latin <em>ephemera</em> — things that exist for only a day. We think that&apos;s most things, and that most things deserve to be written down.
      </p>
    </div>
  );
}

export default function Feed({ posts, onMastheadClick }: { posts: SanityPost[]; onMastheadClick?: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("Home");

  const visiblePosts = activeTab === "Home"
    ? posts
    : activeTab === "Micro-Memoirs"
    ? posts.filter(p => p.section === "Micro-Memoir")
    : activeTab === "Narratives"
    ? posts.filter(p => p.section === "Narratives")
    : [];

  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Masthead.png" alt="efemera" onClick={onMastheadClick} style={{ height: "clamp(28px, 4vw, 44px)", width: "auto", display: "block", cursor: onMastheadClick ? "pointer" : "default" }} />
        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {(["Home", "About", "Micro-Memoirs", "Narratives"] as Tab[]).map(s => (
            <button key={s} onClick={() => setActiveTab(s)} style={{ fontFamily: "'Bodoni Moda', serif", fontSize: "0.85rem", fontWeight: 700, color: "white", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.05em", opacity: activeTab === s ? 1 : 0.7, borderBottom: activeTab === s ? "1px solid white" : "none" }}>{s}</button>
          ))}
        </nav>
      </header>

      {activeTab === "About" ? (
        <AboutPage />
      ) : visiblePosts.length === 0 ? (
        <div style={{ maxWidth: 600, margin: "3rem auto", textAlign: "center", fontFamily: "'Bodoni Moda', serif", color: "#657786", fontSize: "1rem" }}>
          No posts yet.
        </div>
      ) : (
        <div style={{ maxWidth: 600, margin: "1rem auto", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
          {visiblePosts.map((post, i) => (
            <TweetCard key={post._id} post={post} index={i} />
          ))}
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
