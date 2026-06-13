import Link from "next/link";
import type { Metadata } from "next";
import { getAllPostsCached } from "@/lib/sanity";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = { title: "Archive — Efemera" };
export const revalidate = 60;

export default async function ArchivePage() {
  let posts: Awaited<ReturnType<typeof getAllPostsCached>> = [];
  try {
    posts = await getAllPostsCached();
  } catch { /* no Sanity yet */ }

  const groups = new Map<string, typeof posts>();
  for (const post of posts) {
    const key = new Date(post.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f5f8fa" }}>
      <style>{`
        .story-header { display: flex; align-items: center; justify-content: space-between; }
        .story-nav { display: flex; gap: 2rem; align-items: center; }
        @media (max-width: 600px) {
          .story-header { flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: 0.75rem; padding: 0.75rem 1rem !important; }
          .story-nav { gap: 1rem; flex-wrap: wrap; justify-content: center; }
          .story-nav a { font-size: 0.78rem !important; }
          .archive-card { margin: 0.75rem auto 0 !important; width: calc(100% - 1.5rem) !important; padding: 1.25rem !important; }
        }
        .archive-link:hover { color: #8B0000 !important; }
      `}</style>
      <header className="story-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "#8B0000", padding: "0.6rem 1.5rem", boxShadow: "0 2px 6px rgba(0,0,0,0.3)" }}>
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Masthead.png" alt="efemera" style={{ height: "clamp(28px, 4vw, 44px)", width: "auto", display: "block" }} />
        </Link>
        <nav className="story-nav">
          {(["Home", "About", "Micro-Memoirs", "Narratives"] as const).map(s => (
            <Link key={s} href={s === "Home" ? "/" : `/?tab=${s}`} style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em" }}>{s}</Link>
          ))}
          <Link href="/archive" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.85rem", fontWeight: 700, color: "white", textDecoration: "none", letterSpacing: "0.05em", borderBottom: "1px solid white" }}>Archive</Link>
        </nav>
      </header>

      <div className="archive-card" style={{ maxWidth: 600, margin: "2rem auto 0", width: "100%", boxSizing: "border-box", background: "white", border: "1px solid #e1e8ed", borderRadius: 4, padding: "2rem" }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#1c2938", margin: "0 0 1.5rem" }}>Archive</h1>

        {groups.size === 0 && (
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#657786" }}>Nothing here yet.</p>
        )}

        {[...groups.entries()].map(([month, monthPosts]) => (
          <div key={month} style={{ marginBottom: "1.8rem" }}>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#8B0000", margin: "0 0 0.7rem", paddingBottom: "0.4rem", borderBottom: "1px solid #e1e8ed" }}>
              {month}
            </h2>
            {monthPosts.map(post => (
              <Link key={post._id} href={`/stories/${post.slug}`} style={{ display: "flex", gap: "1rem", alignItems: "baseline", textDecoration: "none", padding: "0.35rem 0" }}>
                <span style={{ fontFamily: "monospace", fontSize: "0.72rem", color: "#657786", flexShrink: 0, minWidth: 52 }}>
                  {new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
                </span>
                <span className="archive-link" style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.95rem", fontWeight: 600, color: "#1c2938", lineHeight: 1.4 }}>
                  {post.headline}
                </span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "0.65rem", color: "#657786", flexShrink: 0, marginLeft: "auto", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {post.section}
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>

      <SiteFooter />
    </div>
  );
}
