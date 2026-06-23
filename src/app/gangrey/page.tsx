import type { Metadata } from "next";
import { getAllPosts } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import GangreyArchive from "@/components/GangreyArchive";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "From Gangrey — Efemera",
  description: "A second life for stories first published on the now-defunct Gangrey.com.",
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
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5efe4", color: "#171412" }}>
      <style>{`
        .gr-wrap { width: 100%; max-width: 1100px; margin: 0 auto; padding: 64px 44px 100px; box-sizing: border-box; flex: 1; }
        .gr-head { margin-bottom: 48px; }
        .gr-kicker { font-family: Inter, system-ui, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; color: #8e0d0d; margin-bottom: 16px; }
        .gr-title { font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(48px, 7vw, 80px); line-height: .95; letter-spacing: -.035em; margin: 0 0 20px; }
        .gr-sub { font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(18px, 2.5vw, 24px); color: #5a5048; margin: 0; line-height: 1.4; max-width: 560px; }
        .gr-stats { font-family: Inter, system-ui, sans-serif; font-size: 12px; color: #8a7f6f; letter-spacing: .08em; margin-top: 20px; }
        @media (max-width: 760px) {
          .gr-wrap { padding: 40px 20px 72px; }
        }
      `}</style>
      <MagHeader />
      <main className="gr-wrap">
        <div className="gr-head">
          <div className="gr-kicker">Archive</div>
          <h1 className="gr-title">From Gangrey</h1>
          <p className="gr-sub">A second life for stories first published on the now-defunct Gangrey.com.</p>
          {gangrey.length > 0 && <div className="gr-stats">{gangrey.length} stories · 2005 – 2016</div>}
        </div>
        {gangrey.length === 0
          ? <p style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 22, fontStyle: "italic", color: "#6f655b" }}>No stories yet.</p>
          : <GangreyArchive posts={gangrey} />
        }
      </main>
      <MagFooter />
    </div>
  );
}
