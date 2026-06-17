"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SanityPost, SanityLately } from "@/lib/sanity";
import { urlFor } from "@/lib/sanityImage";
import Lately from "@/components/Lately";
import Choopy from "@/components/Choopy";
import { renderInline } from "@/lib/renderInline";
import SiteFooter from "@/components/SiteFooter";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Essays" | "Archive";
type SectionTab = "Micro-Memoirs" | "Narratives" | "Essays";

// ── Type system (New-Yorker-ish): Caslon display for heds, Caslon text for
// body/deks, Archivo for section flags + bylines. ──
const DISPLAY = "var(--font-caslon-display), 'Libre Caslon Display', Georgia, serif";
const SERIF = "var(--font-caslon-text), 'Libre Caslon Text', Georgia, serif";
const SANS = "var(--font-archivo), -apple-system, 'Helvetica Neue', Arial, sans-serif";

const INK = "#111111";
const MUTED = "#666666";
const CRIMSON = "#8B0000";
const RULE = "#111111";
const PAPER = "#ffffff";

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

// ── Lead story: dominant hed, wide photo, excerpt in columns ──
function LeadStory({ post }: { post: SanityPost }) {
  const plain = portableToPlainText(post.body);
  const href = `/stories/${post.slug}`;
  return (
    <article className="bsf-lead">
      <div className="bsf-flag" style={{ textAlign: "center" }}>{post.section}</div>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(2.4rem, 5.5vw, 4rem)", lineHeight: 1.05, color: INK, textAlign: "center", margin: "0.5rem 0 0.6rem", letterSpacing: "-0.01em" }}>
        <Link href={href} prefetch className="bsf-hedlink" style={{ color: "inherit", textDecoration: "none" }}>{post.headline}</Link>
      </h1>
      {post.subheadline && (
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "clamp(1.05rem, 2vw, 1.35rem)", lineHeight: 1.45, color: MUTED, textAlign: "center", margin: "0 auto 1rem", maxWidth: 620 }}>
          {post.subheadline}
        </p>
      )}
      {post.image?.asset && (
        <Link href={href} prefetch style={{ display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlFor(post.image.asset).width(1280).height(720).fit("crop").auto("format").url()}
            alt={post.image.alt ?? post.image.caption ?? ""}
            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block", marginBottom: "0.35rem" }}
          />
        </Link>
      )}
      {post.image?.caption && (
        <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: MUTED, fontStyle: "italic", margin: "0 0 0.9rem" }}>{post.image.caption}</p>
      )}
      <div style={{ fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, textAlign: "center", margin: "0 0 0.9rem" }}>
        By {post.byline} &nbsp;·&nbsp; {readingTime(plain)} min read
      </div>
      <p className="bsf-lead-body" style={{ fontFamily: SERIF, fontSize: "1.02rem", lineHeight: 1.7, color: INK, margin: 0, textAlign: "justify" }}>
        {truncate(plain, 520)}{" "}
        <Link href={href} prefetch style={{ fontFamily: SANS, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.04em", color: CRIMSON, textDecoration: "none", whiteSpace: "nowrap" }}>Continue reading →</Link>
      </p>
    </article>
  );
}

// ── Column item: a single story in the flowing column grid ──
function ColumnItem({ post }: { post: SanityPost }) {
  const plain = portableToPlainText(post.body);
  const href = `/stories/${post.slug}`;
  const isMicro = post.section === "Micro-Memoir";
  return (
    <article className="bsf-item">
      <div className="bsf-flag">{post.section}</div>
      <h2 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "1.5rem", lineHeight: 1.12, color: INK, margin: "0.2rem 0 0.35rem", letterSpacing: "-0.01em" }}>
        <Link href={href} prefetch className="bsf-hedlink" style={{ color: "inherit", textDecoration: "none" }}>{post.headline}</Link>
      </h2>
      {post.image?.asset && (
        <Link href={href} prefetch style={{ display: "block" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlFor(post.image.asset).width(600).height(360).fit("crop").auto("format").url()}
            alt={post.image.alt ?? post.image.caption ?? ""}
            loading="lazy"
            style={{ width: "100%", aspectRatio: "5/3", objectFit: "cover", display: "block", margin: "0 0 0.5rem" }}
          />
        </Link>
      )}
      {post.subheadline && !isMicro && (
        <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "0.95rem", lineHeight: 1.4, color: MUTED, margin: "0 0 0.4rem" }}>{post.subheadline}</p>
      )}
      <p style={{ fontFamily: SERIF, fontSize: "0.92rem", lineHeight: 1.62, color: INK, margin: "0 0 0.5rem", textAlign: "justify" }}>
        {isMicro ? plain : truncate(plain, 220)}
      </p>
      <div style={{ fontFamily: SANS, fontSize: "0.66rem", letterSpacing: "0.07em", textTransform: "uppercase", color: MUTED }}>
        By {post.byline} &nbsp;·&nbsp; {readingTime(plain)} min
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
    <div style={{ maxWidth: 640, width: "calc(100% - 2rem)", boxSizing: "border-box", margin: "2.5rem auto", padding: "0 0.5rem" }}>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(2rem, 5vw, 2.8rem)", color: INK, margin: "0 0 1.5rem" }}>Archive</h1>
      {groups.size === 0 && <p style={{ fontFamily: SERIF, color: MUTED }}>Nothing here yet.</p>}
      {[...groups.entries()].map(([month, monthPosts]) => (
        <div key={month} style={{ marginBottom: "1.8rem" }}>
          <h2 style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: CRIMSON, margin: "0 0 0.7rem", paddingBottom: "0.4rem", borderBottom: `1px solid ${RULE}` }}>
            {month}
          </h2>
          {monthPosts.map(post => {
            const d = post.date.length === 10 ? new Date(`${post.date}T12:00:00`) : new Date(post.date);
            return (
              <Link key={post._id} href={`/stories/${post.slug}`} style={{ display: "flex", gap: "1rem", alignItems: "baseline", textDecoration: "none", padding: "0.4rem 0", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                <span style={{ fontFamily: SANS, fontSize: "0.7rem", color: MUTED, flexShrink: 0, minWidth: 52 }}>
                  {d.toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                </span>
                <span className="archive-title" style={{ fontFamily: DISPLAY, fontSize: "1.05rem", fontWeight: 400, lineHeight: 1.3 }}>
                  {post.headline}
                </span>
                <span style={{ fontFamily: SANS, fontSize: "0.62rem", color: MUTED, flexShrink: 0, marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {post.section}
                </span>
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
    <div style={{ maxWidth: 640, width: "calc(100% - 2rem)", boxSizing: "border-box", margin: "2.5rem auto", padding: "0 0.5rem" }}>
      <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(2rem, 5vw, 2.8rem)", color: INK, margin: "0 0 1.4rem" }}>About Efemera</h1>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ fontFamily: SERIF, fontSize: "1.1rem", lineHeight: 1.8, color: INK, margin: i < paragraphs.length - 1 ? "0 0 1rem" : "0" }}>{renderInline(p)}</p>
      ))}
    </div>
  );
}

export default function Feed({ posts, aboutParagraphs, lately, welcome: welcomeProp, initialTab = "Home", onMastheadClick }: { posts: SanityPost[]; aboutParagraphs: string[]; lately?: SanityLately | null; welcome?: { headline: string; body: string } | null; initialTab?: Tab; onMastheadClick?: () => void }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const HOME_LIMIT = 13;

  const TAB_PATHS: Record<Tab, string> = {
    "Home": "/",
    "About": "/about",
    "Micro-Memoirs": "/micro-memoirs",
    "Narratives": "/narratives",
    "Essays": "/essays",
    "Archive": "/archive",
  };

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setQuery("");
    setSearchOpen(false);
    setSectionsOpen(false);
    router.replace(TAB_PATHS[tab], { scroll: false });
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (sectionsRef.current && !sectionsRef.current.contains(e.target as Node)) setSectionsOpen(false);
    }
    if (sectionsOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [sectionsOpen]);
  const welcome = welcomeProp ?? null;

  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const tabFiltered = activeTab === "Home"
    ? posts
    : activeTab === "Micro-Memoirs"
    ? posts.filter(p => p.section === "Micro-Memoir")
    : activeTab === "Narratives"
    ? posts.filter(p => p.section === "Narratives")
    : activeTab === "Essays"
    ? posts.filter(p => p.section === "Essays")
    : [];

  const filteredPosts = query.trim()
    ? tabFiltered.filter(p => {
        const q = query.toLowerCase();
        const plain = p.body.filter(b => b._type === "block")
          .map(b => (b.children as { text: string }[]).map(c => c.text).join("")).join(" ");
        return p.headline.toLowerCase().includes(q) || (p.subheadline ?? "").toLowerCase().includes(q) || plain.toLowerCase().includes(q);
      })
    : tabFiltered;
  const visiblePosts = activeTab === "Home" && !query.trim() ? filteredPosts.slice(0, HOME_LIMIT) : filteredPosts;

  const [lead, ...rest] = visiblePosts;
  const isSectionView = activeTab === "Micro-Memoirs" || activeTab === "Narratives" || activeTab === "Essays";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: PAPER }}>
      <style>{`
        .bsf-flag { font-family: ${SANS}; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: ${CRIMSON}; }
        .bsf-hedlink { transition: color 0.15s; }
        .bsf-hedlink:hover { color: ${CRIMSON}; }
        .archive-title { color: ${INK}; transition: color 0.15s; }
        .archive-title:hover { color: ${CRIMSON}; }
        .bsf-nav button { font-family: ${SANS}; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: ${INK}; background: none; border: none; cursor: pointer; padding: 0; white-space: nowrap; }
        .bsf-nav button:hover { color: ${CRIMSON}; }

        /* Broadsheet grid: main well + right rail */
        .bsf-wrap { max-width: 1180px; margin: 0 auto; width: 100%; padding: 1.75rem 2rem 0; box-sizing: border-box; display: grid; grid-template-columns: minmax(0,1fr) 260px; gap: 2.5rem; align-items: start; }
        .bsf-rail { border-left: 1px solid ${RULE}; padding-left: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }

        /* Lead spans the well; stories below flow into 2 columns w/ column rules */
        .bsf-lead { padding-bottom: 1.5rem; margin-bottom: 1.5rem; border-bottom: 3px double ${RULE}; }
        .bsf-lead-body { column-count: 2; column-gap: 2rem; }
        .bsf-cols { column-count: 2; column-gap: 2.5rem; column-rule: 1px solid ${RULE}; }
        .bsf-item { break-inside: avoid; padding: 0 0 1.1rem; margin-bottom: 1.1rem; border-bottom: 1px solid rgba(0,0,0,0.22); }

        @media (max-width: 980px) {
          .bsf-wrap { grid-template-columns: 1fr; gap: 1.5rem; padding: 1.25rem 1.25rem 0; }
          .bsf-rail { border-left: none; padding-left: 0; border-top: 3px double ${RULE}; padding-top: 1.5rem; flex-direction: row; flex-wrap: wrap; }
          .bsf-rail > * { flex: 1 1 240px; }
        }
        @media (max-width: 620px) {
          .bsf-lead-body { column-count: 1; }
          .bsf-cols { column-count: 1; }
        }
      `}</style>

      {/* ── Nameplate ── */}
      <header style={{ background: PAPER, borderBottom: `1px solid ${RULE}` }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0.9rem 2rem 0", boxSizing: "border-box" }}>
          {/* top dateline strip */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, paddingBottom: "0.6rem" }}>
            <span>{todayLabel}</span>
            <span style={{ fontWeight: 700, color: INK }}>A Literary Magazine</span>
            <span>Est. 2024</span>
          </div>
          {/* wordmark */}
          <div style={{ textAlign: "center", borderTop: `1px solid ${RULE}`, paddingTop: "1rem" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Masthead.webp" alt="efemera" fetchPriority="high" width={2688} height={512} onClick={onMastheadClick}
              style={{ height: "clamp(46px, 7vw, 84px)", width: "auto", display: "inline-block", cursor: onMastheadClick ? "pointer" : "default" }} />
          </div>
          {/* nav bar */}
          <nav className="bsf-nav" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "2rem", borderTop: `3px double ${RULE}`, borderBottom: `1px solid ${RULE}`, marginTop: "1rem", padding: "0.6rem 0" }}>
            {(["Home", "About"] as Tab[]).map(s => (
              <button key={s} onClick={() => switchTab(s)} style={{ color: activeTab === s ? CRIMSON : INK }}>{s}</button>
            ))}
            <div ref={sectionsRef} style={{ position: "relative" }}>
              <button onClick={() => setSectionsOpen(v => !v)} style={{ color: isSectionView ? CRIMSON : INK, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                Sections
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transition: "transform 0.15s", transform: sectionsOpen ? "rotate(180deg)" : "rotate(0deg)" }}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {sectionsOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 0.6rem)", left: "50%", transform: "translateX(-50%)", background: PAPER, border: `1px solid ${RULE}`, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", minWidth: 170, zIndex: 100, overflow: "hidden" }}>
                  {(["Micro-Memoirs", "Narratives", "Essays"] as SectionTab[]).map(s => (
                    <button key={s} onClick={() => switchTab(s)} style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 1rem", fontFamily: SANS, fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: activeTab === s ? 700 : 500, color: activeTab === s ? CRIMSON : INK, background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.05)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => switchTab("Archive")} style={{ color: activeTab === "Archive" ? CRIMSON : INK }}>Archive</button>
            <button onClick={() => setSearchOpen(v => !v)} title="Search" style={{ display: "flex", alignItems: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </nav>
          {searchOpen && (
            <div style={{ padding: "0.75rem 0", borderBottom: `1px solid ${RULE}` }}>
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the magazine…"
                style={{ width: "100%", fontFamily: SERIF, fontSize: "1rem", padding: "0.5rem 0.25rem", border: "none", borderBottom: `1px solid ${MUTED}`, outline: "none", color: INK, background: "transparent", boxSizing: "border-box" }} />
            </div>
          )}
        </div>
      </header>

      {activeTab === "About" ? (
        <AboutPage paragraphs={aboutParagraphs} />
      ) : activeTab === "Archive" ? (
        <ArchiveTab posts={posts} />
      ) : (
        <div className="bsf-wrap">
          <div style={{ minWidth: 0 }}>
            {visiblePosts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 0", fontFamily: SERIF, color: MUTED, fontSize: "1.1rem" }}>
                {query ? `No results for “${query}”` : "No stories yet."}
              </div>
            ) : (
              <>
                {isSectionView && (
                  <h1 style={{ fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(1.8rem, 4vw, 2.6rem)", color: INK, margin: "0 0 1.25rem", paddingBottom: "0.75rem", borderBottom: `3px double ${RULE}` }}>{activeTab}</h1>
                )}
                {lead && !isSectionView && <LeadStory post={lead} />}
                <div className="bsf-cols">
                  {(isSectionView ? visiblePosts : rest).map(post => (
                    <ColumnItem key={post._id} post={post} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right rail */}
          <aside className="bsf-rail">
            {(welcome?.headline || welcome?.body) && (
              <div style={{ borderTop: `2px solid ${RULE}`, paddingTop: "0.75rem" }}>
                {welcome?.headline && (
                  <p style={{ fontFamily: DISPLAY, fontSize: "1.05rem", fontWeight: 400, color: INK, margin: 0, lineHeight: 1.3 }}>{welcome.headline}</p>
                )}
                {welcome?.body && (
                  <p style={{ fontFamily: SERIF, fontSize: "0.88rem", color: MUTED, margin: welcome?.headline ? "0.4rem 0 0" : 0, lineHeight: 1.55 }}>{welcome.body}</p>
                )}
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
