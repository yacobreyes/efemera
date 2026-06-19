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
    return published && String(p.section).toLowerCase().includes("gangrey");
  });

  return (
    <div className="listing-page">
      <style>{`
        .listing-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5efe4; color: #171412; }
        .listing-main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 64px 44px 88px; box-sizing: border-box; flex: 1; }
        .listing-head { border-bottom: 1px solid #171412; padding-bottom: 24px; margin-bottom: 22px; }
        .listing-kicker {
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
          color: #8e0d0d; margin-bottom: 14px;
        }
        .listing-title {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: clamp(44px, 7vw, 72px); line-height: .98; letter-spacing: -.03em; margin: 0;
        }
        .listing-intro {
          font-family: "Cormorant Garamond", Georgia, serif;
          font-size: 22px; line-height: 1.4; font-style: italic; color: #463f37;
          max-width: 620px; margin: 0 0 40px;
        }
        .listing-empty { font-family: "Cormorant Garamond", Georgia, serif; font-size: 22px; font-style: italic; color: #6f655b; }
        @media (max-width: 900px) { .listing-main { padding: 40px 24px 64px; } }
      `}</style>
      <MagHeader />
      <main className="listing-main">
        <div className="listing-head">
          
          <h1 className="listing-title">From Gangrey</h1>
        </div>
        <p className="listing-intro">True stories in the narrative tradition.</p>
        {gangrey.length > 0
          ? <StoryCardGrid posts={gangrey} />
          : <p className="listing-empty">No Gangrey stories yet.</p>}
      </main>
      <MagFooter />
    </div>
  );
}
