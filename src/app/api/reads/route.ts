import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";

function readId(slug: string) {
  return `reads-${slug.replace(/[^a-zA-Z0-9-_]/g, "-")}`;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ count: 0 });
  try {
    const doc = await client.fetch(`*[_id == $id][0]{ count }`, { id: readId(slug) }, { cache: "no-store" });
    return NextResponse.json({ count: doc?.count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const { slug } = await req.json() as { slug: string };
  if (!slug) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) return NextResponse.json({ error: "no token" }, { status: 500 });

  const id = readId(slug);
  await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mutations: [
          { createIfNotExists: { _id: id, _type: "reads", slug, count: 0 } },
          { patch: { id, inc: { count: 1 } } },
        ],
      }),
    }
  );

  const doc = await client.fetch(`*[_id == $id][0]{ count }`, { id }, { cache: "no-store" });
  return NextResponse.json({ count: doc?.count ?? 0 });
}
