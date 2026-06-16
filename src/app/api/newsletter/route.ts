import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";

function sanityConfig() {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) throw new Error("Missing Sanity config");
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

const NL_FIELDS = `_id, subject, preview, author, wordCount, cards, status, scheduledAt, createdAt, updatedAt, sentAt`;

async function versionsFor(newsletterId: string) {
  const raw: ({ _id: string } & Record<string, unknown>)[] = await client.fetch(
    `*[_type == "newsletterVersion" && newsletterId == $id] | order(createdAt desc)[0...20]{ _id, createdAt, subject, preview, author, wordCount, cards }`,
    { id: newsletterId },
    { cache: "no-store" }
  );
  return (raw ?? []).map(({ _id, ...rest }) => ({ id: _id, ...rest }));
}

// GET            → list all newsletters (for the dashboard)
// GET ?id=<id>   → a single newsletter draft + its version history
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const draft = await client.fetch(`*[_id == $id][0]{ ${NL_FIELDS} }`, { id }, { cache: "no-store" });
    const versions = await versionsFor(id);
    return NextResponse.json({ draft: draft ?? null, versions });
  }
  const list = await client.fetch(
    `*[_type == "newsletter"] | order(coalesce(updatedAt, createdAt) desc){ ${NL_FIELDS} }`,
    {},
    { cache: "no-store" }
  );
  return NextResponse.json({ newsletters: list ?? [] });
}

// POST { id?, subject, preview, author, wordCount, cards, status?, scheduledAt? }
// Creates or updates a newsletter document, then snapshots a version (deduped).
export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date().toISOString();
  const id: string = body.id || `newsletter-${Date.now()}`;

  // Preserve createdAt / status across updates.
  const existing = await client.fetch(
    `*[_id == $id][0]{ createdAt, status }`,
    { id },
    { cache: "no-store" }
  );

  const draftDoc: Record<string, unknown> = {
    _id: id,
    _type: "newsletter",
    subject: body.subject ?? "",
    preview: body.preview ?? "",
    author: body.author ?? "Yacob Reyes",
    wordCount: body.wordCount ?? 0,
    cards: body.cards ?? [],
    status: body.status ?? existing?.status ?? "draft",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(body.scheduledAt ? { scheduledAt: body.scheduledAt } : {}),
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
    JSON.stringify({ subject: body.subject, preview: body.preview, author: body.author, wordCount: body.wordCount, cards: body.cards });

  if (!sameAsLast) {
    const versionDoc = {
      _id: `nlv-${id}-${Date.now()}`,
      _type: "newsletterVersion",
      newsletterId: id,
      createdAt: now,
      subject: body.subject ?? "",
      preview: body.preview ?? "",
      author: body.author ?? "Yacob Reyes",
      wordCount: body.wordCount ?? 0,
      cards: body.cards ?? [],
    };
    const stale: string[] = await client.fetch(
      `*[_type == "newsletterVersion" && newsletterId == $id] | order(createdAt desc)[19...100]._id`,
      { id },
      { cache: "no-store" }
    );
    await mutate([{ createOrReplace: versionDoc }, ...stale.map(sid => ({ delete: { id: sid } }))]);
  }

  return NextResponse.json({ ok: true, id, versions: await versionsFor(id) }, { status: 200 });
}

// DELETE ?id=<id> → remove a newsletter and its versions
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });
  const versionIds: string[] = await client.fetch(
    `*[_type == "newsletterVersion" && newsletterId == $id]._id`,
    { id },
    { cache: "no-store" }
  );
  await mutate([{ delete: { id } }, ...versionIds.map(vid => ({ delete: { id: vid } }))]);
  return NextResponse.json({ ok: true });
}
