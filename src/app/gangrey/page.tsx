import type { Metadata } from "next";
import { getAllPosts } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import StoryCardGrid from "@/components/StoryCardGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Gangrey — Efemera",
  description: "Stories from Gangrey.",
};

export default async function GangreyPage() {
  let posts = [] as Awaited<ReturnType<typeof getAllPosts>>;
  try { posts = await getAllPosts(); } catch {}
  const gangrey = posts.filter(p => {
    const published = !p.status || p.status === "published" ||
      (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date());
    return published && (String(p.section).toLowerCase().includes("gangrey"));
  });

  return (
    <div className="listing-page">
      <style>{`
        .listing-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5efe4; color: #171412; }
        .listing-main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 64px 44px 88px; box-sizing: border-box; flex: 1; }
        .listing-head { border-bottom: 1px solid #171412; padding-bottom: 24px; margin-bottom: 40px; }
        .listing-title {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(44px, 7vw, 72px); line-height: .98; letter-spacing: -.03em; margin: 0;
        }
        .listing-sub {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(20px, 3vw, 28px); color: #171412; margin: 14px 0 0;
        }
        .listing-empty { font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; font-style: italic; color: #6f655b; }
        @media (max-width: 900px) { .listing-main { padding: 40px 24px 64px; } }
      `}</style>
      <MagHeader />
      <main className="listing-main">
        <div className="listing-head">
          <h1 className="listing-title">From Gangrey</h1>
          <p className="listing-sub">A second life for stories first published on the now-defunct Gangrey.com.</p>
        </div>
        {gangrey.length > 0
          ? <StoryCardGrid posts={gangrey} />
          : <p className="listing-empty">No Gangrey stories yet.</p>}
      </main>
      <MagFooter />
    </div>
  );
}
