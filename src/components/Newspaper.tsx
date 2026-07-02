"use client";

import Link from "next/link";
import type { SanityPost, SanityLately, SanityWelcome } from "@/lib/sanity";
import { urlFor } from "@/lib/sanityImage";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import { postReadingTime } from "@/lib/readingTime";

type Tab = "Home" | "About" | "Micro-Memoirs" | "Narratives" | "Essays" | "Archive";

function portableToPlainText(blocks: SanityPost["body"]): string {
  return blocks
    .filter(b => b._type === "block")
    .map(b => (b.children as { text: string }[]).map(c => c.text).join(""))
    .join(" ");
}

function sectionLabel(section: SanityPost["section"]) {
  if (section === "Archive") return "From the Archive";
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

  const isGangrey = (p: { section?: string }) => p.section === "Archive";
  const nonGangrey = published.filter(p => !isGangrey(p));

  const q = searchQuery.trim().toLowerCase();
  const searchResults = q
    ? published.filter(p =>
        p.headline.toLowerCase().includes(q) ||
        p.byline.toLowerCase().includes(q) ||
        p.subheadline?.toLowerCase().includes(q) ||
        (p.searchText ?? portableToPlainText(p.body)).toLowerCase().includes(q)
      )
    : [];

  const hero = nonGangrey[0];
  const cards = nonGangrey.slice(1, 4);
  const archiveFeature = published.find(p =>
    isGangrey(p) && (
      p.slug === "starting-somewhere" ||
      p.headline?.toLowerCase().includes("starting somewhere")
    )
  ) ?? null;
  const latestCards = [...cards, ...(archiveFeature ? [archiveFeature] : [])];

  const heroImg = hero?.image?.asset
    ? urlFor(hero.image.asset).width(1600).height(900).fit("crop").auto("format").url()
    : null;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; color: #000000; font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
        a { color: inherit; text-decoration: none; }

        /* HERO */
        .hm-hero-wrap { max-width: 1180px; margin: 0 auto; padding: 32px 44px 0; }
        .hm-hero {
          position: relative;
          display: block;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          color: #ffffff;
          background: linear-gradient(135deg, #4a3527 0%, #241a13 60%, #0f0b08 100%);
        }
        .hm-hero-img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; display: block;
        }
        .hm-hero-grain {
          position: absolute; inset: 0; opacity: .16;
          background-image: radial-gradient(rgba(255,255,255,.9) 1px, transparent 1.4px);
          background-size: 6px 6px;
          pointer-events: none;
        }
        .hm-hero-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(15,11,8,.92) 0%, rgba(15,11,8,.5) 42%, rgba(15,11,8,.1) 100%);
          pointer-events: none;
        }
        .hm-hero-credit {
          position: absolute; top: 16px; right: 22px;
          font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          color: #ffffff;
        }
        .hm-hero-content {
          position: absolute; left: 0; right: 0; bottom: 0;
          padding: 0 40px 44px;
          color: #ffffff;
        }
        .hm-kicker {
          display: inline-block; white-space: nowrap;
          background: #490000; color: #ffffff;
          font-family: var(--font-subhead);
          font-weight: 800; font-size: 11px; letter-spacing: .24em; text-transform: uppercase;
          padding: 7px 13px; margin-bottom: 24px;
        }
        .hm-h1 {
          margin: 0; max-width: 900px;
          font-family: var(--font-headline);
          font-size: clamp(56px, 6vw, 82px);
          line-height: .93; letter-spacing: -.03em; font-weight: 800;
          text-shadow: 0 2px 24px rgba(0,0,0,.55);
        }
        .hm-dek {
          margin: 22px 0 0; max-width: 600px;
          font-size: 24px; line-height: 1.38; font-style: italic;
          text-shadow: 0 1px 12px rgba(0,0,0,.5);
        }
        .hm-hero-meta {
          margin-top: 26px;
          display: flex; align-items: center; gap: 16px; white-space: nowrap;
          font-family: var(--font-subhead);
          font-weight: 700; font-size: 12px; letter-spacing: .16em; text-transform: uppercase;
        }
        .hm-hero-meta .hm-dot { opacity: .6; }

        /* LATEST */
        .hm-latest { max-width: 1180px; margin: 0 auto; padding: 52px 44px 60px; background: #ffffff; }
        .hm-latest-head {
          display: flex; align-items: baseline; justify-content: space-between;
          margin-bottom: 30px;
        }
        .hm-latest-head h2 {
          margin: 0;
          font-family: var(--font-headline);
          font-size: 26px; font-weight: 800; letter-spacing: -.02em;
        }
        .hm-latest-head a {
          font-size: 17px; font-style: italic; color: #490000;
        }
        .hm-grid {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr 1px 1fr;
          column-gap: 34px;
        }
        .hm-divider { border-left: 1px dotted #8a8a8c; }
        .hm-card { display: block; }
        .hm-thumb {
          display: block; width: 100%; aspect-ratio: 1.35 / 1;
          margin-bottom: 18px; background: #b8b8ba; overflow: hidden;
        }
        .hm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
        .hm-thumb:hover img { transform: scale(1.03); }
        .hm-label {
          font-family: var(--font-subhead);
          font-weight: 800; font-size: 11px; letter-spacing: .2em; text-transform: uppercase;
          color: #490000; margin-bottom: 10px;
        }
        .hm-card h3 {
          margin: 0 0 10px;
          font-family: var(--font-headline);
          font-size: 28px; line-height: 1.02; letter-spacing: -.02em; font-weight: 800;
        }
        .hm-byline { font-size: 18px; font-style: italic; margin-bottom: 0; }
        .hm-time {
          margin-top: 18px;
          font-family: var(--font-subhead);
          font-weight: 700; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase;
        }

        /* LIFE IN BRIEF */
        .hm-brief {
          display: grid; grid-template-columns: 1fr auto auto; align-items: center;
          gap: 48px; padding: 38px 76px;
          background: #490000; color: #ffffff;
        }
        .hm-brief-left { width: fit-content; }
        .hm-brief-title {
          font-family: var(--font-headline);
          font-size: 34px; font-weight: 800; line-height: 1.06; letter-spacing: -.02em;
          margin-bottom: 14px;
        }
        .hm-brief-sub { margin: 0; font-size: 18px; font-style: italic; }
        .hm-circles { display: flex; gap: 20px; }
        .hm-circle {
          width: 78px; height: 78px; border-radius: 50%; border: 1.5px solid #ffffff;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: #ffffff; cursor: pointer;
          background: transparent;
          transition: background .15s, color .15s;
        }
        .hm-circle:hover, .hm-circle:focus-visible {
          background: #ffffff; color: #490000;
        }
        .hm-circle strong {
          font-family: var(--font-subhead);
          font-size: 28px; font-weight: 800; line-height: 1;
        }
        .hm-circle span {
          font-family: var(--font-subhead);
          font-size: 10px; font-weight: 800; letter-spacing: .14em;
        }
        .hm-brief-caption {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          font-style: italic; font-size: 15px; text-align: center; line-height: 1.3;
          color: #ffffff;
        }
        .hm-brief-caption .hm-arrow { font-size: 24px; line-height: 1; }

        /* MOBILE */
        @media (max-width: 900px) {
          .hm-hero-wrap { padding: 20px 20px 0; }
          .hm-hero { aspect-ratio: auto; min-height: 460px; }
          .hm-hero-content { padding: 120px 20px 40px; position: relative; }
          .hm-hero-credit { right: 14px; }
          .hm-h1 { font-size: clamp(40px, 11vw, 58px); }
          .hm-dek { font-size: 19px; }
          .hm-hero-meta { flex-wrap: wrap; white-space: normal; gap: 10px; font-size: 11px; }

          .hm-latest { padding: 40px 24px 48px; }
          .hm-latest-head { flex-direction: column; align-items: flex-start; gap: 8px; margin-bottom: 22px; }
          .hm-grid { grid-template-columns: 1fr; column-gap: 0; }
          .hm-divider { border-left: 0; border-top: 1px dotted #8a8a8c; margin: 28px 0; }
          .hm-card h3 { font-size: 26px; }

          .hm-brief { grid-template-columns: 1fr; gap: 28px; padding: 40px 20px; justify-items: start; }
          .hm-circles { gap: 14px; }
          .hm-circle { width: 78px; height: 78px; }
          .hm-circle strong { font-size: 28px; }
          .hm-brief-caption { justify-content: flex-start; text-align: left; }
        }
      `}</style>

      <MagHeader onLogoClick={onMastheadClick} />

      {/* SEARCH RESULTS */}
      {q && (
        <section style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "56px 44px 72px", boxSizing: "border-box" }}>
          <div style={{ borderBottom: "1px solid #000000", paddingBottom: 20, marginBottom: 36 }}>
            <p style={{ fontFamily: "var(--font-subhead)", fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#490000", margin: "0 0 10px" }}>Search</p>
            <h1 style={{ fontFamily: 'var(--font-headline)', fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 800, lineHeight: .98, letterSpacing: "-.03em", margin: 0 }}>"{searchQuery}"</h1>
          </div>
          {searchResults.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {searchResults.map(p => (
                <Link key={p._id} href={`/stories/${p.slug}`} style={{ display: "block", padding: "28px 0", borderBottom: "1px dotted #8a8a8c", textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontFamily: "var(--font-subhead)", fontSize: 11, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", color: "#490000", marginBottom: 8 }}>{sectionLabel(p.section)}</div>
                  <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 6px", letterSpacing: "-.02em" }}>{p.headline}</h2>
                  {p.subheadline && <p style={{ fontFamily: 'var(--font-headline)', fontSize: 18, fontStyle: "italic", color: "#000000", margin: 0 }}>{p.subheadline}</p>}
                  <p style={{ fontFamily: "var(--font-subhead)", fontSize: 11, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#000000", margin: "10px 0 0" }}>By {p.byline}</p>
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
        <div className="hm-hero-wrap">
        <Link href={`/stories/${hero.slug}`} className="hm-hero">
          {heroImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="hm-hero-img" src={heroImg} alt={hero.image?.alt ?? hero.headline} />
          )}
          <div className="hm-hero-grain" />
          <div className="hm-hero-scrim" />
          {hero.image?.caption && <div className="hm-hero-credit">{hero.image.caption}</div>}
          <div className="hm-hero-content">
            <span className="hm-kicker">Worth Your Time</span>
            <h1 className="hm-h1">{hero.headline}</h1>
            {hero.subheadline && <p className="hm-dek">{hero.subheadline}</p>}
            <div className="hm-hero-meta">
              <span>By {hero.byline}</span>
              <span className="hm-dot">·</span>
              <span>{postReadingTime(hero)} Min Read</span>
            </div>
          </div>
        </Link>
        </div>
      )}

      {/* LATEST FROM THE MAGAZINE */}
      {!q && cards.length > 0 && (
        <section className="hm-latest">
          <div className="hm-latest-head">
            <h2>Latest from the Magazine</h2>
            <Link href="/latest">View all stories →</Link>
          </div>
          <div className="hm-grid">
            {latestCards.map((post, i) => {
              const imgSrc = post.image?.asset
                ? urlFor(post.image.asset).width(720).height(405).fit("crop").auto("format").url()
                : null;
              return (
                <div key={post._id} style={{ display: "contents" }}>
                  {i > 0 && <div className="hm-divider" />}
                  <Link href={`/stories/${post.slug}`} className="hm-card">
                    <article>
                      <span className="hm-thumb">
                        {imgSrc
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={imgSrc} alt={post.image?.alt ?? post.headline} />
                          : <span style={{ display: "block", width: "100%", height: "100%", background: "#b8b8ba" }} />
                        }
                      </span>
                      <div className="hm-label">{sectionLabel(post.section)}</div>
                      <h3>{post.headline}</h3>
                      <div className="hm-byline">{post.byline}</div>
                      <div className="hm-time">{postReadingTime(post)} Min Read</div>
                    </article>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* LIFE, IN BRIEF */}
      {!q && (
        <section className="hm-brief">
          <div className="hm-brief-left">
            <div className="hm-brief-title">Life, in Brief.</div>
            <p className="hm-brief-sub">Short on time? We've got you.</p>
          </div>
          <div className="hm-circles">
            {[1, 3, 5].map(m => (
              <Link key={m} href={`/brief/${m}`} className="hm-circle">
                <strong>{m}</strong>
                <span>MIN</span>
              </Link>
            ))}
          </div>
          <Link href="/brief/1" className="hm-brief-caption">
            <span className="hm-arrow">←</span>
            <span>Stories that fit<br />your window.</span>
          </Link>
        </section>
      )}

      <MagFooter />
    </>
  );
}
