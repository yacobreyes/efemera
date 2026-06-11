"use client";

import { useEffect, useRef, useState } from "react";
import MayflyIcon from "./MayflyIcon";
import { posts } from "@/lib/posts";

function FeedCard({ post, index }: { post: typeof posts[0]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.55s ease ${index * 0.05}s, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${index * 0.05}s`,
        borderBottom: "1px solid rgba(0,0,0,0.1)",
        padding: "1.5rem 0",
      }}
    >
      <div className="article-kicker">{post.kicker}</div>
      <h2 className={`article-headline ${post.size}`} style={{ marginBottom: "0.35rem" }}>
        {post.headline}
      </h2>
      {post.subheadline && (
        <p style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: "italic",
          fontSize: "1rem",
          color: "var(--ink)",
          marginBottom: "0.5rem",
          lineHeight: 1.4,
          opacity: 0.8,
        }}>
          {post.subheadline}
        </p>
      )}
      <div className="article-byline">By {post.byline} · {post.date}</div>
      {post.pullQuote && (
        <div className="pull-quote" style={{ margin: "0.8rem 0" }}>{post.pullQuote}</div>
      )}
      <div className="article-body">
        {post.body.map((p, i) => (
          <p key={i} style={{ marginTop: i > 0 ? "0.7rem" : 0 }}>{p}</p>
        ))}
      </div>
    </div>
  );
}

export default function Feed() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ background: "var(--newsprint)", minHeight: "100vh" }}>
      {/* Sticky header */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--cream)",
        borderBottom: "3px double var(--rule)",
        padding: "0.75rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <MayflyIcon size={18} color="var(--crimson)" />
          <span style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: "1.5rem",
            color: "var(--crimson)",
            letterSpacing: "-0.02em",
          }}>efemera</span>
        </div>
        <nav style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
          {["Essays", "Memory", "Nature", "Place"].map(s => (
            <a key={s} href="#" style={{
              fontFamily: "'Libre Baskerville', serif",
              fontSize: "0.6rem",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--rule)",
              textDecoration: "none",
            }}>{s}</a>
          ))}
        </nav>
      </header>

      {/* Date bar */}
      <div style={{
        background: "var(--rule)",
        padding: "0.3rem 1.5rem",
        fontFamily: "'Libre Baskerville', serif",
        fontSize: "0.6rem",
        letterSpacing: "0.15em",
        color: "rgba(255,255,255,0.7)",
        textAlign: "center",
      }}>
        {dateStr}
      </div>

      {/* Feed */}
      <div style={{
        maxWidth: 620,
        margin: "0 auto",
        padding: "1rem 1.5rem 4rem",
      }}>
        {posts.map((post, i) => (
          <FeedCard key={post.slug} post={post} index={i} />
        ))}
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "3px double var(--rule)",
        padding: "1.5rem",
        textAlign: "center",
        background: "var(--cream)",
        fontFamily: "'Libre Baskerville', serif",
        fontSize: "0.6rem",
        letterSpacing: "0.15em",
        color: "var(--rule)",
      }}>
        <MayflyIcon size={14} color="var(--crimson)" />
        <div style={{ marginTop: "0.4rem" }}>EFEMERA — LIFE, IN BRIEF. — EST. 2026</div>
        <div style={{ marginTop: "0.2rem", opacity: 0.6 }}>
          &ldquo;Everything passes. Everything perishes. Everything palls.&rdquo; — André Gide
        </div>
      </footer>
    </div>
  );
}
