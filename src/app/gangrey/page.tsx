import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/sanity";
import { plainTextFromBlocks, postReadingTime } from "@/lib/readingTime";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "From Gangrey — Efemera",
  description: "A second life for stories first published on the now-defunct Gangrey.com.",
};

function truncate(s: string, n = 180) { return s.length <= n ? s : s.slice(0, n).trimEnd() + "…"; }

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export default async function GangreyPage() {
  let posts = [] as Awaited<ReturnType<typeof getAllPosts>>;
  try { posts = await getAllPosts(); } catch {}

  const gangrey = posts
    .filter(p => {
      const pub = !p.status || p.status === "published" ||
        (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date());
      return pub && String(p.section).toLowerCase().includes("gangrey");
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by year
  const byYear: Record<string, typeof gangrey> = {};
  for (const p of gangrey) {
    const y = new Date(p.date).getUTCFullYear().toString();
    (byYear[y] = byYear[y] ?? []).push(p);
  }
  const years = Object.keys(byYear).sort((a, b) => +b - +a);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5efe4", color: "#171412" }}>
      <style>{`
        .gr-wrap { width: 100%; max-width: 1100px; margin: 0 auto; padding: 64px 44px 100px; box-sizing: border-box; flex: 1; }
        .gr-head { margin-bottom: 64px; }
        .gr-kicker { font-family: Inter, system-ui, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #8e0d0d; margin-bottom: 16px; }
        .gr-title { font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(48px, 7vw, 80px); line-height: .95; letter-spacing: -.035em; margin: 0 0 20px; }
        .gr-sub { font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(18px, 2.5vw, 24px); color: #5a5048; margin: 0; line-height: 1.4; max-width: 560px; }
        .gr-stats { font-family: Inter, system-ui, sans-serif; font-size: 12px; color: #8a7f6f; letter-spacing: .08em; margin-top: 20px; }
        .gr-year-nav { display: flex; flex-wrap: wrap; gap: 6px 4px; margin-top: 28px; }
        .gr-year-nav a { font-family: Inter, system-ui, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #5a5048; text-decoration: none; padding: 5px 10px; border: 1px solid #cfc3b3; border-radius: 2px; transition: background .15s, color .15s, border-color .15s; }
        .gr-year-nav a:hover { background: #8e0d0d; color: #fff; border-color: #8e0d0d; }

        .gr-year-block { display: grid; grid-template-columns: 100px 1fr; gap: 0 48px; margin-bottom: 0; }
        .gr-year-block + .gr-year-block { border-top: 1px solid #cfc3b3; }
        .gr-year-col { padding-top: 32px; }
        .gr-year-label {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 56px; font-weight: 700; line-height: 1;
          color: #d4c9b8; letter-spacing: -.04em;
          position: sticky; top: 20px;
        }
        .gr-stories { border-left: 1px solid #cfc3b3; }
        .gr-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 0 32px;
          padding: 28px 0 28px 40px;
          border-bottom: 1px solid #e8e0d4;
          align-items: start;
          transition: background .15s;
        }
        .gr-row:hover { background: #ede7dc; }
        .gr-row:last-child { border-bottom: none; }
        .gr-row-left {}
        .gr-date { font-family: Inter, system-ui, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; color: #8a7f6f; text-transform: uppercase; margin-bottom: 10px; }
        .gr-headline {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(22px, 2.8vw, 32px); line-height: 1.05;
          letter-spacing: -.02em; color: #171412; text-decoration: none;
          display: block; margin-bottom: 6px;
          transition: color .15s;
        }
        .gr-row:hover .gr-headline { color: #8e0d0d; }
        .gr-byline { font-family: "Cormorant Garamond", Georgia, serif; font-size: 17px; font-style: italic; color: #5a5048; margin-bottom: 10px; }
        .gr-excerpt { font-family: "Cormorant Garamond", Georgia, serif; font-size: 17px; line-height: 1.55; color: #3d3530; margin: 0; }
        .gr-row-right { padding-top: 4px; text-align: right; white-space: nowrap; }
        .gr-time { font-family: Inter, system-ui, sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #8e0d0d; }

        @media (max-width: 760px) {
          .gr-wrap { padding: 40px 20px 72px; }
          .gr-year-block { grid-template-columns: 1fr; gap: 0; }
          .gr-year-col { padding-top: 24px; padding-bottom: 8px; }
          .gr-year-label { font-size: 40px; position: static; }
          .gr-stories { border-left: none; border-top: 1px solid #cfc3b3; }
          .gr-row { padding: 20px 0; grid-template-columns: 1fr; gap: 8px; }
          .gr-row:hover { background: transparent; }
          .gr-row-right { text-align: left; }
        }
      `}</style>
      <MagHeader />
      <main className="gr-wrap">
        <div className="gr-head">
          <div className="gr-kicker">Archive</div>
          <h1 className="gr-title">From Gangrey</h1>
          <p className="gr-sub">A second life for stories first published on the now-defunct Gangrey.com.</p>
          {gangrey.length > 0 && <div className="gr-stats">{gangrey.length} stories · 2005 – 2016</div>}
          {years.length > 1 && (
            <nav className="gr-year-nav" aria-label="Jump to year">
              {years.map(y => <a key={y} href={`#year-${y}`}>{y}</a>)}
            </nav>
          )}
        </div>

        {gangrey.length === 0
          ? <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 22, fontStyle: "italic", color: "#6f655b" }}>No stories yet.</p>
          : years.map(year => (
          <div key={year} id={`year-${year}`} className="gr-year-block">
            <div className="gr-year-col">
              <div className="gr-year-label">{year}</div>
            </div>
            <div className="gr-stories">
              {byYear[year].map(post => {
                const plain = truncate(plainTextFromBlocks(post.body));
                return (
                  <div key={post._id} className="gr-row">
                    <div className="gr-row-left">
                      <div className="gr-date">{fmtDate(post.date)}</div>
                      <Link href={`/stories/${post.slug}`} className="gr-headline">{post.headline}</Link>
                      {post.byline && <div className="gr-byline">By {post.byline}</div>}
                      {plain && <p className="gr-excerpt">{plain}</p>}
                    </div>
                    <div className="gr-row-right">
                      <div className="gr-time">{postReadingTime(post)} min</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
      <MagFooter />
    </div>
  );
}
