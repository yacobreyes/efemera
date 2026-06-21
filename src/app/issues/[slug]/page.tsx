import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { client } from "@/lib/sanity";
import { renderNewsletterHtml, type NlCard } from "@/lib/newsletterEmail";
import MagHeader from "@/components/MagHeader";
import MagFooter from "@/components/MagFooter";

export const revalidate = 60;

type IssueDoc = { newsletterId?: string; title?: string; description?: string };
type NewsletterDoc = {
  subject?: string; preview?: string; intro?: string;
  author?: string; volume?: string; issue?: string; cards?: NlCard[];
};

async function getIssue(slug: string): Promise<IssueDoc | null> {
  return client.fetch(
    `*[_type == "issue" && slug.current == $slug][0]{ newsletterId, title, description }`,
    { slug },
    { next: { revalidate: 60 } }
  );
}

async function getNewsletter(id: string): Promise<NewsletterDoc | null> {
  return client.fetch(
    `*[_id == $id][0]{ subject, preview, intro, author, volume, issue, cards }`,
    { id },
    { next: { revalidate: 60 } }
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue) return { title: "Issue — Efemera" };
  return {
    title: `${issue.title ?? "Issue"} — Efemera`,
    description: issue.description ?? undefined,
  };
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const issue = await getIssue(slug);
  if (!issue?.newsletterId) notFound();
  const nl = await getNewsletter(issue.newsletterId);
  if (!nl) notFound();

  const html = renderNewsletterHtml({
    subject: nl.subject ?? "",
    preview: nl.preview ?? "",
    intro: nl.intro ?? "",
    author: nl.author ?? "",
    volume: nl.volume ?? "",
    issue: nl.issue ?? "",
    cards: (nl.cards ?? []) as NlCard[],
  });

  return (
    <div className="issue-read-page">
      <style>{`
        .issue-read-page { min-height: 100vh; display: flex; flex-direction: column; background: #f5efe4; color: #171412; }
        .issue-read-main { flex: 1; width: 100%; padding: 0; box-sizing: border-box; }
      `}</style>
      <MagHeader />
      <main className="issue-read-main">
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <MagFooter />
    </div>
  );
}
