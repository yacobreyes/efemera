"use client";

import { useEffect, useRef, useState } from "react";
import { posts } from "@/lib/posts";

function timeAgo(index: number) {
  const units = ["2m", "14m", "1h", "3h", "6h", "12h"];
  return units[index] ?? "1d";
}

function TweetCard({ post, index }: { post: typeof posts[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(index < 3);
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible]);

  const likes   = Math.floor(Math.random() * 900 + 40);
  const rts     = Math.floor(Math.random() * 300 + 10);
  const replies = Math.floor(Math.random() * 60 + 3);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: "0.75rem",
        padding: "0.85rem 1rem",
        background: "white",
        borderBottom: "1px solid #e1e8ed",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1)`,
        cursor: "pointer",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "#f5f8fa")}
      onMouseLeave={e => (e.currentTarget.style.background = "white")}
    >
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          width: 48, height: 48,
          borderRadius: "50%",
          background: "#8B0000",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mayfly-icon.png" alt="" width={30} height={30} style={{ display: "block" }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name row */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#1c2938" }}>
            Efemera
          </span>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.85rem", color: "#657786" }}>
            @efemera_life
          </span>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.85rem", color: "#657786" }}>·</span>
          <span style={{ fontFamily: "Arial, sans-serif", fontSize: "0.85rem", color: "#657786" }}>
            {timeAgo(index)}
          </span>
        </div>

        {/* Kicker */}
        <div style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "#8B0000",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: "0.15rem",
          marginTop: "0.1rem",
        }}>
          {post.kicker}
        </div>

        {/* Headline as tweet text */}
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1rem",
          fontWeight: 700,
          color: "#1c2938",
          lineHeight: 1.35,
          margin: "0 0 0.4rem",
        }}>
          {post.headline}
        </p>

        {/* Body preview */}
        <p style={{
          fontFamily: "Arial, sans-serif",
          fontSize: "0.875rem",
          color: "#3d3d3d",
          lineHeight: 1.5,
          margin: "0 0 0.6rem",
        }}>
          {post.body[0].slice(0, 180)}{post.body[0].length > 180 ? "…" : ""}
        </p>

        {/* Action bar */}
        <div style={{ display: "flex", gap: "1.8rem", alignItems: "center" }}>
          {/* Reply */}
          <button style={{ ...actionBtn }} title="Reply">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#657786" strokeWidth="1.8">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span style={{ ...actionNum }}>{replies}</span>
          </button>

          {/* Retweet */}
          <button
            style={{ ...actionBtn }}
            title="Retweet"
            onClick={e => { e.stopPropagation(); setRetweeted(r => !r); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={retweeted ? "#19cf86" : "#657786"} strokeWidth="1.8">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 014-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            <span style={{ ...actionNum, color: retweeted ? "#19cf86" : "#657786" }}>
              {rts + (retweeted ? 1 : 0)}
            </span>
          </button>

          {/* Like */}
          <button
            style={{ ...actionBtn }}
            title="Like"
            onClick={e => { e.stopPropagation(); setLiked(l => !l); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24"
              fill={liked ? "#e0245e" : "none"}
              stroke={liked ? "#e0245e" : "#657786"} strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
            </svg>
            <span style={{ ...actionNum, color: liked ? "#e0245e" : "#657786" }}>
              {likes + (liked ? 1 : 0)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

const actionBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "0.3rem",
  background: "none", border: "none", cursor: "pointer", padding: "2px 0",
};
const actionNum: React.CSSProperties = {
  fontFamily: "Arial, sans-serif", fontSize: "0.78rem", color: "#657786",
};

export default function Feed() {
  return (
    <div style={{ background: "#f5f8fa", minHeight: "100vh" }}>
      {/* Header — OG Twitter style */}
      <header style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#8B0000",
        padding: "0.6rem 1rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mayfly-icon.png" alt="" width={24} height={24} />
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
              textDecoration: "none", letterSpacing: "0.05em",
            }}>{s}</a>
          ))}
        </nav>
      </header>

      {/* Two-column OG Twitter layout */}
      <div style={{
        maxWidth: 900, margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 280px", gap: "1rem",
        padding: "1rem",
        alignItems: "start",
      }}>
        {/* Feed column */}
        <div style={{
          background: "white",
          border: "1px solid #e1e8ed",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          {/* "What's happening" bar */}
          <div style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #e1e8ed",
            display: "flex", alignItems: "center", gap: "0.75rem",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "#8B0000",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mayfly-icon.png" alt="" width={24} height={24} />
            </div>
            <div style={{
              flex: 1,
              fontFamily: "Arial, sans-serif", fontSize: "1rem",
              color: "#aab8c2", borderBottom: "1px solid #e1e8ed",
              paddingBottom: "0.4rem",
            }}>
              What&rsquo;s happening...
            </div>
          </div>

          {posts.map((post, i) => (
            <TweetCard key={post.slug} post={post} index={i} />
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Profile card */}
          <div style={{
            background: "white", border: "1px solid #e1e8ed",
            borderRadius: 4, overflow: "hidden",
          }}>
            <div style={{ background: "#8B0000", height: 60 }} />
            <div style={{ padding: "0 1rem 1rem", position: "relative" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "#8B0000", border: "3px solid white",
                position: "absolute", top: -28,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mayfly-icon.png" alt="" width={32} height={32} />
              </div>
              <div style={{ paddingTop: 32 }}>
                <div style={{ fontFamily: "Arial, sans-serif", fontWeight: 700, fontSize: "0.95rem", color: "#1c2938" }}>
                  Efemera
                </div>
                <div style={{ fontFamily: "Arial, sans-serif", fontSize: "0.8rem", color: "#657786" }}>
                  @efemera_life
                </div>
                <div style={{
                  fontFamily: "'Playfair Display', serif", fontStyle: "italic",
                  fontSize: "0.8rem", color: "#3d3d3d", margin: "0.5rem 0",
                  lineHeight: 1.4,
                }}>
                  Life, in Brief. Essays on the ephemeral moments that make a life.
                </div>
                <div style={{ display: "flex", gap: "1rem", fontFamily: "Arial, sans-serif", fontSize: "0.78rem" }}>
                  <span><strong style={{ color: "#1c2938" }}>6</strong> <span style={{ color: "#657786" }}>Stories</span></span>
                  <span><strong style={{ color: "#1c2938" }}>412</strong> <span style={{ color: "#657786" }}>Followers</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Trends box */}
          <div style={{
            background: "white", border: "1px solid #e1e8ed",
            borderRadius: 4, padding: "0.75rem 1rem",
          }}>
            <div style={{
              fontFamily: "Arial, sans-serif", fontWeight: 700,
              fontSize: "0.85rem", color: "#1c2938", marginBottom: "0.6rem",
            }}>
              Trending
            </div>
            {["#ephemera", "#memory", "#mayfly", "#lifeInBrief", "#nature"].map(tag => (
              <div key={tag} style={{
                padding: "0.4rem 0",
                borderTop: "1px solid #f0f0f0",
                fontFamily: "Arial, sans-serif",
                fontSize: "0.82rem",
                color: "#8B0000",
                cursor: "pointer",
              }}>
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
