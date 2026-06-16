import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";

const DRAFT_ID = "newsletter-draft";

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

export async function GET() {
  const draft = await client.fetch(
    `*[_id == $id][0]`,
    { id: DRAFT_ID },
    { cache: "no-store" }
  );
  const rawVersions: ({ _id: string } & Record<string, unknown>)[] = await client.fetch(
    `*[_type == "newsletterVersion"] | order(createdAt desc)[0...20]{ _id, createdAt, subject, preview, author, wordCount, cards }`,
    {},
    { cache: "no-store" }
  );
  const versions = (rawVersions ?? []).map(({ _id, ...rest }) => ({ id: _id, ...rest }));
  return NextResponse.json({ draft: draft ?? null, versions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date().toISOString();

  // Upsert draft
  const draftDoc = { _id: DRAFT_ID, _type: "newsletter", ...body, updatedAt: now };
  await mutate([{ createOrReplace: draftDoc }]);

  // Check last version to dedupe
  const latest = await client.fetch(
    `*[_type == "newsletterVersion"] | order(createdAt desc)[0]{ subject, preview, author, wordCount, cards }`,
    {},
    { cache: "no-store" }
  );

  const sameAsLast = latest &&
    JSON.stringify({ subject: latest.subject, preview: latest.preview, author: latest.author, wordCount: latest.wordCount, cards: latest.cards }) ===
    JSON.stringify({ subject: body.subject, preview: body.preview, author: body.author, wordCount: body.wordCount, cards: body.cards });

  if (!sameAsLast) {
    const versionId = `nl-version-${Date.now()}`;
    const versionDoc = { _id: versionId, _type: "newsletterVersion", createdAt: now, ...body };

    // Prune versions beyond 20
    const stale: string[] = await client.fetch(
      `*[_type == "newsletterVersion"] | order(createdAt desc)[19...100]._id`,
      {},
      { cache: "no-store" }
    );

    await mutate([
      { createOrReplace: versionDoc },
      ...stale.map(id => ({ delete: { id } })),
    ]);
  }

  const rawVersions2: ({ _id: string } & Record<string, unknown>)[] = await client.fetch(
    `*[_type == "newsletterVersion"] | order(createdAt desc)[0...20]{ _id, createdAt, subject, preview, author, wordCount, cards }`,
    {},
    { cache: "no-store" }
  );
  const versions = (rawVersions2 ?? []).map(({ _id, ...rest }) => ({ id: _id, ...rest }));

  return NextResponse.json({ ok: true, versions }, { status: 200 });
}
