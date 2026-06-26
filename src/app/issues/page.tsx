import type { Metadata } from "next";
import Link from "next/link";
import { getAllIssues } from "@/lib/sanity";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Issues — Gangrey",
  description: "Every newsletter issue from Gangrey, a literary magazine.",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function IssuesPage() {
  let issues = [] as Awaited<ReturnType<typeof getAllIssues>>;
  try { issues = await getAllIssues(); } catch {}

  return (
    <div className="issues-page">
      <style>{`
        .issues-page { min-height: 100vh; display: flex; flex-direction: column; background: #ffffff; color: #000000; }
        .issues-main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 64px 44px 88px; box-sizing: border-box; flex: 1; }
        .issues-head { border-bottom: 1px solid #000000; padding-bottom: 24px; margin-bottom: 40px; }
        .issues-kicker {
          font-family: var(--font-subhead);
          font-size: 12px; font-weight: 800; letter-spacing: .22em; text-transform: uppercase;
          color: #490000; margin-bottom: 14px;
        }
        .issues-title {
          font-family: var(--font-headline);
          font-size: clamp(44px, 7vw, 72px); line-height: .98; letter-spacing: -.03em; margin: 0;
        }
        .issues-list { display: flex; flex-direction: column; gap: 0; max-width: 760px; }
        .issue-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 24px;
          padding: 28px 0;
          border-bottom: 1px solid #b8b8ba;
          text-decoration: none;
          color: inherit;
        }
        .issue-row:first-child { padding-top: 0; }
        .issue-left { flex: 1; }
        .issue-number {
          font-family: var(--font-subhead);
          font-size: 11px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase;
          color: #490000; margin-bottom: 8px;
        }
        .issue-title {
          font-family: var(--font-headline);
          font-size: 26px; font-weight: 700; line-height: 1.15; margin: 0 0 6px;
        }
        .issue-desc {
          font-family: var(--font-headline);
          font-size: 18px; font-style: italic; color: #000000; margin: 0; line-height: 1.4;
        }
        .issue-date {
          font-family: var(--font-subhead);
          font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
          color: #000000; white-space: nowrap;
        }
        .issue-arrow { color: #490000; font-size: 18px; margin-left: 8px; }
        .issues-empty {
          font-family: var(--font-headline);
          font-size: 22px; font-style: italic; color: #000000;
        }
        @media (max-width: 900px) {
          .issues-main { padding: 40px 24px 64px; }
          .issue-row { flex-direction: column; gap: 12px; }
          .issue-date { align-self: flex-start; }
        }
      `}</style>
      <MagHeader />
      <main className="issues-main">
        <div className="issues-head">
          <h1 className="issues-title">We&rsquo;ve got issues</h1>
        </div>
        {issues.length > 0 ? (
          <div className="issues-list">
            {issues.map(issue => {
              const internalHref = issue.newsletterId && issue.slug ? `/issues/${issue.slug}` : null;
              const inner = (
                <>
                  <div className="issue-left">
                    <div className="issue-number">No. {issue.number}</div>
                    <h2 className="issue-title">{issue.title}</h2>
                    {issue.description && <p className="issue-desc">{issue.description}</p>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="issue-date">{formatDate(issue.publishedAt)}</span>
                    <span className="issue-arrow">→</span>
                  </div>
                </>
              );
              if (internalHref) {
                return <Link key={issue._id} href={internalHref} className="issue-row">{inner}</Link>;
              }
              if (issue.url) {
                return <a key={issue._id} href={issue.url} target="_blank" rel="noopener noreferrer" className="issue-row">{inner}</a>;
              }
              return (
                <div key={issue._id} className="issue-row" style={{ cursor: "default" }}>
                  <div className="issue-left">
                    <div className="issue-number">No. {issue.number}</div>
                    <h2 className="issue-title">{issue.title}</h2>
                    {issue.description && <p className="issue-desc">{issue.description}</p>}
                  </div>
                  <span className="issue-date">{formatDate(issue.publishedAt)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="issues-empty">Issues coming soon.</p>
        )}
      </main>
      <MagFooter />
    </div>
  );
}
