"use client";

import Link from "next/link";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";
import { urlFor } from "@/lib/sanityImage";
import MagHeader from "@/components/MagHeader";
import SubscribeButton from "@/components/SubscribeButton";
import { postReadingTime } from "@/lib/readingTime";

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
  searchQuery = "",
}: {
  posts: SanityPost[];
  aboutParagraphs: string[];
  lately: SanityLately | null;
  welcome: SanityWelcome | null;
  initialTab: Tab;
  onMastheadClick?: () => void;
  searchQuery?: string;
}) {
  const published = posts.filter(p =>
    !p.status || p.status === "published" ||
    (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date())
  );

  const isGangrey = (p: { section?: string }) => p.section === "Gangrey Redux";
  const nonGangrey = published.filter(p => !isGangrey(p));
  const gangrey = published.filter(isGangrey);

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? published.filter(p =>
        p.headline.toLowerCase().includes(q) ||
        p.byline.toLowerCase().includes(q) ||
        p.subheadline?.toLowerCase().includes(q) ||
        portableToPlainText(p.body).toLowerCase().includes(q)
      )
    : [];

  const hero = nonGangrey[0];
  // 3 non-Gangrey cards + 1 Gangrey Redux card
  const cards = [...nonGangrey.slice(1, 4), ...(gangrey[0] ? [gangrey[0]] : [])];

  const heroImg = hero?.image?.asset
    ? urlFor(hero.image.asset).width(1400).height(600).fit("crop").auto("format").url()
    : null;

  return (
    <>
      <style>{`
        :root {
          --paper: #ffffff;
          --paper-dark: #b8b8ba;
          --ink: #000000;
          --red: #490000;
          --line: #b8b8ba;
        }
        * { box-sizing: border-box; }
        html { background: #ffffff; }
        body {
          margin: 0;
          background: #ffffff;
          color: var(--ink);
          font-family: var(--font-headline);
          -webkit-font-smoothing: antialiased;
        }
        a { color: inherit; text-decoration: none; }
        .ef-h1 a:focus { outline: none; }
        .ef-hero a:focus-visible { outline: 2px solid rgba(255,255,255,.6); outline-offset: 4px; }

        .ef-section-tabs { display: none; }

        /* HERO */
        .ef-hero {
          position: relative;
          min-height: 620px;
          display: flex;
          align-items: flex-end;
          padding: 80px 7vw;
          overflow: hidden;
          color: #ffffff;
          background:
            linear-gradient(to top, rgba(18,14,11,.85) 0%, rgba(18,14,11,.48) 42%, rgba(18,14,11,.18) 100%),
            linear-gradient(125deg, #392a22, #000000);
          background-size: cover;
          background-position: center;
        }
        .ef-hero-inner { position: relative; z-index: 2; max-width: 760px; }
.ef-kicker {
          font-family: var(--font-subhead);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .22em;
          text-transform: uppercase;
          color: #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,.5);
          margin-bottom: 22px;
        }
        .ef-h1 {
          max-width: 720px;
          margin: 0;
          font-size: clamp(56px, 7.5vw, 98px);
          line-height: .92;
          letter-spacing: -.025em;
          color: #ffffff;
          text-shadow: 0 2px 24px rgba(0,0,0,.7), 0 1px 6px rgba(0,0,0,.5);
          transition: color .15s;
        }
        .ef-h1:hover { color: #ffffff; }
        .ef-dek {
          max-width: 560px;
          margin: 26px 0 30px;
          font-size: 25px;
          line-height: 1.35;
          font-style: italic;
          color: #ffffff;
          text-shadow: 0 1px 10px rgba(0,0,0,.5);
        }
        .ef-meta {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          font-family: var(--font-subhead);
          font-size: 13px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,.5);
        }
        .ef-read-link {
          display: inline-block;
          margin-top: 32px;
          color: #ffffff;
          font-size: 23px;
          border-bottom: 1px solid #ffffff;
          text-shadow: 0 1px 8px rgba(0,0,0,.5);
        }

        /* CARDS SECTION */
        .ef-section { padding: 70px 7vw 86px; background: #ffffff; }
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
          color: #000000;
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
        .ef-card:last-child { border-right: 0; }
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
          font-family: var(--font-subhead);
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
          color: #392a22;
        }
        .ef-time {
          margin-top: 26px;
          font-family: var(--font-subhead);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        /* ONE-SITTING */
        .ef-reads {
          display: grid;
          grid-template-columns: 1fr auto auto;
          align-items: center;
          gap: 50px;
          padding: 58px 7vw;
          background: var(--red);
          color: #ffffff;
        }
        .ef-reads-left { width: fit-content; }
        .ef-reads-label {
          font-family: var(--font-headline);
          font-size: 30px; font-weight: 700; line-height: 1.1; letter-spacing: -.02em;
          margin-bottom: 10px;
        }
        .ef-reads-rule { width: 100%; height: 2px; background: #ffffff; border: 0; margin: 0 0 14px; }
        .ef-reads-sub {
          font-family: var(--font-headline);
          font-size: 17px; font-style: italic; color: #ffffff; margin: 0;
        }
        .ef-reads h2 { display: none; }
        .ef-circles { display: flex; gap: 20px; align-items: center; }
        .ef-circle {
          width: 88px; height: 88px; border-radius: 50%;
          border: 1.5px solid #ffffff; background: transparent; color: #ffffff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 3px; text-align: center;
          font-family: var(--font-subhead); font-size: 10px; font-weight: 800;
          letter-spacing: .12em; text-transform: uppercase; cursor: pointer; transition: all .15s;
        }
        .ef-circle { text-decoration: none; }
        .ef-circle:hover { background: #ffffff; color: var(--red); border-color: #ffffff; }
        .ef-circle strong {
          display: flex; align-items: flex-end; justify-content: center;
          font-family: var(--font-subhead);
          font-size: 32px; line-height: 1; letter-spacing: 0; font-weight: 800; height: 32px; width: 100%;
        }
        .ef-circle span { display: block; }
        .ef-reads-annotation {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          font-family: var(--font-headline);
          font-style: italic;
          font-size: 14px; color: #ffffff;
          text-align: center; line-height: 1.3; flex-shrink: 0;
        }

        /* FOOTER */
        .ef-footer {
          padding: 46px 7vw 34px;
          background: #b8b8ba;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
.ef-footer-links {
          display: flex;
          gap: 34px;
          justify-content: center;
          flex-wrap: wrap;
          font-family: var(--font-subhead);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
        }
        .ef-footer-links button {
          font: inherit;
          letter-spacing: inherit;
          text-transform: inherit;
          background: none;
          border: none;
          padding: 0;
          color: inherit;
          cursor: pointer;
        }
        .ef-footer-copy {
          margin-top: 26px;
          text-align: center;
          font-size: 16px;
          color: var(--ink);
        }

        /* MOBILE */
        @media (max-width: 900px) {
          .ef-hero { min-height: 520px; padding: 40px 24px 44px; }
          .ef-h1 { font-size: clamp(40px, 11vw, 58px); }
          .ef-dek { font-size: 19px; margin: 18px 0 20px; }
          .ef-meta { font-size: 11px; gap: 10px; }
          .ef-read-link { margin-top: 24px; font-size: 19px; }

          .ef-section { padding: 40px 24px 48px; }
          .ef-section-head { flex-direction: column; align-items: flex-start; gap: 10px; padding-bottom: 16px; margin-bottom: 22px; }
          .ef-section-head h2 { font-size: 28px; }
          .ef-section-head a { font-size: 13px; font-style: normal; font-family: var(--font-subhead); font-weight: 700; letter-spacing: .14em; text-transform: uppercase; padding: 10px 18px; border: 1px solid var(--red); border-radius: 2px; }
          .ef-grid { grid-template-columns: 1fr; gap: 0; }
          .ef-card { border-right: 0; border-bottom: 1px solid var(--line); padding: 28px 0; }
          .ef-card:first-child { padding-top: 0; }
          .ef-card:last-child { border-bottom: 0; padding-bottom: 0; }
          .ef-card h3 { font-size: 26px; }
          .ef-thumb { aspect-ratio: 16 / 7; }

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
            font-family: var(--font-subhead);
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
          .ef-section-tabs a:active { background: var(--ink); color: #ffffff; }
          .ef-reads { grid-template-columns: 1fr auto auto; gap: 12px; padding: 28px 20px; }
          .ef-reads-label { font-size: 22px; margin-bottom: 7px; }
          .ef-reads-sub { font-size: 14px; }
          .ef-reads-annotation { font-size: 12px; gap: 4px; }
          .ef-reads-annotation span[style] { font-size: 16px !important; }
          .ef-circles { gap: 12px; }
          .ef-circle { width: 72px; height: 72px; }
          .ef-circle strong { font-size: 26px; height: 26px; }
          .ef-reads-arrow { transform: rotate(90deg) scaleX(-1); }
        }
      `}</style>

      <MagHeader onLogoClick={onMastheadClick} />

      {/* SEARCH RESULTS */}
      {q && (
        <section style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "56px 44px 72px", boxSizing: "border-box" }}>
          <div style={{ borderBottom: "1px solid #000000", paddingBottom: 20, marginBottom: 36 }}>
            <p style={{ fontFamily: "var(--font-subhead)", fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#490000", margin: "0 0 10px" }}>Search</p>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: "clamp(36px, 5vw, 58px)", lineHeight: .98, letterSpacing: "-.03em", margin: 0 }}>"{searchQuery}"</h1>
          </div>
          {searchResults.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {searchResults.map(p => (
                <Link key={p._id} href={`/stories/${p.slug}`} style={{ display: "block", padding: "28px 0", borderBottom: "1px solid #b8b8ba", textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontFamily: "var(--font-subhead)", fontSize: 11, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", color: "#490000", marginBottom: 8 }}>{p.section}</div>
                  <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.1, margin: "0 0 6px", letterSpacing: "-.02em" }}>{p.headline}</h2>
                  {p.subheadline && <p style={{ fontFamily: 'var(--font-headline)', fontSize: 18, fontStyle: "italic", color: "#000000", margin: 0 }}>{p.subheadline}</p>}
                  <p style={{ fontFamily: "var(--font-subhead)", fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#000000", margin: "10px 0 0" }}>By {p.byline}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-headline)', fontSize: 22, fontStyle: "italic", color: "#000000" }}>No stories found for "{searchQuery}".</p>
          )}
        </section>
      )}

{/* HERO */}
      {!q && hero && (
        <section
          className="ef-hero"
          style={heroImg ? { backgroundImage: `linear-gradient(to top, rgba(18,14,11,.85) 0%, rgba(18,14,11,.48) 42%, rgba(18,14,11,.18) 100%), url(${heroImg})` } : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="ef-hero-inner">
            <div className="ef-kicker">Editor's Choice:</div>
            <Link href={`/stories/${hero.slug}`} style={{ outline: "none" }}>
              <h1 className="ef-h1">{hero.headline}</h1>
            </Link>
            {hero.subheadline && <p className="ef-dek">{hero.subheadline}</p>}
            <div className="ef-meta">
              <span>{hero.byline}</span>
              <span>·</span>
              <span>{formatDate(hero.date)}</span>
              <span>·</span>
              <span>{postReadingTime(hero)} Min Read</span>
            </div>
            <Link href={`/stories/${hero.slug}`} className="ef-read-link">Continue reading →</Link>
          </div>
        </section>
      )}

      {/* CARDS */}
      {!q && cards.length > 0 && (
        <section className="ef-section">
          <div className="ef-section-head">
            <h2>Latest from the Collective</h2>
            <Link href="/latest">View all stories →</Link>
          </div>
          <div className="ef-grid">
            {cards.map(post => {
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
                  <div className="ef-time">{postReadingTime(post)} Min Read</div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* LIFE IN BRIEF */}
      {!q && <section className="ef-reads">
        <div className="ef-reads-left">
          <div className="ef-reads-label">Life, in Brief.</div>
          <hr className="ef-reads-rule" />
          <p className="ef-reads-sub">Short on time? We've got you.</p>
        </div>
        <div className="ef-circles">
          {[1, 3, 5].map(m => (
            <Link
              key={m}
              href={`/brief?read=${m}`}
              className="ef-circle"
            >
              <strong>{m}</strong>
              <span>Min</span>
            </Link>
          ))}
        </div>
        <div className="ef-reads-annotation">
          <span>Stories that fit<br />your window.</span>
          <span style={{ fontSize: 22, lineHeight: 1, display: "block" }}>↵</span>
        </div>
      </section>}

      {/* FOOTER */}
      <footer className="ef-footer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <nav className="ef-footer-links">
          <Link href="/authors">Authors</Link>
          <a href="mailto:hello@efemera.co">Submit</a>
          <SubscribeButton>Subscribe</SubscribeButton>
        </nav>
        <p className="ef-footer-copy">© 2026 Gangrey | A Literary Magazine.</p>
      </footer>
    </>
  );
}
