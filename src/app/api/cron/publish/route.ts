import { NextResponse } from "next/server";

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

  if (!result?.length) {
    return NextResponse.json({ published: 0 });
  }

  const mutations = result.map((doc: { _id: string }) => ({
    patch: { id: doc._id, set: { status: "published" } },
  }));

  await sanityMutate(mutations);
  return NextResponse.json({ published: result.length });
}
