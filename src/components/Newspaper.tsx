"use client";

import { useEffect, useRef, useState } from "react";
import { posts } from "@/lib/posts";

function timeAgo(index: number) {
  const units = ["2m", "14m", "1h", "3h", "6h", "12h"];
  return units[index] ?? "1d";
}

function TweetCard({ post, index }: { post: typeof posts[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 2);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replied, setReplied] = useState(false);
  const [replyCount, setReplyCount] = useState(0);

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
      {/* Meta row: kicker + timestamp */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <span style={{
          fontFamily: "Arial, sans-serif", fontWeight: 700,
          fontSize: "0.68rem", letterSpacing: "0.12em",
          textTransform: "uppercase", color: "#8B0000",
        }}>
          {post.kicker}
        </span>
        <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem", color: "#657786" }}>
          {timeAgo(index)}
        </span>
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: "'Playfair Display', serif",
        fontWeight: 900, fontSize: "1.25rem",
        color: "#1c2938", lineHeight: 1.25,
        margin: "0 0 0.25rem",
      }}>
        {post.headline}
      </h2>

      {/* Subheadline */}
      <p style={{
        fontFamily: "'Playfair Display', serif",
        fontStyle: "italic", fontSize: "0.92rem",
        color: "#526270", lineHeight: 1.4,
        margin: "0 0 0.75rem",
      }}>
        {post.subheadline}
      </p>

      {/* Body */}
      <div style={{ fontFamily: "Georgia, serif", fontSize: "0.92rem", lineHeight: 1.7, color: "#3d3d3d" }}>
        {post.body.map((p, i) => (
          <p key={i} style={{ margin: i === 0 ? 0 : "0.8rem 0 0" }}>{p}</p>
        ))}
      </div>

      {/* Byline */}
      <div style={{
        fontFamily: "Arial, sans-serif", fontSize: "0.72rem",
        color: "#657786", margin: "0.9rem 0 0.6rem",
        fontStyle: "italic",
      }}>
        {post.byline} · {post.date}
      </div>

      {/* Action bar */}
      <div style={{ display: "flex", gap: "1.5rem", alignItems: "center", paddingTop: "0.4rem", borderTop: "1px solid #f0f3f4" }}>
        {/* Reply */}
        <button
          onClick={() => { setReplied(r => !r); setReplyCount(c => replied ? c - 1 : c + 1); }}
          style={{
            display: "flex", alignItems: "center", gap: "0.35rem",
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: replied ? "#8B0000" : "#657786",
          }}
          title="Reply"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem" }}>{replyCount}</span>
        </button>

        {/* Like */}
        <button
          onClick={() => { setLiked(l => !l); setLikeCount(c => liked ? c - 1 : c + 1); }}
          style={{
            display: "flex", alignItems: "center", gap: "0.35rem",
            background: "none", border: "none", cursor: "pointer", padding: 0,
            color: liked ? "#e0245e" : "#657786",
          }}
          title="Like"
        >
          <svg width="17" height="17" viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem" }}>{likeCount}</span>
        </button>
      </div>
    </div>
  );
}

export default function Feed() {
  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#8B0000",
        padding: "0.6rem 1.2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mayfly-icon.png" alt="" width={22} height={22} />
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900, fontSize: "1.3rem", color: "white",
          }}>efemera</span>
        </div>
        <nav style={{ display: "flex", gap: "1.2rem" }}>
          {["Essays", "Memory", "Nature", "Place"].map(s => (
            <a key={s} href="#" style={{
              fontFamily: "Arial, sans-serif", fontSize: "0.75rem",
              fontWeight: 700, color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
            }}>{s}</a>
          ))}
        </nav>
      </header>

      {/* Feed */}
      <div style={{ maxWidth: 600, margin: "1rem auto", border: "1px solid #e1e8ed", borderRadius: 4, overflow: "hidden" }}>
        {posts.map((post, i) => (
          <TweetCard key={post.slug} post={post} index={i} />
        ))}
      </div>
    </div>
  );
}
