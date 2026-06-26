import type { Metadata } from "next";
import { getAllPosts } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import GangreyArchive from "@/components/GangreyArchive";
import { normalizeHeadline } from "@/lib/gangreyDedup";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The Archive — Efemera",
  description: "Writing once featured on the now-defunct Gangrey.com.",
};

export default async function GangreyPage() {
  let posts = [] as Awaited<ReturnType<typeof getAllPosts>>;
  try { posts = await getAllPosts(); } catch {}

  const gangrey = posts
    .filter(p => {
      const pub = !p.status || p.status === "published" ||
        (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date());
      return pub && String(p.section).toLowerCase().includes("gangrey");
    })
    .sort((a, b) => {
      const dt = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dt !== 0) return dt;
      return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    });

  // Deduplicate by normalized headline — keep the entry with a byline, else the first seen.
  const seen = new Map<string, typeof gangrey[number]>();
  for (const p of gangrey) {
    const key = normalizeHeadline(p.headline);
    if (!key) continue;
    const prev = seen.get(key);
    if (!prev || (!prev.byline && p.byline)) seen.set(key, p);
  }
  const deduped = [...seen.values()].sort((a, b) => {
    const dt = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dt !== 0) return dt;
    return (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff", color: "#000000" }}>
      <style>{`
        .gr-wrap { width: 100%; max-width: 1100px; margin: 0 auto; padding: 64px 44px 100px; box-sizing: border-box; flex: 1; }
        .gr-head { margin-bottom: 48px; }
        .gr-kicker { font-family: var(--font-subhead); font-size: 11px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #490000; margin-bottom: 16px; }
        .gr-title { font-family: var(--font-headline); font-size: clamp(48px, 7vw, 80px); line-height: .95; letter-spacing: -.035em; margin: 0 0 20px; }
        .gr-sub { font-family: var(--font-subhead); font-size: clamp(18px, 2.5vw, 24px); color: #000000; margin: 0; line-height: 1.4; max-width: 560px; }
        .gr-stats { font-family: var(--font-subhead); font-size: 12px; color: #392a22; letter-spacing: .08em; margin-top: 20px; }
        @media (max-width: 760px) {
          .gr-wrap { padding: 40px 20px 72px; }
        }
      `}</style>
      <MagHeader />
      <main className="gr-wrap">
        <div className="gr-head">
          <h1 className="gr-title">The Archive</h1>
          <p className="gr-sub">Writing once featured on the original Gangrey.</p>
          {deduped.length > 0 && <div className="gr-stats">{deduped.length} stories · 2005 – 2016</div>}
        </div>
        {deduped.length === 0
          ? <p style={{ fontFamily: "var(--font-headline)", fontSize: 22, fontStyle: "italic", color: "#000000" }}>No stories yet.</p>
          : <GangreyArchive posts={deduped} />
        }
      </main>
      <MagFooter />
    </div>
  );
}
