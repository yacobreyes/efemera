"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LikeButton from "@/components/LikeButton";
import ShareButton from "@/components/ShareButton";
import type { SanityPost, SanityLately } from "@/lib/sanity";
import { urlFor } from "@/lib/sanityImage";
import Lately from "@/components/Lately";
import Choopy from "@/components/Choopy";
import { renderInline } from "@/lib/renderInline";
import SiteFooter from "@/components/SiteFooter";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Essays" | "Archive";
type SectionTab = "Micro-Memoirs" | "Narratives" | "Essays";

// Bodoni for display heds (vintage editorial), Inter for everything else
const HED   = "var(--font-bodoni), 'Bodoni Moda', Georgia, serif";
const BODY  = "var(--font-inter), -apple-system, sans-serif";
const CRIMSON = "#8B0000";
const INK     = "#1a1008";
const MUTED   = "#6b6560";
const BORDER  = "#d8d0c8";

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

function truncate(text: string, max = 260) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function readingTime(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

// ── Section flag: small crimson small-caps label ──
function Flag({ label }: { label: string }) {
  return (
    <span style={{ fontFamily: BODY, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: CRIMSON }}>
      {label}
    </span>
  );
}

// ── Lead story — top of the well, large hed, photo, italic dek ──
function LeadStory({ post }: { post: SanityPost }) {
  const plain = portableToPlainText(post.body);
  const href  = `/stories/${post.slug}`;
  return (
    <article style={{ paddingBottom: "2rem", marginBottom: "2rem", borderBottom: `1px solid ${BORDER}` }}>
      <Flag label={post.section} />
      <h1 style={{ fontFamily: HED, fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.2rem)", lineHeight: 1.08, color: INK, margin: "0.4rem 0 0.6rem", letterSpacing: "-0.02em" }}>
        <Link href={href} prefetch className="lm-hed" style={{ color: "inherit", textDecoration: "none" }}>{post.headline}</Link>
      </h1>
      {post.subheadline && (
        <p style={{ fontFamily: HED, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1rem, 2.5vw, 1.25rem)", lineHeight: 1.4, color: MUTED, margin: "0 0 1rem", maxWidth: 560 }}>
          {post.subheadline}
        </p>
      )}
      {post.image?.asset && (
        <Link href={href} prefetch style={{ display: "block", marginBottom: "0.75rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlFor(post.image.asset).width(1100).height(620).fit("crop").auto("format").url()}
            alt={post.image.alt ?? post.image.caption ?? ""}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
        </Link>
      )}
      {post.image?.caption && (
        <p style={{ fontFamily: BODY, fontSize: "0.7rem", fontStyle: "italic", color: MUTED, margin: "0 0 0.85rem" }}>{post.image.caption}</p>
      )}
      <div style={{ fontFamily: BODY, fontSize: "0.7rem", letterSpacing: "0.08em", color: MUTED, marginBottom: "0.85rem" }}>
        By <strong style={{ color: INK }}>{post.byline}</strong> &nbsp;·&nbsp; {formatDate(post.date)} &nbsp;·&nbsp; {readingTime(plain)} min read
      </div>
      <p style={{ fontFamily: BODY, fontSize: "1rem", lineHeight: 1.72, color: INK, margin: 0 }}>
        {truncate(plain, 380)}{" "}
        <Link href={href} prefetch style={{ fontFamily: BODY, fontSize: "0.82rem", fontWeight: 600, color: CRIMSON, textDecoration: "none", letterSpacing: "0.02em" }}>Read more →</Link>
      </p>
    </article>
  );
}

// ── Column story — editorial card, no box shadow ──
function StoryCard({ post, showImage = true }: { post: SanityPost; showImage?: boolean }) {
  const plain = portableToPlainText(post.body);
  const href  = `/stories/${post.slug}`;
  const isMicro = post.section === "Micro-Memoir";
  return (
    <article style={{ paddingBottom: "1.5rem", marginBottom: "1.5rem", borderBottom: `1px solid ${BORDER}` }}>
      <Flag label={post.section} />
      <h2 style={{ fontFamily: HED, fontWeight: 700, fontSize: "clamp(1.25rem, 3vw, 1.7rem)", lineHeight: 1.1, color: INK, margin: "0.3rem 0 0.4rem", letterSpacing: "-0.01em" }}>
        <Link href={href} prefetch className="lm-hed" style={{ color: "inherit", textDecoration: "none" }}>{post.headline}</Link>
      </h2>
      {post.subheadline && !isMicro && (
        <p style={{ fontFamily: HED, fontStyle: "italic", fontWeight: 400, fontSize: "0.95rem", lineHeight: 1.38, color: MUTED, margin: "0 0 0.5rem" }}>{post.subheadline}</p>
      )}
      {showImage && post.image?.asset && (
        <Link href={href} prefetch style={{ display: "block", margin: "0.5rem 0 0.65rem" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlFor(post.image.asset).width(700).height(420).fit("crop").auto("format").url()}
            alt={post.image.alt ?? post.image.caption ?? ""}
            loading="lazy"
            style={{ width: "100%", aspectRatio: "5/3", objectFit: "cover", display: "block" }} />
        </Link>
      )}
      <p style={{ fontFamily: BODY, fontSize: "0.93rem", lineHeight: 1.68, color: INK, margin: "0 0 0.6rem" }}>
        {isMicro ? plain : truncate(plain, 180)}
      </p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: BODY, fontSize: "0.68rem", letterSpacing: "0.06em", color: MUTED }}>
          By <strong style={{ color: INK }}>{post.byline}</strong> &nbsp;·&nbsp; {formatDate(post.date)}
        </span>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <LikeButton slug={post.slug} />
          <ShareButton slug={post.slug} headline={post.headline} />
        </div>
      </div>
    </article>
  );
}

function ArchiveTab({ posts }: { posts: SanityPost[] }) {
  const groups = new Map<string, SanityPost[]>();
  for (const post of posts) {
    const d = post.date.length === 10 ? new Date(`${post.date}T12:00:00`) : new Date(post.date);
    const key = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }
  return (
    <div style={{ maxWidth: 660, width: "calc(100% - 2rem)", margin: "2.5rem auto" }}>
      <h1 style={{ fontFamily: HED, fontWeight: 700, fontSize: "2.4rem", color: INK, margin: "0 0 1.75rem", paddingBottom: "0.75rem", borderBottom: `2px solid ${INK}` }}>Archive</h1>
      {groups.size === 0 && <p style={{ fontFamily: BODY, color: MUTED }}>Nothing here yet.</p>}
      {[...groups.entries()].map(([month, monthPosts]) => (
        <div key={month} style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontFamily: BODY, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase", color: CRIMSON, margin: "0 0 0.6rem", paddingBottom: "0.4rem", borderBottom: `1px solid ${BORDER}` }}>{month}</h2>
          {monthPosts.map(post => {
            const d = post.date.length === 10 ? new Date(`${post.date}T12:00:00`) : new Date(post.date);
            return (
              <Link key={post._id} href={`/stories/${post.slug}`} style={{ display: "flex", gap: "1rem", alignItems: "baseline", textDecoration: "none", padding: "0.4rem 0", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontFamily: BODY, fontSize: "0.68rem", color: MUTED, flexShrink: 0, minWidth: 48 }}>{d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}</span>
                <span className="lm-archive" style={{ fontFamily: HED, fontSize: "1rem", fontWeight: 700, lineHeight: 1.3, color: INK }}>{post.headline}</span>
                <span style={{ fontFamily: BODY, fontSize: "0.6rem", color: MUTED, flexShrink: 0, marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.1em" }}>{post.section}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AboutPage({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div style={{ maxWidth: 660, width: "calc(100% - 2rem)", margin: "2.5rem auto" }}>
      <h1 style={{ fontFamily: HED, fontWeight: 700, fontSize: "2.4rem", color: INK, margin: "0 0 1.5rem", paddingBottom: "0.75rem", borderBottom: `2px solid ${INK}` }}>About</h1>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ fontFamily: BODY, fontSize: "1.05rem", lineHeight: 1.8, color: INK, margin: i < paragraphs.length - 1 ? "0 0 1rem" : "0" }}>{renderInline(p)}</p>
      ))}
    </div>
  );
}

export default function Feed({ posts, aboutParagraphs, lately, welcome: welcomeProp, initialTab = "Home", onMastheadClick }: {
  posts: SanityPost[]; aboutParagraphs: string[]; lately?: SanityLately | null;
  welcome?: { headline: string; body: string } | null; initialTab?: Tab; onMastheadClick?: () => void;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const HOME_LIMIT = 12;

  const TAB_PATHS: Record<Tab, string> = {
    "Home": "/", "About": "/about", "Micro-Memoirs": "/micro-memoirs",
    "Narratives": "/narratives", "Essays": "/essays", "Archive": "/archive",
  };

  function switchTab(tab: Tab) {
    setActiveTab(tab); setQuery(""); setSearchOpen(false); setSectionsOpen(false);
    router.replace(TAB_PATHS[tab], { scroll: false });
  }

  useEffect(() => {
    function onOut(e: MouseEvent) { if (sectionsRef.current && !sectionsRef.current.contains(e.target as Node)) setSectionsOpen(false); }
    if (sectionsOpen) document.addEventListener("mousedown", onOut);
    return () => document.removeEventListener("mousedown", onOut);
  }, [sectionsOpen]);

  const welcome = welcomeProp ?? null;
  const isSectionView = activeTab === "Micro-Memoirs" || activeTab === "Narratives" || activeTab === "Essays";

  const tabFiltered =
    activeTab === "Home" ? posts :
    activeTab === "Micro-Memoirs" ? posts.filter(p => p.section === "Micro-Memoir") :
    activeTab === "Narratives" ? posts.filter(p => p.section === "Narratives") :
    activeTab === "Essays" ? posts.filter(p => p.section === "Essays") : [];

  const filteredPosts = query.trim()
    ? tabFiltered.filter(p => {
        const q = query.toLowerCase();
        const plain = portableToPlainText(p.body);
        return p.headline.toLowerCase().includes(q) || (p.subheadline ?? "").toLowerCase().includes(q) || plain.toLowerCase().includes(q);
      })
    : tabFiltered;

  const visiblePosts = activeTab === "Home" && !query.trim() ? filteredPosts.slice(0, HOME_LIMIT) : filteredPosts;
  const [lead, ...rest] = visiblePosts;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#fff" }}>
      <style>{`
        .lm-hed:hover { color: ${CRIMSON} !important; }
        .lm-archive:hover { color: ${CRIMSON} !important; }
        .lm-nav-btn { font-family: ${BODY}; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: ${INK}; background: none; border: none; cursor: pointer; padding: 0; white-space: nowrap; transition: color 0.12s; }
        .lm-nav-btn:hover, .lm-nav-btn.active { color: ${CRIMSON}; }

        /* Page layout */
        .lm-page { max-width: 1100px; margin: 0 auto; width: 100%; padding: 2rem 2rem 4rem; box-sizing: border-box; display: grid; grid-template-columns: minmax(0,1fr) 220px; gap: 3.5rem; align-items: start; }
        .lm-rail { border-left: 1px solid ${BORDER}; padding-left: 2rem; display: flex; flex-direction: column; gap: 2rem; position: sticky; top: 6rem; }

        /* Story grid below lead: 2 columns */
        .lm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 2.5rem; }
        .lm-grid-item { border-right: 1px solid ${BORDER}; padding-right: 2.5rem; }
        .lm-grid-item:nth-child(even) { border-right: none; padding-right: 0; }

        @media (max-width: 900px) {
          .lm-page { grid-template-columns: 1fr; gap: 2rem; padding: 1.5rem 1.25rem 3rem; }
          .lm-rail { position: static; border-left: none; padding-left: 0; border-top: 1px solid ${BORDER}; padding-top: 2rem; flex-direction: row; flex-wrap: wrap; gap: 1.5rem; }
          .lm-rail > * { flex: 1 1 220px; }
        }
        @media (max-width: 600px) {
          .lm-grid { grid-template-columns: 1fr; }
          .lm-grid-item { border-right: none; padding-right: 0; }
        }
      `}</style>

      {/* ── Nameplate ── */}
      <header style={{ background: "#fff", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem", boxSizing: "border-box" }}>

          {/* Top meta strip */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0", borderBottom: `1px solid ${BORDER}`, fontFamily: BODY, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>
            <span>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
            <span style={{ color: CRIMSON, fontWeight: 700 }}>A Literary Magazine</span>
            <span>Est. 2024</span>
          </div>

          {/* Wordmark — centered, large */}
          <div style={{ textAlign: "center", padding: "1.1rem 0 0.9rem", borderBottom: `3px double ${INK}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Masthead.webp" alt="efemera" fetchPriority="high" onClick={onMastheadClick}
              style={{ height: "clamp(40px, 6.5vw, 72px)", width: "auto", display: "inline-block", cursor: onMastheadClick ? "pointer" : "default" }} />
          </div>

          {/* Navigation */}
          <nav style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2.25rem", padding: "0.65rem 0" }}>
            {(["Home", "About"] as Tab[]).map(s => (
              <button key={s} className={`lm-nav-btn${activeTab === s ? " active" : ""}`} onClick={() => switchTab(s)}>{s}</button>
            ))}
            <div ref={sectionsRef} style={{ position: "relative" }}>
              <button className={`lm-nav-btn${isSectionView ? " active" : ""}`} onClick={() => setSectionsOpen(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                Sections
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: "transform 0.15s", transform: sectionsOpen ? "rotate(180deg)" : "none" }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {sectionsOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 0.5rem)", left: "50%", transform: "translateX(-50%)", background: "#fff", border: `1px solid ${BORDER}`, boxShadow: "0 6px 24px rgba(0,0,0,0.1)", minWidth: 160, zIndex: 200 }}>
                  {(["Narratives", "Essays", "Micro-Memoirs"] as SectionTab[]).map(s => (
                    <button key={s} onClick={() => switchTab(s)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", fontFamily: BODY, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: activeTab === s ? CRIMSON : INK, background: "none", border: "none", cursor: "pointer", borderBottom: `1px solid ${BORDER}` }}
                      onMouseEnter={e => { if (activeTab !== s) e.currentTarget.style.background = "#fdf5f5"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className={`lm-nav-btn${activeTab === "Archive" ? " active" : ""}`} onClick={() => switchTab("Archive")}>Archive</button>
            {/* Search toggle */}
            <button className="lm-nav-btn" onClick={() => setSearchOpen(v => !v)} title="Search" style={{ display: "flex", alignItems: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </nav>

          {searchOpen && (
            <div style={{ borderTop: `1px solid ${BORDER}`, padding: "0.65rem 0" }}>
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search…"
                style={{ width: "100%", fontFamily: BODY, fontSize: "0.95rem", padding: "0.4rem 0", border: "none", borderBottom: `1px solid ${MUTED}`, outline: "none", color: INK, background: "transparent", boxSizing: "border-box" }} />
            </div>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      {activeTab === "About" ? <AboutPage paragraphs={aboutParagraphs} /> :
       activeTab === "Archive" ? <ArchiveTab posts={posts} /> : (
        <div className="lm-page">
          <main style={{ minWidth: 0 }}>
            {isSectionView && (
              <div style={{ marginBottom: "1.75rem", paddingBottom: "0.75rem", borderBottom: `2px solid ${INK}` }}>
                <h1 style={{ fontFamily: HED, fontWeight: 700, fontSize: "2rem", color: INK, margin: 0 }}>{activeTab}</h1>
              </div>
            )}

            {visiblePosts.length === 0 ? (
              <p style={{ fontFamily: BODY, color: MUTED, fontSize: "1rem", textAlign: "center", padding: "4rem 0" }}>
                {query ? `No results for "${query}"` : "No stories yet."}
              </p>
            ) : (
              <>
                {lead && !isSectionView && <LeadStory post={lead} />}
                <div className="lm-grid">
                  {(isSectionView ? visiblePosts : rest).map(post => (
                    <div key={post._id} className="lm-grid-item">
                      <StoryCard post={post} showImage={!isSectionView} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </main>

          {/* Right rail */}
          <aside className="lm-rail">
            {(welcome?.headline || welcome?.body) && (
              <div style={{ paddingBottom: "1.5rem", borderBottom: `1px solid ${BORDER}` }}>
                {welcome.headline && <p style={{ fontFamily: HED, fontWeight: 700, fontSize: "1rem", color: INK, margin: "0 0 0.4rem", lineHeight: 1.3 }}>{welcome.headline}</p>}
                {welcome.body && <p style={{ fontFamily: BODY, fontSize: "0.82rem", color: MUTED, margin: 0, lineHeight: 1.55 }}>{welcome.body}</p>}
              </div>
            )}
            <Lately data={lately ?? null} />
            <Choopy />
          </aside>
        </div>
      )}

      <div style={{ marginTop: "auto" }}><SiteFooter /></div>
    </div>
  );
}
