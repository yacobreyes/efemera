"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";
import { urlFor } from "@/lib/sanityImage";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Essays" | "Archive";

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

function readingTime(text: string) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200));
}

function truncate(text: string, max = 180) {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

function sectionLabel(section: SanityPost["section"]) {
  if (section === "Micro-Memoir") return "Micro-Memoir";
  return section;
}

export default function Feed({
  posts,
  onMastheadClick,
}: {
  posts: SanityPost[];
  aboutParagraphs: string[];
  lately: SanityLately | null;
  welcome: SanityWelcome | null;
  initialTab: Tab;
  onMastheadClick?: () => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMin, setActiveMin] = useState(5);
  const [searchQ, setSearchQ] = useState("");

  const published = posts.filter(p =>
    !p.status || p.status === "published" ||
    (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date())
  );

  const hero = published[0];
  const cards = published.slice(1, 5);

  const heroImg = hero?.image?.asset
    ? urlFor(hero.image.asset).width(1400).height(600).fit("crop").auto("format").url()
    : null;

  return (
    <>
      <style>{`
        :root {
          --paper: #f5efe4;
          --paper-dark: #dfd4c4;
          --ink: #171412;
          --red: #8e0d0d;
          --line: #cfc3b3;
        }
        * { box-sizing: border-box; }
        html { background: #fbf6ee; }
        body {
          margin: 0;
          background: #fbf6ee;
          color: var(--ink);
          font-family: "Cormorant Garamond", Georgia, serif;
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        .ef-h1 a:focus { outline: none; }
        .ef-hero a:focus-visible { outline: 2px solid rgba(255,255,255,.6); outline-offset: 4px; }

        /* NAV */
        .ef-nav {
          height: 100px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 0 44px;
          border-bottom: 1px solid var(--line);
          background: #fbf6ee;
          position: relative;
        }
        .ef-nav-group {
          display: flex;
          gap: 42px;
          align-items: center;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .ef-nav-group.right { justify-content: flex-end; }
        .ef-logo { display: block; }
        .ef-logo img { height: 58px; width: auto; display: block; }
        .ef-nav-cta {
          background: var(--red);
          color: #fff !important;
          padding: 7px 14px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
          border-radius: 2px;
          cursor: pointer;
        }
        .ef-toggle { display: none; }
        .ef-section-tabs { display: none; }
        .ef-drawer { display: none; }
        .ef-mob-sub { display: none; }

        /* HERO */
        .ef-hero {
          position: relative;
          min-height: 620px;
          display: flex;
          align-items: flex-end;
          padding: 80px 7vw;
          overflow: hidden;
          color: #f7f1e7;
          background:
            linear-gradient(to top, rgba(18,14,11,.85) 0%, rgba(18,14,11,.48) 42%, rgba(18,14,11,.18) 100%),
            linear-gradient(125deg, #4a4038, #2a2420);
          background-size: cover;
          background-position: center;
        }
        .ef-hero-inner { position: relative; z-index: 2; max-width: 760px; }
        .ef-hero-fly {
          position: absolute;
          top: 32px;
          right: 44px;
          height: 48px;
          width: auto;
          image-rendering: pixelated;
          opacity: .85;
          z-index: 3;
        }
        .ef-kicker {
          font-family: Inter, system-ui, sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 1px 8px rgba(0,0,0,.5);
          margin-bottom: 22px;
        }
        .ef-h1 {
          max-width: 720px;
          margin: 0;
          font-size: clamp(56px, 7.5vw, 98px);
          line-height: .92;
          letter-spacing: -.025em;
          color: #fff;
          text-shadow: 0 2px 24px rgba(0,0,0,.7), 0 1px 6px rgba(0,0,0,.5);
          transition: color .15s;
        }
        .ef-h1:hover { color: #fff; }
        .ef-dek {
          max-width: 560px;
          margin: 26px 0 30px;
          font-size: 25px;
          line-height: 1.35;
          font-style: italic;
          color: #fff;
          text-shadow: 0 1px 10px rgba(0,0,0,.5);
        }
        .ef-meta {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          font-family: Inter, system-ui, sans-serif;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #fff;
          text-shadow: 0 1px 8px rgba(0,0,0,.5);
        }
        .ef-read-link {
          display: inline-block;
          margin-top: 32px;
          color: #fff;
          font-size: 23px;
          border-bottom: 1px solid rgba(255,255,255,.5);
          text-shadow: 0 1px 8px rgba(0,0,0,.5);
        }

        /* CARDS SECTION */
        .ef-section { padding: 70px 7vw 86px; background: var(--paper); }
        .ef-section-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 30px;
          border-bottom: 1px solid var(--ink);
          padding-bottom: 26px;
          margin-bottom: 32px;
        }
        .ef-section-head h2 {
          margin: 0;
          font-size: 38px;
          line-height: 1;
          letter-spacing: -.03em;
        }
        .ef-section-head a {
          color: var(--red);
          font-size: 20px;
          font-style: italic;
        }
        .ef-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 34px;
        }
        .ef-card {
          border-right: 1px solid var(--line);
          padding-right: 28px;
        }
        .ef-card:last-child { border-right: 0; padding-right: 0; }
        .ef-thumb {
          aspect-ratio: 1.35 / 1;
          margin-bottom: 24px;
          background: var(--paper-dark);
          overflow: hidden;
          display: block;
        }
        .ef-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
        .ef-thumb:hover img { transform: scale(1.03); }
        .ef-label {
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .22em;
          color: var(--red);
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .ef-card h3 {
          margin: 0 0 10px;
          font-size: 29px;
          line-height: 1.05;
          letter-spacing: -.025em;
          transition: color .15s;
          cursor: pointer;
        }
        .ef-card h3:hover { color: var(--red); }
        .ef-byline {
          margin-bottom: 14px;
          font-size: 20px;
          font-style: italic;
          color: var(--ink);
        }
        .ef-excerpt {
          font-size: 19px;
          line-height: 1.45;
          color: #3f3934;
        }
        .ef-time {
          margin-top: 26px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        /* ONE-SITTING */
        .ef-reads {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 50px;
          padding: 58px 7vw;
          background: var(--red);
          color: #fbf6ee;
        }
        .ef-reads-label {
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .ef-reads h2 {
          margin: 0;
          max-width: 520px;
          font-size: 42px;
          line-height: 1.08;
          letter-spacing: -.025em;
        }
        .ef-circles { display: flex; gap: 28px; }
        .ef-circle {
          width: 92px;
          height: 92px;
          border: 1px solid #fbf6ee;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          text-align: center;
          font-family: Inter, system-ui, sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
          cursor: pointer;
          background: transparent;
          border: 1px solid #fbf6ee;
          color: #fbf6ee;
          transition: all .15s;
        }
        .ef-circle.active { background: #fbf6ee; color: var(--ink); border-color: #fbf6ee; }
        .ef-circle strong {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 32px;
          line-height: 1;
          letter-spacing: 0;
          font-weight: 700;
          height: 32px;
          width: 100%;
        }
        .ef-circle span { display: block; }

        /* FOOTER */
        .ef-footer {
          padding: 46px 7vw 34px;
          background: #fbf6ee;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .ef-footer-fly { margin-bottom: 20px; }
        .ef-footer-fly img {
          height: 34px;
          width: auto;
          image-rendering: pixelated;
          filter: brightness(0);
          opacity: .65;
          display: block;
        }
        .ef-footer-links {
          display: flex;
          gap: 34px;
          justify-content: center;
          flex-wrap: wrap;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }
        .ef-footer-copy {
          margin-top: 26px;
          text-align: center;
          font-size: 16px;
          color: var(--ink);
        }

        /* MOBILE */
        @media (max-width: 900px) {
          .ef-nav {
            height: auto;
            padding: 0 20px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
          }
          .ef-nav-group, .ef-nav-group.right { display: none; }
          .ef-toggle {
            display: flex;
            flex-direction: column;
            gap: 5px;
            background: none;
            border: none;
            cursor: pointer;
            padding: 8px 8px 8px 0;
            order: 1;
          }
          .ef-toggle span {
            display: block;
            width: 22px;
            height: 1.5px;
            background: var(--ink);
            transition: all .2s;
          }
          .ef-logo { flex: 1; text-align: center; padding: 16px 0; order: 2; }
          .ef-logo img { height: 40px; margin: 0 auto; }
          .ef-mob-sub {
            display: block;
            order: 3;
            font-family: Inter, system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: #fff;
            background: var(--red);
            padding: 7px 12px;
            border-radius: 2px;
          }
          .ef-drawer {
            flex-direction: column;
            width: 100%;
            order: 4;
            border-top: 1px solid var(--line);
            padding: 12px 0 24px;
          }
          .ef-drawer a {
            font-family: Inter, system-ui, sans-serif;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: .14em;
            text-transform: uppercase;
            color: var(--ink);
            padding: 16px 4px;
            display: block;
          }
          .ef-drawer-search {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--line);
            margin-bottom: 4px;
            padding: 12px 4px;
          }
          .ef-drawer-search input {
            flex: 1;
            border: none;
            outline: none;
            background: transparent;
            font-family: Inter, system-ui, sans-serif;
            font-size: 14px;
            font-weight: 600;
            color: var(--ink);
          }
          .ef-drawer-search input::placeholder {
            color: var(--line);
            font-weight: 500;
          }
          .ef-drawer-search svg { flex-shrink: 0; color: var(--ink); }
          .ef-nav.open .ef-drawer { display: flex; }
          .ef-nav.open .ef-toggle span:nth-child(1) { transform: translateY(6.5px) rotate(45deg); }
          .ef-nav.open .ef-toggle span:nth-child(2) { opacity: 0; }
          .ef-nav.open .ef-toggle span:nth-child(3) { transform: translateY(-6.5px) rotate(-45deg); }

          .ef-hero { min-height: 520px; padding: 40px 24px 44px; }
          .ef-h1 { font-size: clamp(40px, 11vw, 58px); }
          .ef-dek { font-size: 19px; margin: 18px 0 20px; }
          .ef-meta { font-size: 11px; gap: 10px; }
          .ef-read-link { margin-top: 24px; font-size: 19px; }

          .ef-section { padding: 40px 24px 48px; }
          .ef-section-head { flex-direction: column; align-items: flex-start; gap: 10px; padding-bottom: 16px; margin-bottom: 22px; }
          .ef-section-head h2 { font-size: 28px; }
          .ef-grid { grid-template-columns: 1fr; gap: 0; }
          .ef-card { border-right: 0; border-bottom: 1px solid var(--line); padding: 28px 0; }
          .ef-card:first-child { padding-top: 0; }
          .ef-card:last-child { border-bottom: 0; padding-bottom: 0; }
          .ef-card h3 { font-size: 26px; }
          .ef-thumb { aspect-ratio: 16 / 7; }

          .ef-reads { grid-template-columns: 1fr; gap: 28px; padding: 40px 24px; }
          .ef-reads h2 { font-size: 30px; }
          .ef-circles { gap: 12px; justify-content: center; }
          .ef-circle { width: 76px; height: 76px; }
          .ef-circle strong { font-size: 26px; height: 26px; }

          .ef-footer { padding: 36px 24px 28px; }
          .ef-footer-links { justify-content: center; flex-wrap: wrap; gap: 24px; }

          .ef-section-tabs {
            display: flex;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            gap: 8px;
            padding: 10px 20px;
            background: var(--paper);
            border-bottom: 1px solid var(--line);
          }
          .ef-section-tabs::-webkit-scrollbar { display: none; }
          .ef-section-tabs a {
            flex-shrink: 0;
            font-family: Inter, system-ui, sans-serif;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: .14em;
            text-transform: uppercase;
            padding: 6px 14px;
            border: 1px solid var(--line);
            border-radius: 999px;
            color: var(--ink);
            white-space: nowrap;
          }
          .ef-section-tabs a:active { background: var(--ink); color: #fbf6ee; }
        }
      `}</style>

      {/* NAV */}
      <header className={`ef-nav${menuOpen ? " open" : ""}`}>
        <nav className="ef-nav-group">
          <Link href="/?tab=About">About</Link>
          <Link href="/">The Latest</Link>
          <a href="https://gangrey.com" target="_blank" rel="noopener noreferrer">Gangrey</a>
        </nav>

        <button
          className="ef-logo"
          onClick={onMastheadClick}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          aria-label="Home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Crimson Wordmark.png" alt="efemera" />
        </button>

        <nav className="ef-nav-group right">
          <Link href="/?tab=Archive">Archive</Link>
          <a href="/store">Store</a>
          <a href="#subscribe" className="ef-nav-cta">Subscribe</a>
        </nav>

        {/* Mobile controls */}
        <button
          className="ef-toggle"
          aria-label="Menu"
          onClick={() => setMenuOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
        <a href="#subscribe" className="ef-mob-sub">Subscribe</a>
        <div className="ef-drawer">
          <form className="ef-drawer-search" onSubmit={e => { e.preventDefault(); if (searchQ.trim()) { router.push(`/?q=${encodeURIComponent(searchQ.trim())}`); setMenuOpen(false); setSearchQ(""); } }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="search"
              placeholder="Search stories…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoComplete="off"
            />
          </form>
          <Link href="/?tab=About" onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/" onClick={() => setMenuOpen(false)}>The Latest</Link>
          <a href="https://gangrey.com" target="_blank" rel="noopener noreferrer">Gangrey</a>
          <Link href="/?tab=Archive" onClick={() => setMenuOpen(false)}>Archive</Link>
          <a href="/store">Store</a>
        </div>
      </header>

{/* HERO */}
      {hero && (
        <section
          className="ef-hero"
          style={heroImg ? { backgroundImage: `linear-gradient(to top, rgba(18,14,11,.85) 0%, rgba(18,14,11,.48) 42%, rgba(18,14,11,.18) 100%), url(${heroImg})` } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/mayfly-icon.webp" alt="" className="ef-hero-fly" />
          <div className="ef-hero-inner">
            <div className="ef-kicker">Worth Your Time</div>
            <Link href={`/stories/${hero.slug}`} style={{ outline: "none" }}>
              <h1 className="ef-h1">{hero.headline}</h1>
            </Link>
            {hero.subheadline && <p className="ef-dek">{hero.subheadline}</p>}
            <div className="ef-meta">
              <span>{hero.byline}</span>
              <span>·</span>
              <span>{formatDate(hero.date)}</span>
              <span>·</span>
              <span>{readingTime(portableToPlainText(hero.body))} Min Read</span>
            </div>
            <Link href={`/stories/${hero.slug}`} className="ef-read-link">Continue reading →</Link>
          </div>
        </section>
      )}

      {/* CARDS */}
      {cards.length > 0 && (
        <section className="ef-section">
          <div className="ef-section-head">
            <h2>Latest from the Collective</h2>
            <Link href="/stories">View all stories →</Link>
          </div>
          <div className="ef-grid">
            {cards.map(post => {
              const plain = portableToPlainText(post.body);
              const imgSrc = post.image?.asset
                ? urlFor(post.image.asset).width(600).height(445).fit("crop").auto("format").url()
                : null;
              return (
                <article key={post._id} className="ef-card">
                  <Link href={`/stories/${post.slug}`} className="ef-thumb">
                    {imgSrc
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={imgSrc} alt={post.image?.alt ?? post.headline} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <div style={{ width: "100%", height: "100%", background: "var(--paper-dark)" }} />
                    }
                  </Link>
                  <div className="ef-label">{sectionLabel(post.section)}</div>
                  <h3>
                    <Link href={`/stories/${post.slug}`}>{post.headline}</Link>
                  </h3>
                  <div className="ef-byline">{post.byline}</div>
                  {post.subheadline && <p className="ef-excerpt">{truncate(post.subheadline, 160)}</p>}
                  <div className="ef-time">{readingTime(plain)} Min Read</div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ONE-SITTING READS */}
      <section className="ef-reads" id="subscribe">
        <div>
          <div className="ef-reads-label">One-Sitting Reads</div>
          <h2>True stories for the time you have.</h2>
        </div>
        <div className="ef-circles">
          {[3, 5, 8, 12].map(m => (
            <button
              key={m}
              className={`ef-circle${activeMin === m ? " active" : ""}`}
              onClick={() => setActiveMin(m)}
            >
              <strong>{m}</strong>
              <span>Min</span>
            </button>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="ef-footer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="ef-footer-fly"><img src="/mayfly-icon.webp" alt="" /></div>
        <nav className="ef-footer-links">
          <Link href="/?tab=About">Masthead</Link>
          <a href="mailto:hello@efemera.co">Submit</a>
          <a href="#subscribe">Subscribe</a>
        </nav>
        <p className="ef-footer-copy">© 2026 Efemera. A Literary Collective by Yacob Reyes.</p>
      </footer>
    </>
  );
}
