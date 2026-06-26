import type { Metadata } from "next";
import { getPostsLight } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";
import StoryCardGrid from "@/components/StoryCardGrid";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "The Latest — Gangrey",
  description: "The newest writing from Gangrey.",
};

export default async function LatestPage() {
  let posts = [] as Awaited<ReturnType<typeof getPostsLight>>;
  try { posts = await getPostsLight(); } catch {}
  const published = posts.filter(p =>
    (!p.status || p.status === "published" ||
    (p.status === "scheduled" && p.scheduledAt && new Date(p.scheduledAt) <= new Date())) &&
    p.section !== "Gangrey Redux"
  );

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
        .listing-sub {
          font-family: var(--font-headline);
          font-size: clamp(20px, 3vw, 28px); color: #000000;
          margin: 14px 0 0;
        }
        .listing-empty { font-family: var(--font-headline); font-size: 22px; font-style: italic; color: #000000; }
        @media (max-width: 900px) { .listing-main { padding: 40px 24px 64px; } }
      `}</style>
      <MagHeader />
      <main className="listing-main">
        <div className="listing-head">
          <h1 className="listing-title">The Latest</h1>
          <p className="listing-sub">The newest voices and stories from Gangrey.</p>
        </div>
        {published.length > 0
          ? <StoryCardGrid posts={published} />
          : <p className="listing-empty">No stories yet.</p>}
      </main>
      <MagFooter />
    </div>
  );
}
