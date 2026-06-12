import { NextResponse } from "next/server";
import { client } from "@/lib/sanity";

export const dynamic = "force-dynamic";

const ID = "choopy-feeds";

export async function GET() {
  try {
    const doc = await client.fetch(`*[_id == $id][0]{ count }`, { id: ID }, { cache: "no-store" });
    return NextResponse.json({ count: doc?.count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

export async function POST() {
  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) return NextResponse.json({ error: "no token" }, { status: 500 });

  await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mutations: [
          { createIfNotExists: { _id: ID, _type: "choopy", count: 0 } },
          { patch: { id: ID, inc: { count: 1 } } },
        ],
      }),
    }
  );

  const doc = await client.fetch(`*[_id == $id][0]{ count }`, { id: ID }, { cache: "no-store" });
  return NextResponse.json({ count: doc?.count ?? 0 });
}
