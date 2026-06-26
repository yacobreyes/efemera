import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { renderNewsletterHtml, type NlCard } from "@/lib/newsletterEmail";

// Sends a newsletter to every active subscriber via Resend.
// Gated on RESEND_API_KEY + NEWSLETTER_FROM — returns a clear error until they're set.
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM; // e.g. "Gangrey <newsletter@gangrey.org>"
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: "Email sending isn't configured yet. Add RESEND_API_KEY and NEWSLETTER_FROM in Vercel env vars." },
      { status: 503 }
    );
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const nl = await client.fetch(
    `*[_id == $id][0]{ subject, preview, author, volume, issue, intro, cards }`,
    { id },
    { cache: "no-store" }
  );
  if (!nl) return NextResponse.json({ error: "Newsletter not found" }, { status: 404 });
  if (!nl.subject?.trim()) return NextResponse.json({ error: "Add a subject line before sending." }, { status: 400 });

  const subscribers: { email: string }[] = await client.fetch(
    `*[_type == "subscriber" && status == "active"]{ email }`,
    {},
    { cache: "no-store" }
  );
  if (!subscribers.length) {
    return NextResponse.json({ error: "No active subscribers to send to yet." }, { status: 400 });
  }

  const html = renderNewsletterHtml({
    subject: nl.subject,
    preview: nl.preview ?? "",
    intro: nl.intro ?? "",
    author: nl.author ?? "",
    volume: nl.volume ?? "",
    issue: nl.issue ?? "",
    cards: (nl.cards ?? []) as NlCard[],
  });

  // Resend allows up to 50 recipients per call — chunk into bcc batches.
  const emails = subscribers.map(s => s.email).filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += 50) chunks.push(emails.slice(i, i + 50));

  let sent = 0;
  const errors: string[] = [];
  for (const bcc of chunks) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: from, bcc, subject: nl.subject, html }),
    });
    if (res.ok) sent += bcc.length;
    else errors.push(await res.text());
  }

  if (errors.length && sent === 0) {
    return NextResponse.json({ error: `Send failed: ${errors[0]}` }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sent, failed: emails.length - sent });
}
