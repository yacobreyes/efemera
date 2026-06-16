"use server";

import { requireAuth } from "@/lib/adminAuth";
import { client } from "@/lib/sanity";
import { renderNewsletterHtml, type NlCard } from "@/lib/newsletterEmail";

function sanityConfig() {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing Sanity config — add SANITY_API_WRITE_TOKEN in Vercel env vars");
  return { token, projectId, dataset };
}

async function mutate(mutations: unknown[]) {
  const { token, projectId, dataset } = sanityConfig();
  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations }),
    }
  );
  if (!res.ok) throw new Error(`Sanity error: ${await res.text()}`);
  return res.json();
}

export type NlPickablePost = {
  id: string;
  slug: string;
  headline: string;
  status?: "draft" | "published" | "scheduled";
  body?: NlCard["body"];
  image?: { assetId: string; url: string; caption?: string; alt?: string } | null;
};

// Posts available to pull into a newsletter card. Excludes story-only fields
// (subheadline, byline, etc.) — only headline/body/image carry over.
export async function getPostsForNewsletter(): Promise<NlPickablePost[]> {
  await requireAuth();
  return client.fetch(
    `*[_type == "post" && !(_id in path("drafts.**")) && status != "trashed"] | order(_updatedAt desc){
      "id": _id, "slug": slug.current, headline, status, body,
      image{ "assetId": asset._ref, "url": asset->url, caption, alt }
    }`,
    {},
    { cache: "no-store" }
  );
}

export type NlVersion = {
  id: string;
  createdAt: string;
  type?: "autosave" | "publish";
  author?: string;
  subject?: string;
  preview?: string;
  wordCount?: number;
  cards?: NlCard[];
};

async function versionsFor(newsletterId: string): Promise<NlVersion[]> {
  const raw: ({ _id: string } & Record<string, unknown>)[] = await client.fetch(
    `*[_type == "newsletterVersion" && newsletterId == $id] | order(createdAt desc)[0...20]{ _id, createdAt, type, subject, preview, author, wordCount, cards }`,
    { id: newsletterId },
    { cache: "no-store" }
  );
  return (raw ?? []).map(({ _id, ...rest }) => ({ id: _id, ...rest })) as NlVersion[];
}

export type NlPayload = {
  id: string;
  subject?: string;
  preview?: string;
  author?: string;
  wordCount?: number;
  cards?: NlCard[];
  status?: "draft" | "published" | "scheduled";
  scheduledAt?: string;
};

// Creates or updates a newsletter document, then snapshots a (deduped) version.
export async function saveNewsletter(payload: NlPayload): Promise<{ id: string; versions: NlVersion[] }> {
  await requireAuth();
  const now = new Date().toISOString();
  const id = payload.id || `newsletter-${Date.now()}`;

  const existing = await client.fetch(
    `*[_id == $id][0]{ createdAt, status }`,
    { id },
    { cache: "no-store" }
  );

  const draftDoc: Record<string, unknown> = {
    _id: id,
    _type: "newsletter",
    subject: payload.subject ?? "",
    preview: payload.preview ?? "",
    author: payload.author ?? "Yacob Reyes",
    wordCount: payload.wordCount ?? 0,
    cards: payload.cards ?? [],
    status: payload.status ?? existing?.status ?? "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(payload.scheduledAt ? { scheduledAt: payload.scheduledAt } : {}),
  };
  await mutate([{ createOrReplace: draftDoc }]);

  // Snapshot a version unless nothing changed since the latest.
  const latest = await client.fetch(
    `*[_type == "newsletterVersion" && newsletterId == $id] | order(createdAt desc)[0]{ subject, preview, author, wordCount, cards }`,
    { id },
    { cache: "no-store" }
  );
  const sameAsLast = latest &&
    JSON.stringify({ subject: latest.subject, preview: latest.preview, author: latest.author, wordCount: latest.wordCount, cards: latest.cards }) ===
    JSON.stringify({ subject: payload.subject, preview: payload.preview, author: payload.author, wordCount: payload.wordCount, cards: payload.cards });

  if (!sameAsLast) {
    const versionDoc = {
      _id: `nlv-${id}-${Date.now()}`,
      _type: "newsletterVersion",
      newsletterId: id,
      createdAt: now,
      type: draftDoc.status === "published" ? "publish" : "autosave",
      subject: payload.subject ?? "",
      preview: payload.preview ?? "",
      author: payload.author ?? "Yacob Reyes",
      wordCount: payload.wordCount ?? 0,
      cards: payload.cards ?? [],
    };
    const stale: string[] = await client.fetch(
      `*[_type == "newsletterVersion" && newsletterId == $id] | order(createdAt desc)[19...100]._id`,
      { id },
      { cache: "no-store" }
    );
    await mutate([{ createOrReplace: versionDoc }, ...stale.map(sid => ({ delete: { id: sid } }))]);
  }

  return { id, versions: await versionsFor(id) };
}

export type Subscriber = { email: string; status?: "active" | "neutral" | "inactive"; createdAt?: string };

function subscriberId(email: string) {
  return "subscriber-" + email.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-");
}

// "active" = opened at least REQUIRED of the last LOOKBACK sends.
// "inactive" = opened none of them (despite LOOKBACK sends having gone out).
// "neutral" = everything in between, including brand-new subscribers with
// no sends yet to judge them by.
const OPEN_LOOKBACK = 3;
const OPEN_REQUIRED = 2;
function classifyByOpens(openedCount: number, lookbackCount: number): "active" | "neutral" | "inactive" {
  if (lookbackCount === 0) return "neutral";
  if (openedCount >= OPEN_REQUIRED) return "active";
  if (openedCount >= 1) return "neutral";
  return "inactive";
}

export async function getSubscribers(): Promise<Subscriber[]> {
  await requireAuth();
  await reconcileSubscriberStatuses();
  return client.fetch(
    `*[_type == "subscriber"] | order(createdAt desc){ email, status, createdAt }`,
    {},
    { cache: "no-store" }
  );
}

// Recomputes every subscriber's status from their tracked opens, so the
// dashboard always reflects real engagement rather than whatever status got
// set at signup or on a stale prior send.
async function reconcileSubscriberStatuses() {
  const [subs, recentSends]: [{ _id: string; status?: string; openedSends?: string[] }[], string[]] = await Promise.all([
    client.fetch(`*[_type == "subscriber"]{ _id, status, openedSends }`, {}, { cache: "no-store" }),
    client.fetch(`*[_type == "newsletter" && status == "published"] | order(sentAt desc)[0...${OPEN_LOOKBACK}]._id`, {}, { cache: "no-store" }),
  ]);
  const patches = subs
    .map(s => {
      const openedCount = recentSends.filter(sid => (s.openedSends ?? []).includes(sid)).length;
      const status = classifyByOpens(openedCount, recentSends.length);
      return status !== s.status ? { patch: { id: s._id, set: { status } } } : null;
    })
    .filter((p): p is { patch: { id: string; set: { status: "active" | "neutral" | "inactive" } } } => p !== null);
  if (patches.length) await mutate(patches);
}

export async function removeSubscriber(email: string) {
  await requireAuth();
  await mutate([{ delete: { id: subscriberId(email) } }]);
}

export async function getNewsletterVersions(id: string): Promise<NlVersion[]> {
  await requireAuth();
  return versionsFor(id);
}

export async function deleteNewsletter(id: string) {
  await requireAuth();
  const versionIds: string[] = await client.fetch(
    `*[_type == "newsletterVersion" && newsletterId == $id]._id`,
    { id },
    { cache: "no-store" }
  );
  await mutate([{ delete: { id } }, ...versionIds.map(vid => ({ delete: { id: vid } }))]);
}

// Sends a newsletter to every active subscriber via Resend.
// Gated on RESEND_API_KEY + NEWSLETTER_FROM — returns a clear error until they're set.
export async function sendNewsletter(id: string): Promise<{ ok: boolean; sent?: number; failed?: number; error?: string }> {
  await requireAuth();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM; // e.g. "Efemera <newsletter@efemera.blog>"
  if (!apiKey || !from) {
    return { ok: false, error: "Email sending isn't configured yet. Add RESEND_API_KEY and NEWSLETTER_FROM in Vercel env vars." };
  }
  if (!id) return { ok: false, error: "missing id" };

  const nl = await client.fetch(
    `*[_id == $id][0]{ subject, preview, author, cards }`,
    { id },
    { cache: "no-store" }
  );
  if (!nl) return { ok: false, error: "Newsletter not found" };
  if (!nl.subject?.trim()) return { ok: false, error: "Add a subject line before sending." };

  // Subscribers are sent to until they unsubscribe — "pending" subscribers
  // haven't opened an email yet and only flip to "active" once they do
  // (tracked via the open pixel below), so they must still receive sends.
  const subscribers: { email: string }[] = await client.fetch(
    `*[_type == "subscriber"]{ email }`,
    {},
    { cache: "no-store" }
  );
  if (!subscribers.length) return { ok: false, error: "No subscribers to send to yet." };

  const baseHtml = renderNewsletterHtml({
    subject: nl.subject,
    preview: nl.preview ?? "",
    cards: (nl.cards ?? []) as NlCard[],
  });
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://efemera.vercel.app").replace(/\/$/, "");

  // Resend's batch endpoint allows up to 100 distinct emails per call. Each
  // recipient gets their own open-tracking pixel so we know who's engaged.
  const emails = subscribers.map(s => s.email).filter(Boolean);
  const chunks: string[][] = [];
  for (let i = 0; i < emails.length; i += 100) chunks.push(emails.slice(i, i + 100));

  let sent = 0;
  const errors: string[] = [];
  for (const chunk of chunks) {
    const batch = chunk.map(email => ({
      from,
      to: [email],
      subject: nl.subject,
      html: `${baseHtml}<img src="${siteUrl}/api/track-open?id=${encodeURIComponent(subscriberId(email))}&nid=${encodeURIComponent(id)}" width="1" height="1" alt="" style="display:none" />`,
    }));
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += chunk.length;
    else errors.push(await res.text());
  }

  if (errors.length && sent === 0) return { ok: false, error: `Send failed: ${errors[0]}` };
  // Mark as published/sent so the dashboard reflects it.
  try {
    await mutate([{ patch: { id, set: { status: "published", sentAt: new Date().toISOString() } } }]);
  } catch {}
  return { ok: true, sent, failed: emails.length - sent };
}
