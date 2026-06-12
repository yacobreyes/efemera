import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";

function likeId(slug: string) {
  return `likes-${slug.replace(/[^a-zA-Z0-9-_]/g, "-")}`;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ count: 0 });
  try {
    const doc = await client.fetch(
      `*[_id == $id][0]{ count }`,
      { id: likeId(slug) },
      { cache: "no-store" }
    );
    return NextResponse.json({ count: doc?.count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const { slug, delta } = await req.json() as { slug: string; delta: 1 | -1 };
  if (!slug || (delta !== 1 && delta !== -1)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) return NextResponse.json({ error: "no token" }, { status: 500 });

  const id = likeId(slug);

  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mutations: [
          { createIfNotExists: { _id: id, _type: "likes", slug, count: 0 } },
          { patch: { id, inc: { count: delta } } },
        ],
      }),
    }
  );

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });

  const doc = await client.fetch(`*[_id == $id][0]{ count }`, { id }, { cache: "no-store" });
  return NextResponse.json({ count: doc?.count ?? 0 });
}
