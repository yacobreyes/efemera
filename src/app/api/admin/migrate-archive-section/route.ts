import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";
import { sanityConfig } from "@/lib/sanityWrite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// One-time migration: rename section "Gangrey Redux" → "Archive" on all posts.
export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
  const { token, projectId, dataset } = sanityConfig();
  const base = `https://${projectId}.api.sanity.io/v2024-01-01/data`;

  const q = encodeURIComponent(`*[_type=="post" && section=="Gangrey Redux"]{_id}`);
  const res = await fetch(`${base}/query/${dataset}?query=${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: 502 });
  const { result } = await res.json() as { result: { _id: string }[] };
  if (!result?.length) return NextResponse.json({ updated: 0, message: "No posts with Gangrey Redux found" });

  let updated = 0;
  for (let i = 0; i < result.length; i += 100) {
    const batch = result.slice(i, i + 100).map(({ _id }) => ({
      patch: { id: _id, set: { section: "Archive" } },
    }));
    const r = await fetch(`${base}/mutate/${dataset}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mutations: batch }),
    });
    if (!r.ok) return NextResponse.json({ error: await r.text(), updated }, { status: 502 });
    updated += batch.length;
  }

  return NextResponse.json({ updated, message: `Renamed ${updated} posts from "Gangrey Redux" to "Archive"` });
}
