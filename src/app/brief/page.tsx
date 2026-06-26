import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/sanity";
import { postReadingTime } from "@/lib/readingTime";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import StoryCardGrid from "@/components/StoryCardGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Life, in Brief — Gangrey",
  description: "Short reads, sized to your window. One-, three-, and five-minute stories from Gangrey.",
};

const BUCKETS = [
  { read: 1, label: "One-Minute Reads", match: (t: number) => t <= 1 },
  { read: 3, label: "Three-Minute Reads", match: (t: number) => t >= 2 && t <= 3 },
  { read: 5, label: "Five-Minute Reads", match: (t: number) => t >= 4 },
] as const;

export default async function BriefPage({ searchParams }: { searchParams: Promise<{ read?: string }> }) {
  const { read } = await searchParams;
  const active = BUCKETS.find(b => String(b.read) === read) ?? BUCKETS[0];

  let posts = [] as Awaited<ReturnType<typeof getAllPosts>>;
  try { posts = await getAllPosts(); } catch {}
  const published = posts.filter(p =>
    (!p.status || p.status === "published" ||
    (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date())) &&
    p.section !== "Gangrey Redux"
  );
  const matches = published.filter(p => active.match(postReadingTime(p)));

  return (
    <div className="listing-page">
      <style>{`
        .listing-page { min-height: 100vh; display: flex; flex-direction: column; background: #ffffff; color: #000000; }
        .listing-main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 64px 44px 88px; box-sizing: border-box; flex: 1; }
        .listing-head { border-bottom: 1px solid #000000; padding-bottom: 24px; margin-bottom: 40px; }
        .listing-kicker {
          font-family: var(--font-subhead);
          font-size: 12px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
          color: #490000; margin-bottom: 14px;
        }
        .listing-title {
          font-family: var(--font-headline);
          font-size: clamp(44px, 7vw, 72px); line-height: .98; letter-spacing: -.03em; margin: 0;
        }
        .brief-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 40px; }
        .brief-tab {
          font-family: var(--font-subhead);
          font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          padding: 9px 18px; border-radius: 999px; text-decoration: none;
          border: 1px solid #b8b8ba; color: #000000; transition: all .15s;
        }
        .brief-tab:hover { border-color: #490000; color: #490000; }
        .brief-tab.active { background: #490000; border-color: #490000; color: #ffffff; }
        .listing-empty { font-family: var(--font-headline); font-size: 22px; font-style: italic; color: #000000; }
        @media (max-width: 900px) { .listing-main { padding: 40px 24px 64px; } }
      `}</style>
      <MagHeader />
      <main className="listing-main">
        <div className="listing-head">
          <div className="listing-kicker">Life, in Brief</div>
          <h1 className="listing-title">{active.label}</h1>
        </div>
        <div className="brief-tabs">
          {BUCKETS.map(b => (
            <Link
              key={b.read}
              href={`/brief?read=${b.read}`}
              className={`brief-tab${b.read === active.read ? " active" : ""}`}
            >
              {b.read} Min
            </Link>
          ))}
        </div>
        {matches.length > 0
          ? <StoryCardGrid posts={matches} />
          : <p className="listing-empty">No {active.label.toLowerCase()} yet — check back soon.</p>}
      </main>
      <MagFooter />
    </div>
  );
}
