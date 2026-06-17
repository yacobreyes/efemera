import { NextResponse } from "next/server";
import { renderNewsletterHtml, type NlCard } from "@/lib/newsletterEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sanityMutate(mutations: unknown[]) {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function sanityQuery(q: string) {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${encodeURIComponent(q)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { result } = await res.json();
  return result;
}

// Publishes + emails any scheduled newsletters whose time has passed.
async function sendDueNewsletters(): Promise<number> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM;
  const due: { _id: string; subject?: string; preview?: string; intro?: string; volume?: string; issue?: string; cards?: NlCard[] }[] =
    (await sanityQuery(`*[_type == "newsletter" && status == "scheduled" && scheduledAt <= now()]{ _id, subject, preview, intro, volume, issue, cards }`)) ?? [];
  if (!due.length) return 0;

  const subscribers: { email: string }[] = (await sanityQuery(`*[_type == "subscriber" && status == "active"]{ email }`)) ?? [];
  const emails = subscribers.map(s => s.email).filter(Boolean);

  for (const nl of due) {
    if (apiKey && from && emails.length) {
      const html = renderNewsletterHtml({ subject: nl.subject ?? "", preview: nl.preview ?? "", intro: nl.intro ?? "", volume: nl.volume ?? "", issue: nl.issue ?? "", cards: nl.cards ?? [] });
      for (let i = 0; i < emails.length; i += 50) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ from, to: from, bcc: emails.slice(i, i + 50), subject: nl.subject, html }),
        });
      }
    }
    await sanityMutate([{ patch: { id: nl._id, set: { status: "published", sentAt: new Date().toISOString() } } }]);
  }
  return due.length;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

  // Fetch all scheduled posts whose time has passed
  const query = encodeURIComponent(
    `*[_type == "post" && status == "scheduled" && scheduledAt <= now()]{ _id }`
  );
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/query/${dataset}?query=${query}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { result } = await res.json();

  let published = 0;
  if (result?.length) {
    const mutations = result.map((doc: { _id: string }) => ({
      patch: { id: doc._id, set: { status: "published" } },
    }));
    await sanityMutate(mutations);
    published = result.length;
  }

  const newslettersSent = await sendDueNewsletters();

  return NextResponse.json({ published, newslettersSent });
}
