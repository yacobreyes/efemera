"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import { PortableText } from "@portabletext/react";
import type { SanityPost } from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";
import SiteFooter from "@/components/SiteFooter";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives";

function formatDate(dateStr: string) {
  const d = dateStr.length === 10 ? new Date(`${dateStr}T12:00:00`) : new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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

function readingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}


function TweetCard({ post, index }: { post: SanityPost; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 2);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    try {
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
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.8rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000" }}>
          {post.section}
        </span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem", color: "#657786" }}>
          {formatDate(post.date)}
        </span>
      </div>

      <h2 style={{ margin: "0 0 0.25rem" }}>
        <Link href={`/stories/${post.slug}`} className="card-headline" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.4rem", color: "#1c2938", lineHeight: 1.2, letterSpacing: "-0.01em", textDecoration: "none" }}>
          {post.headline}
        </Link>
      </h2>

      {post.subheadline && (
        <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: "1rem", color: "#526270", lineHeight: 1.35, margin: "0 0 0.75rem" }}>
          {post.subheadline}
        </p>
      )}

      {post.image?.asset && (
        <Link href={`/stories/${post.slug}`} style={{ display: "block", marginBottom: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlFor(post.image.asset).width(600).height(338).fit("crop").auto("format").url()}
            alt={post.image.caption ?? ""}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", borderRadius: 4 }}
          />
        </Link>
      )}

      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "#3d3d3d", margin: "0 0 0.75rem" }}>
        {displayText}
      </p>


      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.72rem", color: "#657786", marginBottom: "0.6rem", fontStyle: "italic" }}>
        {post.byline} · {readingTime(plainText)} min read
      </div>

      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px solid #f0f3f4" }}>
        <Link href={`/stories/${post.slug}#comments`} style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: commentCount > 0 ? "#8B0000" : "#657786", textDecoration: "none" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.8rem" }}>{commentCount}</span>
        </Link>
        <LikeButton slug={post.slug} />
        <ShareButton slug={post.slug} headline={post.headline} />
      </div>
    </div>
  );
}

function AboutPage() {
  const [paragraphs, setParagraphs] = useState<string[] | null>(null);
  useEffect(() => {
    fetch("/api/about").then(r => r.json()).then(data => {
      if (data?.body) {
        const texts = data.body
          .filter((b: any) => b._type === "block")
          .map((b: any) => b.children.map((c: any) => c.text).join(""))
          .filter(Boolean);
        setParagraphs(texts);
      } else {
        setParagraphs([]);
      }
    }).catch(() => setParagraphs([]));
  }, []);

  const content = paragraphs;

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem" }}>
      <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "clamp(1.6rem, 4vw, 2.2rem)", color: "#1c2938", margin: "0 0 1.2rem" }}>About Efemera</h1>
      {content !== null && content.map((p, i) => (
            <p key={i} style={{ fontFamily: "'Inter', sans-serif", fontSize: "1.05rem", lineHeight: 1.85, color: "#2d2d2d", margin: i < content.length - 1 ? "0 0 1rem" : "0" }}>{p}</p>
          ))
      }
    </div>
  );
}

export default function Feed({ posts, onMastheadClick }: { posts: SanityPost[]; onMastheadClick?: () => void }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) ?? "Home";
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");

  const tabFiltered = activeTab === "Home"
    ? posts
    : activeTab === "Micro-Memoirs"
    ? posts.filter(p => p.section === "Micro-Memoir")
    : activeTab === "Narratives"
    ? posts.filter(p => p.section === "Narratives")
    : [];

  const visiblePosts = query.trim()
    ? tabFiltered.filter(p => {
        const q = query.toLowerCase();
        const plain = p.body.filter(b => b._type === "block")
          .map(b => (b.children as { text: string }[]).map(c => c.text).join("")).join(" ");
        return p.headline.toLowerCase().includes(q) || p.subheadline.toLowerCase().includes(q) || plain.toLowerCase().includes(q);
      })
    : tabFiltered;

  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Masthead.png" alt="efemera" onClick={onMastheadClick} style={{ height: "clamp(28px, 4vw, 44px)", width: "auto", display: "block", cursor: onMastheadClick ? "pointer" : "default" }} />
        <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          {(["Home", "About", "Micro-Memoirs", "Narratives"] as Tab[]).map(s => (
            <button key={s} onClick={() => { setActiveTab(s); setQuery(""); }} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", background: "none", border: "none", cursor: "pointer", padding: 0, letterSpacing: "0.05em", opacity: activeTab === s ? 1 : 0.7, borderBottom: activeTab === s ? "1px solid white" : "none" }}>{s}</button>
          ))}
        </nav>
      </header>

      {activeTab === "About" ? (
        <AboutPage />
      ) : (
        <>
          <div style={{ maxWidth: 600, margin: "1rem auto 0", width: "100%", padding: "0 0" }}>
            <div style={{ position: "relative" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#657786" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search posts…"
                style={{ width: "100%", fontFamily: "'Inter', sans-serif", fontSize: "0.9rem", padding: "0.55rem 0.75rem 0.55rem 2.4rem", border: "1px solid #e1e8ed", borderRadius: 4, outline: "none", color: "#1c2938", background: "white", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {visiblePosts.length === 0 ? (
            <div style={{ maxWidth: 600, margin: "3rem auto", textAlign: "center", fontFamily: "'Inter', sans-serif", color: "#657786", fontSize: "1rem" }}>
              {query ? `No results for "${query}"` : "No posts yet."}
            </div>
          ) : (
            <div style={{ maxWidth: 600, margin: "0.75rem auto 0", width: "100%", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
              {visiblePosts.map((post, i) => (
                <TweetCard key={post._id} post={post} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      <SiteFooter />
    </div>
  );
}
