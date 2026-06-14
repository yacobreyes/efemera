import { NextRequest, NextResponse } from "next/server";
import { client } from "@/lib/sanity";
import { rateLimit } from "@/lib/rateLimit";

export async function GET() {
  try {
    const scores = await client.fetch(
      `*[_type == "leaderboard"] | order(score desc) [0..9] { _id, name, score }`,
      {},
      { cache: "no-store" }
    );
    return NextResponse.json({ scores: scores ?? [] });
  } catch {
    return NextResponse.json({ scores: [] });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip, "leaderboard", 5, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json() as { name: string; score: number };
  const name = String(body.name ?? "").trim().slice(0, 20);
  const score = Number(body.score);

  if (!name || !Number.isInteger(score) || score < 1 || score > 9999) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const token = process.env.SANITY_API_WRITE_TOKEN ?? process.env.SANITY_WRITE_TOKEN;
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
  if (!token || !projectId) return NextResponse.json({ error: "no token" }, { status: 500 });

  // Create a unique doc per submission
  const id = `leaderboard-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const res = await fetch(
    `https://${projectId}.api.sanity.io/v2024-01-01/data/mutate/${dataset}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        mutations: [{ create: { _id: id, _type: "leaderboard", name, score } }],
      }),
    }
  );

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 500 });

  // Return updated top 10
  const scores = await client.fetch(
    `*[_type == "leaderboard"] | order(score desc) [0..9] { _id, name, score }`,
    {},
    { cache: "no-store" }
  );
  return NextResponse.json({ scores: scores ?? [] });
}
